import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { signAccessToken } from '../utils/jwt.js';
import { UnauthorizedError, NotFoundError, ValidationError, ConflictError } from '../types/index.js';
import { CURRENT_POLICY_VERSION, hashIp } from './consent.service.js';

const SALT_ROUNDS = 12;

// Refresh sessions live server-side (see schema RefreshSession). Lifetime must
// match the cookie maxAge in auth.controller (7 days). `updatedAt` is bumped on
// every rotation and is what distinguishes a benign concurrent double-refresh
// (two tabs sharing one cookie, < GRACE) from real token theft (a rotated token
// presented again much later).
const REFRESH_LIFETIME_MS = 7 * 24 * 60 * 60 * 1000;
// "Remember me" unchecked: the cookie itself is a browser-session cookie (no
// maxAge, gone when the browser closes), but a browser that never closes -
// or a tab restore - can outlive that intent, so the *server* record still
// expires this session on its own after one day as a hard backstop.
const REFRESH_LIFETIME_MS_TRANSIENT = 24 * 60 * 60 * 1000;
const ROTATE_GRACE_MS = 60 * 1000;

/** Exported for tests: how long a refresh session lives given its "remember me" choice. */
export function refreshLifetimeMs(persistent: boolean): number {
  return persistent ? REFRESH_LIFETIME_MS : REFRESH_LIFETIME_MS_TRANSIENT;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  /** Echoes the session's "remember me" choice so the controller can set a matching cookie. */
  persistent: boolean;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  createdAt: Date;
  // Host workspace intent/verification, independent of `role`. null = the
  // user has never expressed hosting intent (no HostApplication row).
  hostApplicationStatus: string | null;
  // Guest identity verification status, gates payment (not dashboard access).
  identityVerificationStatus: string;
}

/** Optional request context recorded on a refresh session for audit. */
export interface SessionMeta {
  ip?: string;
  userAgent?: string;
}

function toUserResponse(
  user: any,
  extras: { hostApplicationStatus?: string | null; identityVerificationStatus?: string | null } = {}
): UserResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
    hostApplicationStatus: extras.hostApplicationStatus ?? null,
    identityVerificationStatus: extras.identityVerificationStatus ?? 'UNVERIFIED',
  };
}

/** Fetch the lightweight status fields toUserResponse needs, in one round trip. */
async function loadUserStatusExtras(userId: string) {
  const [application, verification] = await Promise.all([
    prisma.hostApplication.findUnique({ where: { userId }, select: { status: true } }),
    prisma.identityVerification.findUnique({ where: { userId }, select: { status: true } }),
  ]);
  return {
    hostApplicationStatus: application?.status ?? null,
    identityVerificationStatus: verification?.status ?? 'UNVERIFIED',
  };
}

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}

/** Create a refresh session row and return its opaque token. */
async function createRefreshSession(userId: string, meta?: SessionMeta, persistent = true): Promise<string> {
  const token = crypto.randomBytes(48).toString('base64url');
  await prisma.refreshSession.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + refreshLifetimeMs(persistent)),
      persistent,
      ip: meta?.ip ?? null,
      userAgent: meta?.userAgent ?? null,
    },
  });
  return token;
}

/**
 * Rotate a session to a fresh opaque token; the presented hash becomes
 * previousHash. Rotation preserves the session's original "remember me"
 * choice - a refresh never upgrades a transient session into a persistent one.
 */
async function rotateRefreshSession(
  session: { id: string; tokenHash: string; userId: string; persistent: boolean },
  meta?: SessionMeta
): Promise<string> {
  const token = crypto.randomBytes(48).toString('base64url');
  await prisma.refreshSession.update({
    where: { id: session.id },
    data: {
      tokenHash: hashToken(token),
      previousHash: session.tokenHash,
      expiresAt: new Date(Date.now() + refreshLifetimeMs(session.persistent)),
      ip: meta?.ip ?? undefined,
      userAgent: meta?.userAgent ?? undefined,
    },
  });
  return token;
}

async function revokeAllSessions(userId: string): Promise<void> {
  await prisma.refreshSession.deleteMany({ where: { userId } });
}

