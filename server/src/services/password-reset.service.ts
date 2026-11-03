import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { publicClientUrl } from '../utils/publicUrl.js';
import { activeMailTransport, sendMail } from '../utils/mailer.js';
import { PASSWORD_MAX_BYTES, PASSWORD_RESET_TOKEN_PATTERN, ValidationError, passwordByteLength, passwordPolicy } from '../types/index.js';

/**
 * Self-service password recovery.
 *
 * The rules that shape this file, in order of how easy they are to get wrong:
 *
 * 1. The request endpoint must not be an account oracle. Every syntactically
 *    valid address gets the same 202 and the same body, whether the account is
 *    unknown, Google-only, suspended, erased or an administrator.
 * 2. The link carries the only secret. 32 random bytes, and the database keeps
 *    just the sha256 of it, so a leaked table is not a set of working links.
 *    The row also records which mailbox it was sent to and which
 *    credentialVersion was current, so a completed reset (or any other password
 *    change) makes every older link dead.
 * 3. Completing is one transaction with a conditional claim, so two concurrent
 *    completions of the same link cannot both change the password.
 * 4. Requesting a link never changes credentials and never revokes sessions -
 *    anyone can type anyone's address into a form.
 */

/** A link is usable for 30 minutes from issue. */
export const RESET_TOKEN_TTL_MS = 30 * 60 * 1000;

/** Outstanding (unconsumed, unexpired) links a single account may hold. */
export const MAX_OUTSTANDING_RESETS = 3;

// Same cost as auth.service: a reset is a login password change, not a shortcut.
const SALT_ROUNDS = 12;

/**
 * The one answer the request endpoint ever gives. Exported so a test can prove
 * a real address and an unknown one are literally the same bytes.
 */
export const GENERIC_RESET_REQUEST_MESSAGE =
  'If that email address belongs to an account, a reset link is on its way. The link expires in 30 minutes.';

/**
 * The one answer for anything wrong with a token: unknown, expired, already
 * used, wrong account, or stale. Distinguishing them would tell an attacker
 * whether a guessed token ever existed.
 */
export const GENERIC_RESET_FAILURE_MESSAGE = 'This reset link is invalid or has expired.';

export const RESET_SUCCESS_MESSAGE = 'Your password has been changed. Sign in with your new password.';

// ---------------------------------------------------------------------------
// Pure helpers (no database, so tests can hold them to their contract)
// ---------------------------------------------------------------------------

/** The stored form of a token. The raw value never reaches the database. */
export function hashResetToken(token: string): string {
  return crypto.createHash('sha256').update(token, 'utf8').digest('hex');
}

/** 32 bytes in base64url is 43 characters with no padding. */
export function isWellFormedResetToken(token: string): boolean {
  return PASSWORD_RESET_TOKEN_PATTERN.test(token);
}

/** A fresh token: 32 cryptographically random bytes, url-safe. */
export function createResetToken(): string {
  return crypto.randomBytes(32).toString('base64url');
}

export type ResetTokenState = 'usable' | 'expired' | 'consumed' | 'stale_version';

/**
 * Whether a stored token row may still be redeemed. Deliberately separate from
 * the account checks (suspension, erasure, address binding) so each rule is
 * testable on its own.
 */
export function passwordResetDecision(
  record: { expiresAt: Date; consumedAt: Date | null; credentialVersion: number },
  context: { now: Date; credentialVersion: number }
): ResetTokenState {
  if (record.consumedAt) return 'consumed';
  if (record.expiresAt.getTime() <= context.now.getTime()) return 'expired';
  if (record.credentialVersion !== context.credentialVersion) return 'stale_version';
  return 'usable';
}

interface PersistedResetToken {
  id: string;
  createdAt: Date;
  expiresAt: Date;
  consumedAt: Date | null;
}

/**
 * Which live links must be retired so that issuing one more keeps the account
 * at or under the cap: the oldest first, so the newest requests stay usable.
 * Requesting a link therefore never invalidates the most recent ones, and the
 * cap cannot be used to lock an account out of recovery.
 */
export function tokensToRetire(
  existing: PersistedResetToken[],
  now: Date,
  max = MAX_OUTSTANDING_RESETS
): string[] {
  const live = existing
    .filter((token) => !token.consumedAt && token.expiresAt.getTime() > now.getTime())
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  // After this request there will be `live.length + 1` links; retire the tail.
  return live.slice(Math.max(max - 1, 0)).map((token) => token.id);
}

