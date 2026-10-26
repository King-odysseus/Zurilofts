/**
 * Sign-up nudges.
 *
 * A host who starts an application and stops is the most common place to lose
 * one. This sweep finds applications that have sat untouched for a few days and
 * sends a single plain reminder, at most HOST_NUDGE_MAX times, so a host who has
 * clearly moved on is not pestered.
 *
 * Nudges go out as push notifications. The server has no email provider, so a
 * host who never enabled push is not reached this way; that limit is real and is
 * why this is a gentle reminder rather than the only way to contact a host.
 *
 * The decision lives in a pure helper so the timing rules can be tested without
 * a database (tests/nudge.test.ts).
 */
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { sendPushToUser } from './push.service.js';
import { EDITABLE_STATUSES } from './host-application.service.js';

const DAY_MS = 24 * 60 * 60 * 1000;

/** Statuses worth reminding about: the applicant can still act on them. */
export function nudgeableStatuses(): string[] {
  return [...EDITABLE_STATUSES];
}

/**
 * How many reminders are allowed. Zero, negative or nonsense switches the sweep
 * off, matching the other opt-in programmes here.
 */
export function parseNudgeMax(raw: string | number | undefined): number {
  const max = Number(raw);
  if (!Number.isFinite(max) || max < 1) return 0;
  return Math.floor(max);
}

/**
 * How many idle days before a reminder. A missing or nonsense value falls back
 * to 0, which makes every candidate eligible; that is only reachable through
 * misconfiguration, and the cap on the number of reminders still holds.
 */
export function parseNudgeAfterDays(raw: string | number | undefined): number {
  const days = Number(raw);
  if (!Number.isFinite(days) || days < 0) return 0;
  return days;
}

/**
 * Should this application get a reminder now?
 *
 * The rules, in order: the applicant can still act on it, reminders are enabled,
 * the cap is not reached, the application has been idle long enough, and the
 * last reminder was not sent so recently that this would be a repeat. Both the
 * idle test and the repeat test use the same window, so the gap between nudges
 * is never shorter than the idle period itself.
 */
export function shouldNudge(input: {
  status: string;
  nudgeCount: number;
  lastActivityAt: Date;
  lastNudgeAt: Date | null;
  now: Date;
  afterDays: number;
  maxNudges: number;
  nudgeableStatuses: readonly string[];
}): boolean {
  if (input.maxNudges < 1) return false;
  if (!input.nudgeableStatuses.includes(input.status)) return false;
  if (!Number.isFinite(input.nudgeCount) || input.nudgeCount >= input.maxNudges) return false;

  const windowMs = Math.max(0, input.afterDays) * DAY_MS;
  const idleSince = new Date(input.now.getTime() - windowMs);
  if (input.lastActivityAt > idleSince) return false;
  if (input.lastNudgeAt && input.lastNudgeAt > idleSince) return false;
  return true;
}

/** The reminder body, kept in one place so the sweep and its tests agree. */
export function nudgeMessage(status: string): { title: string; body: string; url: string } {
  if (status === 'CHANGES_REQUESTED') {
    return {
      title: 'Your hosting application needs a change',
      body: 'We asked for one change before we can review your application. It only takes a minute to update.',
      url: '/host/application',
    };
  }
  return {
    title: 'Finish setting up your hosting account',
    body: 'Your application is saved. Add the remaining details when you have a moment and we will review it.',
    url: '/host/application',
  };
}

/**
 * Find idle applications and remind their owners.
 *
 * Returns the number of reminders sent. Each send is claimed by incrementing
 * `nudgeCount` on the row it read, so two servers running the sweep at once
 * cannot both remind the same host: only one update matches the count it saw.
 */
export async function sendHostApplicationNudges(
  now: Date = new Date(),
): Promise<{ sent: number; candidates: number }> {
  const maxNudges = parseNudgeMax(env.HOST_NUDGE_MAX);
  if (maxNudges < 1) return { sent: 0, candidates: 0 };

  const afterDays = parseNudgeAfterDays(env.HOST_NUDGE_AFTER_DAYS);
  const statuses = nudgeableStatuses();

  const candidates = await prisma.hostApplication.findMany({
    where: {
      status: { in: statuses },
      nudgeCount: { lt: maxNudges },
    },
    select: {
      id: true,
      userId: true,
      status: true,
      nudgeCount: true,
      lastNudgeAt: true,
      updatedAt: true,
    },
  });

  let sent = 0;
  for (const application of candidates) {
    const due = shouldNudge({
      status: application.status,
      nudgeCount: application.nudgeCount,
      lastActivityAt: application.updatedAt,
      lastNudgeAt: application.lastNudgeAt,
      now,
      afterDays,
      maxNudges,
      nudgeableStatuses: statuses,
    });
    if (!due) continue;

    const { title, body, url } = nudgeMessage(application.status);

    try {
      // Claim the reminder before sending. updateMany with the count predicate is
      // what makes a concurrent sweep a no-op instead of a second notification.
      const claim = await prisma.hostApplication.updateMany({
        where: {
          id: application.id,
          nudgeCount: application.nudgeCount,
          status: application.status,
        },
        data: { nudgeCount: { increment: 1 }, lastNudgeAt: now },
      });
      if (claim.count === 0) continue;

      await sendPushToUser(application.userId, title, body, url);
      sent += 1;
    } catch (error) {
      // One host failing must not stop the rest of the sweep. The count was
      // already incremented, so this application is not retried immediately;
      // the cap still applies and the next sweep picks up fresh candidates.
      console.error(`NUDGE failed for application ${application.id}`, error);
    }
  }

  return { sent, candidates: candidates.length };
}