/** Issue an access token + a fresh stored refresh session for a user. */
async function generateTokens(
  user: { id: string; email: string; role: string; credentialVersion: number },
  meta?: SessionMeta,
  persistent = true
): Promise<AuthTokens> {
  // `ver` pins the token to the password it was issued under: changing the
  // password increments User.credentialVersion and the auth middleware then
  // refuses every older token (see middleware/auth.ts).
  const accessToken = signAccessToken({
    sub: user.id,
    email: user.email,
    role: user.role as 'USER' | 'HOST' | 'ADMIN',
    ver: user.credentialVersion,
  });
  const refreshToken = await createRefreshSession(user.id, meta, persistent);
  return { accessToken, refreshToken, persistent };
}

/**
 * Register a new user with email + password.
 *
 * Choosing role HOST at registration is host *intent*, not authority: the user
 * is always created as USER and, when they asked to host, a DRAFT
 * HostApplication is created atomically. The HOST role is only ever granted
 * later by an admin approving that application. Issued tokens therefore always
 * carry USER for a fresh registration.
 *
 * Anti-enumeration: registering with an email that already exists does NOT say
 * "that account exists". If the password happens to match the existing account,
 * the user is simply signed in; otherwise a generic failure is returned.
 */
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string,
  role: 'USER' | 'HOST' = 'USER',
  dateOfBirth: string,
  meta?: SessionMeta
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const normalizedEmail = email.trim().toLowerCase();
  const existing = await prisma.user.findUnique({ where: { email: normalizedEmail } });
  if (existing) {
    // Existing account: if these credentials match, treat as sign-in (covers the
    // "I forgot I already registered" case without confirming the account exists).
    const valid = existing.passwordHash ? await bcrypt.compare(password, existing.passwordHash) : false;
    if (!valid || existing.suspended) {
      throw new ValidationError('Could not create an account with these details.');
    }
    const tokens = await generateTokens(existing, meta);
    return { user: toUserResponse(existing, await loadUserStatusExtras(existing.id)), tokens };
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const wantsToHost = role === 'HOST';

  const user = await prisma.$transaction(async (tx) => {
    const created = await tx.user.create({
      data: { email: normalizedEmail, passwordHash, firstName, lastName, role: 'USER', dateOfBirth },
    });
    if (wantsToHost) {
      await tx.hostApplication.create({ data: { userId: created.id, status: 'DRAFT' } });
    }
    // The Terms checkbox is only worth anything if acceptance can be proven
    // later. Writing it in this same transaction means an account can never
    // exist without a record of which policy version the person agreed to.
    await tx.consentRecord.create({
      data: {
        userId: created.id,
        necessary: true,
        analytics: false,
        marketing: false,
        policyVersion: CURRENT_POLICY_VERSION,
        termsAccepted: true,
        termsVersion: CURRENT_POLICY_VERSION,
        ipHash: hashIp(meta?.ip),
        userAgent: meta?.userAgent ?? null,
      },
    });
    return created;
  });

  const tokens = await generateTokens(user, meta);
  // Known synchronously from the transaction above - no extra round trip needed.
  return {
    user: toUserResponse(user, { hostApplicationStatus: wantsToHost ? 'DRAFT' : null }),
    tokens,
  };
}

/**
 * Login with email + password.
 */
export async function loginUser(
  email: string,
  password: string,
  meta?: SessionMeta,
  remember = true
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({ where: { email: email.trim().toLowerCase() } });
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  if (user.suspended) {
    throw new UnauthorizedError('This account has been suspended. Please contact support.');
  }

  const tokens = await generateTokens(user, meta, remember);
  return { user: toUserResponse(user, await loadUserStatusExtras(user.id)), tokens };
}

/**
 * Refresh using a valid opaque refresh token. Every successful refresh rotates
 * the token and bumps the session; presenting an already-rotated token is either
 * a benign concurrent refresh (two tabs) or token theft, disambiguated by the
 * rotation grace window.
 */
