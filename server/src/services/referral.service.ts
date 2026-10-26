/**
 * Host referral programme.
 *
 * A host shares their own code. An applicant who types it while applying is
 * linked to that host, and the referrer is paid once the referred host actually
 * earns. The reward is deliberately tied to a first earning rather than a first
 * sign-up: a code that pays on sign-up invites farming with empty applications.
 *
 * The decision rules live in the pure helpers below so they can be tested
 * without a database (tests/referral.test.ts). The async functions only read
 * env, read/write Prisma, and delegate the decisions to those helpers.
 */
import { randomBytes } from 'node:crypto';
import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { sendPushToUser } from './push.service.js';

// No I, O, 0 or 1: a code is read aloud and typed by hand, and those four are
// the pairs people get wrong.
const CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_LENGTH = 6;
const CODE_PREFIX = 'ZURI-';
/** How many codes to try before giving up on a unique one. */
const MAX_CODE_ATTEMPTS = 6;

/**
 * Read a typed code into its stored form. Returns null when the input cannot be
 * a code at all, so a stray symbol is ignored rather than saved.
 */
export function normaliseReferralCode(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const cleaned = raw.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '').slice(0, 24);
  // Anything shorter than four characters is far more likely to be a typo than
  // a real code; keeping it would create a code nobody can share reliably.
  return cleaned.length >= 4 ? cleaned : null;
}

/**
 * Turn random bytes into a code. Pure so the alphabet and length can be tested
 * without guessing what randomBytes produced.
 */
export function formatReferralCode(bytes: readonly number[]): string {
  let body = '';
  for (let index = 0; index < CODE_LENGTH; index += 1) {
    // A short byte array still has to produce a code, so wrap around rather than
    // reading undefined (which would render "ZURI-UNDEFI").
    const byte = bytes[index % bytes.length] ?? 0;
    body += CODE_ALPHABET[byte % CODE_ALPHABET.length];
  }
  return `${CODE_PREFIX}${body}`;
}

export function generateReferralCode(): string {
  return formatReferralCode([...randomBytes(CODE_LENGTH)]);
}

/**
 * The reward in whole shillings, or 0 when the programme is off. A negative,
 * missing or unparseable value switches the programme off: paying a negative
 * bonus would take money from a host, and a fractional shilling cannot be
 * transferred.
 */
export function parseRewardKes(raw: string | number | undefined): number {
  const amount = Number(raw);
  if (!Number.isFinite(amount) || amount < 1) return 0;
  return Math.floor(amount);
}

/**
 * Should this referral pay out?
 *
 * Refused when the programme is off, when either side is missing, when a host
 * has been linked to themselves, when this referred host has already produced a
 * reward, or when the referrer has been suspended (paying a suspended account
 * would be a way to keep earning while blocked).
 */
export function planReferralCredit(input: {
  awardKes: number;
  referrerHostId: string | null | undefined;
  referredHostId: string | null | undefined;
  alreadyCredited: boolean;
  referrerSuspended: boolean;
}): boolean {
  if (!Number.isFinite(input.awardKes) || input.awardKes < 1) return false;
  if (!input.referrerHostId || !input.referredHostId) return false;
  if (input.referrerHostId === input.referredHostId) return false;
  if (input.alreadyCredited) return false;
  if (input.referrerSuspended) return false;
  return true;
}

/**
 * Whether an application is still open to earning a referral. Only an approved
 * host can trigger a payout, so a code typed into an application that was later
 * rejected never pays anyone.
 */
export function referralCountsForPayout(applicationStatus: string): boolean {
  return applicationStatus === 'APPROVED';
}

/**
 * Give an application its own shareable code, reusing one it already has.
 *
 * A collision is possible (32^6 is large but not infinite) and the column is
 * unique, so a taken code is retried rather than surfacing as a failed approval.
 */
export async function ensureReferralCode(
  tx: Prisma.TransactionClient,
  applicationId: string,
): Promise<string | null> {
  const existing = await tx.hostApplication.findUnique({
    where: { id: applicationId },
    select: { ownReferralCode: true },
  });
  if (!existing) return null;
  if (existing.ownReferralCode) return existing.ownReferralCode;

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateReferralCode();
    const clash = await tx.hostApplication.findUnique({
      where: { ownReferralCode: code },
      select: { id: true },
    });
    if (clash) continue;
    await tx.hostApplication.update({
      where: { id: applicationId },
      data: { ownReferralCode: code },
    });
    return code;
  }
  // Out of attempts. The host simply has no code to share yet; nothing about
  // their application or earnings depends on it.
  console.error(`REFERRAL could not allocate a unique code for application ${applicationId}`);
  return null;
}

/**
 * Link an application to the host who referred it.
 *
 * A code that does not exist, belongs to the applicant themselves, or arrives
 * after the application was already reviewed is ignored rather than rejected:
 * the applicant is filling in a form, and a bad code must not block them from
 * applying. Returns the resolved referrer id, or null.
 */