/** The reset link a member clicks. Built from configuration, never from a request. */
export function buildResetUrl(token: string): string {
  return `${publicClientUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

// ---------------------------------------------------------------------------
// Issue
// ---------------------------------------------------------------------------

/**
 * A connection or transaction that can mark reset tokens as used. Narrow on
 * purpose: the callers pass either the Prisma client or a transaction client,
 * and this is the only operation either one needs here.
 */
export interface ResetTokenStore {
  passwordResetToken: {
    updateMany: (args: {
      where: { userId: string; consumedAt: null };
      data: { consumedAt: Date };
    }) => Promise<{ count: number }>;
  };
}

/**
 * Mark every outstanding link for an account as used, so a link mailed before a
 * password change can never be replayed. The two callers that replace a password
 * inside an array-form `$transaction` (user.service, admin-bootstrap) issue this
 * same update inline, because an array transaction cannot await a helper.
 */
export async function retireResetTokens(client: ResetTokenStore, userId: string, now = new Date()): Promise<number> {
  const result = await client.passwordResetToken.updateMany({
    where: { userId, consumedAt: null },
    data: { consumedAt: now },
  });
  return result.count;
}

interface ResetTarget {
  id: string;
  email: string;
  passwordHash: string | null;
  suspended: boolean;
  deletedAt: Date | null;
  credentialVersion: number;
}

/**
 * Account states that must never receive a usable link. Each returns the same
 * generic answer to the caller; the reason is only used to decide whether to
 * spend a token.
 */
function canReceiveResetLink(user: ResetTarget | null): user is ResetTarget {
  // No passwordHash: the account signs in with Google only, so there is no
  // password to reset and a link would be a way to invent one.
  return Boolean(user && user.passwordHash && !user.suspended && !user.deletedAt);
}

async function deliverResetLink(user: ResetTarget, token: string): Promise<void> {
  const link = buildResetUrl(token);
  // The response is identical either way, so a delivery failure must be loud in
  // the log and invisible to the caller.
  try {
    const transport = await sendMail({
      to: user.email,
      subject: 'Reset your ZuriLofts password',
      text: [
        `Someone asked to reset the password for the ZuriLofts account ${user.email}.`,
        '',
        'Open this link to choose a new password:',
        link,
        '',
        'The link works once and expires in 30 minutes.',
        'If this was not you, no action is needed: your password has not changed.',
      ].join('\n'),
    });
    if (transport === 'console') {
      // Development only (see utils/mailer.ts): the log is the mailbox. The link
      // is repeated under a greppable prefix so it is easy to find in a busy log.
      console.info(`[password-reset] development link for ${user.email}: ${link}`);
    }
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    // Identified by account id, not address: this line can end up in a log sink.
    console.error(
      `[password-reset] could not deliver a reset link for user ${user.id} (transport: ${activeMailTransport()}): ${reason}`
    );
  }
}

/**
 * Issue a reset link if the address belongs to an account that can use one.
 * Always resolves with the generic message: callers must not be able to tell
 * the cases apart, and a mail failure must not turn into a different response.
 */
export async function requestPasswordReset(rawEmail: string): Promise<{ message: string }> {
  const email = rawEmail.trim().toLowerCase();
  const now = new Date();

  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      passwordHash: true,
      suspended: true,
      deletedAt: true,
      credentialVersion: true,
    },
  });

  if (!canReceiveResetLink(user)) {
    return { message: GENERIC_RESET_REQUEST_MESSAGE };
  }

  const token = createResetToken();

  await prisma.$transaction(async (tx) => {
    // Expired rows for this account are dead weight; prune them on the way past.
    await tx.passwordResetToken.deleteMany({ where: { userId: user.id, expiresAt: { lte: now } } });

    const outstanding = await tx.passwordResetToken.findMany({
      where: { userId: user.id, consumedAt: null, expiresAt: { gt: now } },
      select: { id: true, createdAt: true, expiresAt: true, consumedAt: true },
    });
    const retire = tokensToRetire(outstanding, now);
    if (retire.length > 0) {
      await tx.passwordResetToken.updateMany({
        where: { id: { in: retire } },
        data: { consumedAt: now },
      });
    }

    await tx.passwordResetToken.create({
      data: {
        userId: user.id,
        tokenHash: hashResetToken(token),
        address: user.email.trim().toLowerCase(),
        credentialVersion: user.credentialVersion,
        expiresAt: new Date(now.getTime() + RESET_TOKEN_TTL_MS),
      },
    });
  });

  await deliverResetLink(user, token);
  return { message: GENERIC_RESET_REQUEST_MESSAGE };
}

// ---------------------------------------------------------------------------
// Complete
// ---------------------------------------------------------------------------

/**
 * The route validates the body, but this function is the security boundary: a
 * caller that skips the schema must still never hand bcrypt a weak password, and
 * never one longer than its 72 byte window (the rest would be ignored, so a
 * different suffix would unlock the same account).
 */
function assertPasswordAllowed(newPassword: string): void {
  if (!passwordPolicy.safeParse(newPassword).success) {
    throw new ValidationError('Password does not meet the requirements');
  }
  if (passwordByteLength(newPassword) > PASSWORD_MAX_BYTES) {
    throw new ValidationError(`Password must be ${PASSWORD_MAX_BYTES} bytes or fewer`);
  }
}

/**
 * Redeem a reset token and set a new password.
 *
 * Everything that must hold together happens in one transaction: the token is
 * claimed with a conditional update (so exactly one of two concurrent requests
 * wins), the hash is written, credentialVersion is incremented (which ends every
 * access token already in the wild) and every session is revoked. Any failure
 * throws the same generic error and rolls the whole thing back.
 */
export async function completePasswordReset(token: string, newPassword: string): Promise<{ message: string }> {
  // Shape first: a token that cannot exist is rejected before any hashing work.
  if (!isWellFormedResetToken(token)) {
    throw new ValidationError(GENERIC_RESET_FAILURE_MESSAGE);
  }
  assertPasswordAllowed(newPassword);

  const now = new Date();
  const tokenHash = hashResetToken(token);
  // bcrypt is deliberately slow, so it runs outside the transaction; the token
  // is not claimed until the hash is ready.
  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  await prisma.$transaction(async (tx) => {
    const record = await tx.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        address: true,
        credentialVersion: true,
        expiresAt: true,
        consumedAt: true,
      },
    });
    if (!record) throw new ValidationError(GENERIC_RESET_FAILURE_MESSAGE);

    const user = await tx.user.findUnique({
      where: { id: record.userId },
      select: {
        id: true,
        email: true,
        passwordHash: true,
        suspended: true,
        deletedAt: true,
        credentialVersion: true,
      },
    });
    // Re-checked here, not only at issue time: the account may have been
    // suspended or erased during the link's 30 minute life.
    if (!user || !user.passwordHash || user.suspended || user.deletedAt) {
      throw new ValidationError(GENERIC_RESET_FAILURE_MESSAGE);
    }
    // The link was sent to a specific mailbox. If the account's address has
    // changed since, that mailbox no longer proves anything.
    if (user.email.trim().toLowerCase() !== record.address) {
      throw new ValidationError(GENERIC_RESET_FAILURE_MESSAGE);
    }
    if (passwordResetDecision(record, { now, credentialVersion: user.credentialVersion }) !== 'usable') {
      throw new ValidationError(GENERIC_RESET_FAILURE_MESSAGE);
    }

    // Conditional claim: the row must still be unconsumed, unexpired and on the
    // same credentialVersion. Two concurrent completions both reach here, but
    // the second update matches nothing once the first commits.
    const claimed = await tx.passwordResetToken.updateMany({
      where: {
        id: record.id,
        consumedAt: null,
        expiresAt: { gt: now },
        credentialVersion: user.credentialVersion,
      },
      data: { consumedAt: now },
    });
    if (claimed.count !== 1) {
      throw new ValidationError(GENERIC_RESET_FAILURE_MESSAGE);
    }

    await tx.user.update({
      where: { id: user.id },
      data: { passwordHash, credentialVersion: { increment: 1 } },
    });
    // Anyone already signed in may have been the attacker; make them sign in again.
    await tx.refreshSession.deleteMany({ where: { userId: user.id } });
    // Any other link this account was holding is now dead.
    await retireResetTokens(tx, user.id, now);
  });

  return { message: RESET_SUCCESS_MESSAGE };
}