export async function refreshTokens(
  refreshToken?: string,
  meta?: SessionMeta
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }

  const presentedHash = hashToken(refreshToken);
  const session = await prisma.refreshSession.findUnique({
    where: { tokenHash: presentedHash },
    include: { user: true },
  });

  if (!session) {
    // Not the current token. If it is the token this session rotated FROM and
    // that rotation happened moments ago, it is two tabs racing on one cookie -
    // rotate the still-live session instead of logging anyone out.
    const reused = await prisma.refreshSession.findFirst({
      where: { previousHash: presentedHash },
      include: { user: true },
    });
    if (reused) {
      if (Date.now() - reused.updatedAt.getTime() < ROTATE_GRACE_MS) {
        const token = await rotateRefreshSession(reused, meta);
        return {
          user: toUserResponse(reused.user, await loadUserStatusExtras(reused.user.id)),
          tokens: {
            accessToken: signAccessToken({ sub: reused.user.id, email: reused.user.email, role: reused.user.role as 'USER' | 'HOST' | 'ADMIN', ver: reused.user.credentialVersion }),
            refreshToken: token,
            persistent: reused.persistent,
          },
        };
      }
      // Rotated long ago and presented again = stolen token in use. Kill the
      // user's sessions so the theft cannot be replayed.
      await revokeAllSessions(reused.userId);
    }
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  if (session.expiresAt < new Date()) {
    await prisma.refreshSession.delete({ where: { id: session.id } }).catch((err) => console.error('Failed to delete expired refresh session:', err));
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = session.user;
  if (!user || user.suspended || user.deletedAt) {
    await revokeAllSessions(session.userId);
    throw new UnauthorizedError('This account is no longer active. Please log in again.');
  }

  const token = await rotateRefreshSession(session, meta);
  return {
    user: toUserResponse(user, await loadUserStatusExtras(user.id)),
    tokens: {
      accessToken: signAccessToken({ sub: user.id, email: user.email, role: user.role as 'USER' | 'HOST' | 'ADMIN', ver: user.credentialVersion }),
      refreshToken: token,
      persistent: session.persistent,
    },
  };
}

/** Revoke the session backing a refresh token (logout). */
export async function logoutUser(refreshToken?: string): Promise<void> {
  if (!refreshToken) return;
  const h = hashToken(refreshToken);
  await prisma.refreshSession.deleteMany({
    where: { OR: [{ tokenHash: h }, { previousHash: h }] },
  });
}

/**
 * Whether a Google identity may be attached to an account that already holds
 * the same email address.
 *
 * Kept separate from the database calls so the rule can be tested directly. The
 * password case is the one that matters: registration never proves the person
 * owns the address, so somebody could register a stranger's mailbox with a
 * password of their choosing and wait. Auto-linking on the next Google sign-in
 * then handed them a permanent way into the real owner's account (bookings,
 * messages, identity documents). That owner can still recover the account with
 * "Forgot password", which is delivered to the same mailbox.
 */
export type GoogleLinkDecision = 'link' | 'refuse-password' | 'refuse-other-google';

export function googleLinkDecision(existing: {
  googleId: string | null;
  passwordHash: string | null;
}): GoogleLinkDecision {
  if (existing.googleId) return 'refuse-other-google';
  if (existing.passwordHash) return 'refuse-password';
  return 'link';
}

/**
 * Find or create user from Google OAuth profile.
 */
export async function googleAuth(
  profile: {
    googleId: string;
    email: string;
    firstName: string;
    lastName: string;
    /**
     * Google's own verdict on the address. Required rather than optional: this
     * flow has no other proof that the person owns the mailbox, so a caller
     * that cannot say the address is verified must not be trusted with it.
     */
    emailVerified: boolean;
  },
  meta?: SessionMeta
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  if (!profile.emailVerified) {
    throw new UnauthorizedError(
      'Google has not verified this email address. Verify it with Google and try again.'
    );
  }

  // Try to find by Google ID first
  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

  // Not linked yet: the address may already belong to an account created
  // another way, so the linking rule decides whether this sign-in may continue.
  if (!user) {
    const existing = await prisma.user.findUnique({ where: { email: profile.email } });
    if (existing) {
      const decision = googleLinkDecision(existing);
      if (decision === 'refuse-password') {
        throw new ConflictError(
          'An account with this email already uses a password. Sign in with that password, or reset it, and then link Google from your profile.'
        );
      }
      if (decision === 'refuse-other-google') {
        throw new ConflictError('This email is already linked to a different Google account.');
      }
      user = await prisma.user.update({
        where: { id: existing.id },
        data: { googleId: profile.googleId },
      });
    }
  }

  // If still not found, create new user
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.googleId,
        firstName: profile.firstName,
        lastName: profile.lastName,
        role: 'USER',
      },
    });
  }

  if (user.suspended) {
    throw new UnauthorizedError('This account has been suspended. Please contact support.');
  }

  const tokens = await generateTokens(user, meta);
  return { user: toUserResponse(user, await loadUserStatusExtras(user.id)), tokens };
}

/**
 * Get current user by ID.
 */
export async function getCurrentUser(userId: string): Promise<UserResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User');
  }
  return toUserResponse(user, await loadUserStatusExtras(user.id));
}
