/**
 * Founding-host programme.
 *
 * The first FOUNDING_HOST_LIMIT approved hosts pay FOUNDING_HOST_COMMISSION_RATE
 * instead of HOST_COMMISSION_RATE, for as long as they host. A limit of 0 (the
 * default) switches the programme off entirely.
 *
 * Every decision the money depends on lives in a pure helper below, so the
 * rules can be unit tested without a database (tests/founding-host.test.ts).
 * The exported async functions only read env, read/write Prisma, and delegate
 * the decisions to those helpers.
 */
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';

/**
 * A commission rate is a fraction of the accommodation subtotal. Anything
 * outside 0..1 would charge a host more than the stay is worth or pay them to
 * host, so it is treated as unusable configuration rather than a number.
 */
function isUsableRate(rate: number): boolean {
  return Number.isFinite(rate) && rate >= 0 && rate <= 1;
}

/** Read a configured rate, or null when the value cannot be charged safely. */
export function parseCommissionRate(raw: string | number | undefined): number | null {
  const rate = Number(raw);
  return isUsableRate(rate) ? rate : null;
}

/**
 * How many founding places the programme offers. A missing, zero, negative or
 * nonsense value means no places at all: the programme is opt-in, so a broken
 * setting must never hand out an unbounded number of discounted hosts.
 */
export function parseFoundingHostLimit(raw: string | number | undefined): number {
  const limit = Number(raw);
  if (!Number.isFinite(limit) || limit < 1) return 0;
  return Math.floor(limit);
}

/**
 * Is a founding place still free? `taken` is the number of hosts already
 * enrolled, `limit` the size of the programme. The programme being off (limit 0)
 * and a programme shrunk below the number already enrolled both refuse, so a
 * lowered limit can never enrol another host.
 */
export function planFoundingEnrolment(taken: number, limit: number): boolean {
  if (!Number.isFinite(limit) || limit < 1) return false;
  // A count that is not a real number tells us nothing about free places; treat
  // it as "nobody enrolled yet" rather than silently blocking every approval.
  const alreadyTaken = Number.isFinite(taken) && taken > 0 ? Math.floor(taken) : 0;
  return alreadyTaken < limit;
}

/**
 * The commission rate one host pays.
 *
 * A founding host is charged the founding rate; everyone else the global rate.
 * An unusable founding rate falls back to the global rate rather than paying a
 * host a multiplied or negative amount. A founding rate ABOVE the global rate is
 * honoured, not clamped: both values are configuration, so a deliberately higher
 * rate (for instance while a programme is being wound down) must not be silently
 * rewritten by code.
 */
export function pickCommissionRate(
  foundingHost: boolean,
  globalRate: number,
  foundingRate: number,
): number {
  const global = parseCommissionRate(globalRate) ?? 0;
  if (!foundingHost) return global;
  return parseCommissionRate(foundingRate) ?? global;
}

/** How many hosts have been enrolled in the programme. Display and booking only. */
export async function foundingPlacesTaken(): Promise<number> {
  return prisma.hostApplication.count({ where: { foundingHost: true } });
}

/**
 * Claim a founding place for an application, inside the caller's approval
 * transaction.
 *
 * Both the count and the update run on the passed `tx`, so the place is claimed
 * within the same transaction that approves the host. Counting on a separate
 * connection could not see an approval still in flight, and two admins approving
 * at the same moment would both find a free place and oversubscribe the
 * programme. Returns true only when this call actually enrolled the host.
 */
export async function enrolFoundingHost(
  tx: Prisma.TransactionClient,
  applicationId: string,
): Promise<boolean> {
  const limit = parseFoundingHostLimit(env.FOUNDING_HOST_LIMIT);
  if (limit < 1) return false;

  const taken = await tx.hostApplication.count({ where: { foundingHost: true } });
  if (!planFoundingEnrolment(taken, limit)) return false;

  await tx.hostApplication.update({
    where: { id: applicationId },
    data: { foundingHost: true },
  });
  return true;
}

/**
 * The commission rate this specific host pays for accommodation.
 *
 * Never throws: it is called while confirming a payment that has already
 * succeeded, and losing that confirmation because a rate lookup failed would
 * strand a paid booking. A host with no application (approved before
 * applications existed) simply pays the global rate.
 */
export async function resolveHostCommissionRate(hostId: string): Promise<number> {
  const globalRate = parseCommissionRate(env.HOST_COMMISSION_RATE) ?? 0;

  try {
    const application = await prisma.hostApplication.findUnique({
      where: { userId: hostId },
      select: { foundingHost: true },
    });
    return pickCommissionRate(
      Boolean(application?.foundingHost),
      globalRate,
      Number(env.FOUNDING_HOST_COMMISSION_RATE),
    );
  } catch (error) {
    // Fails open to the global rate and leaves a trail: charging the standard
    // rate is recoverable (it can be refunded), a lost payment confirmation is not.
    console.error(
      `FOUNDING-HOST rate lookup failed for host ${hostId}; using the global rate`,
      error,
    );
    return globalRate;
  }
}

/** Programme size, places used and places left. Display only. */
export async function foundingHostAvailability(): Promise<{
  limit: number;
  taken: number;
  placesLeft: number;
}> {
  const limit = parseFoundingHostLimit(env.FOUNDING_HOST_LIMIT);
  const taken = await foundingPlacesTaken();
  return { limit, taken, placesLeft: Math.max(0, limit - taken) };
}