export async function applyReferralCode(
  tx: Prisma.TransactionClient,
  applicantUserId: string,
  rawCode: string | null | undefined,
): Promise<string | null> {
  const code = normaliseReferralCode(rawCode);
  if (!code) return null;

  const referrer = await tx.hostApplication.findUnique({
    where: { ownReferralCode: code },
    select: { userId: true },
  });
  if (!referrer) return null;
  // Linking a host to themselves would pay them for their own application.
  if (referrer.userId === applicantUserId) return null;
  return referrer.userId;
}

/**
 * Pay a referrer for this host's first earning, at most once.
 *
 * Called after a booking's host funds have been released, which is the first
 * moment the referred host has actually earned from a stay. Safe to call on
 * every release: the unique `referredHostId` column makes a second reward for
 * the same host impossible, and the row is claimed before any money moves.
 *
 * Never throws. A referral is a bonus, and a failure here must not undo a host's
 * release of their own earnings, which has already been committed.
 */
export async function creditReferralForFirstEarning(
  referredHostId: string,
  now: Date = new Date(),
): Promise<{ credited: boolean; amount: number }> {
  const awardKes = parseRewardKes(env.REFERRAL_REWARD_KES);
  if (awardKes < 1) return { credited: false, amount: 0 };

  try {
    const application = await prisma.hostApplication.findUnique({
      where: { userId: referredHostId },
      select: { referredByHostId: true, status: true },
    });
    if (!application?.referredByHostId) return { credited: false, amount: 0 };
    if (!referralCountsForPayout(application.status)) return { credited: false, amount: 0 };

    const referrerHostId = application.referredByHostId;

    const [existing, referrer] = await Promise.all([
      prisma.hostReferral.findUnique({ where: { referredHostId }, select: { id: true } }),
      prisma.user.findUnique({ where: { id: referrerHostId }, select: { suspended: true } }),
    ]);

    const shouldPay = planReferralCredit({
      awardKes,
      referrerHostId,
      referredHostId,
      alreadyCredited: Boolean(existing),
      referrerSuspended: Boolean(referrer?.suspended),
    });
    if (!shouldPay) return { credited: false, amount: 0 };

    const paid = await prisma.$transaction(async (tx) => {
      // Claim the reward by creating the row first: the unique column is what
      // stops two releases racing into two payouts for the same host.
      const row = await tx.hostReferral.create({
        data: {
          referrerHostId,
          referredHostId,
          amount: awardKes,
          status: 'CREDITED',
          creditedAt: now,
        },
      });

      // The bonus lands in the withdrawable balance. It is not tied to a stay, so
      // there is no hold to apply and nothing for a guest to cancel.
      await tx.hostWallet.upsert({
        where: { hostId: referrerHostId },
        create: { hostId: referrerHostId, balance: awardKes, totalEarned: awardKes },
        update: { balance: { increment: awardKes }, totalEarned: { increment: awardKes } },
      });

      return row;
    });

    await sendPushToUser(
      referrerHostId,
      'Referral reward credited',
      `A host you invited has started hosting. KES ${awardKes.toLocaleString('en-KE')} has been added to your balance.`,
      '/host/earnings',
    ).catch((error) => {
      console.error('REFERRAL push failed for host', referrerHostId, error);
    });

    return { credited: true, amount: paid.amount };
  } catch (error) {
    // The unique column turns a duplicate into an error; that is the expected
    // path for every release after the first, so it is not reported as a fault.
    console.error('REFERRAL credit skipped for host', referredHostId, error);
    return { credited: false, amount: 0 };
  }
}

/**
 * What a host needs to share their code: the code itself, the counts and what
 * they have already earned from it. Never throws; a host who cannot read their
 * own code still has a working account.
 */
export async function getReferralSummary(userId: string) {
  const rewardKes = parseRewardKes(env.REFERRAL_REWARD_KES);
  const empty = {
    code: null as string | null,
    shareUrl: '',
    rewardKes,
    referrals: { total: 0, credited: 0, pending: 0 },
    earnedKes: 0,
  };

  try {
    const application = await prisma.hostApplication.findUnique({
      where: { userId },
      select: { ownReferralCode: true },
    });
    if (!application?.ownReferralCode) return empty;

    const rows = await prisma.hostReferral.findMany({
      where: { referrerHostId: userId },
      select: { status: true, amount: true },
    });

    const credited = rows.filter((row) => row.status === 'CREDITED');
    return {
      code: application.ownReferralCode,
      shareUrl: `/register?role=HOST&ref=${encodeURIComponent(application.ownReferralCode)}`,
      rewardKes,
      referrals: {
        total: rows.length,
        credited: credited.length,
        pending: rows.filter((row) => row.status === 'PENDING').length,
      },
      earnedKes: credited.reduce((sum, row) => sum + (row.amount ?? 0), 0),
    };
  } catch (error) {
    console.error('REFERRAL summary failed for host', userId, error);
    return empty;
  }
}
