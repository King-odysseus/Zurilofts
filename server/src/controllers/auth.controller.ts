import { Request, Response, NextFunction } from 'express';
import { randomBytes, timingSafeEqual } from 'node:crypto';
import * as authService from '../services/auth.service.js';
import * as passwordResetService from '../services/password-reset.service.js';
import { env } from '../config/env.js';
import { clientUrlForRequest } from '../utils/publicUrl.js';

const REFRESH_COOKIE = 'zuri_refresh_token';
const GOOGLE_STATE_COOKIE = 'zuri_google_state';

// persistent (== "remember me" checked) survives 7 days like today. Unchecked,
// the cookie carries no maxAge at all, so the browser treats it as a session
// cookie and drops it on close - the server-side session is also shorter-lived
// (see auth.service) as a backstop for browsers that never really close.
export function refreshCookieOptions(persistent: boolean) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/api/auth',
    ...(persistent ? { maxAge: 7 * 24 * 60 * 60 * 1000 } : {}),
  };
}

function setRefreshCookie(res: Response, token: string, persistent: boolean): void {
  res.cookie(REFRESH_COOKIE, token, refreshCookieOptions(persistent));
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
}

function sessionMetaFor(req: Request): { ip?: string; userAgent?: string } {
  return { ip: req.ip, userAgent: req.get('user-agent') || undefined };
}

function googleStateCookieOptions(maxAge?: number) {
  return {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    // Scoped to the sign-in routes so it is sent to the callback and nowhere else.
    path: '/api/auth/google',
    ...(maxAge ? { maxAge } : {}),
  };
}

/**
 * Constant-time comparison of the state we issued with the one Google echoed.
 * Both sides must be non-empty, and a missing value is a failure rather than a
 * wildcard: without this, a callback completed in one browser could sign a
 * different person into the attacker's account (login CSRF).
 */
export function googleStateMatches(expected: unknown, received: unknown): boolean {
  if (typeof expected !== 'string' || typeof received !== 'string') return false;
  if (!expected || !received) return false;
  const left = Buffer.from(expected);
  const right = Buffer.from(received);
  if (left.length !== right.length) return false;
  return timingSafeEqual(left, right);
}

/**
 * Start Google sign-in: mint a fresh value bound to this browser, returned to
 * Google as the OAuth state parameter and kept in an httpOnly cookie.
 */
export function beginGoogleAuth(res: Response): string {
  const state = randomBytes(32).toString('base64url');
  res.cookie(GOOGLE_STATE_COOKIE, state, googleStateCookieOptions(10 * 60 * 1000));
  return state;
}

/**
 * Check the callback belongs to the browser that started it. Single use: the
 * cookie is cleared on every outcome, so a replayed callback URL fails.
 */
export function verifyGoogleState(req: Request, res: Response): boolean {
  const expected = req.cookies?.[GOOGLE_STATE_COOKIE];
  res.clearCookie(GOOGLE_STATE_COOKIE, googleStateCookieOptions());
  return googleStateMatches(expected, req.query.state);
}

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const { user, tokens } = await authService.registerUser(email, password, firstName, lastName, role, sessionMetaFor(req));
    setRefreshCookie(res, tokens.refreshToken, tokens.persistent);

    res.status(201).json({
      success: true,
      data: { user, accessToken: tokens.accessToken },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/login
 */
export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, remember } = req.body;
    // Default to remembered (today's behavior) when the field is omitted, e.g. older clients.
    const rememberMe = remember !== false;
    const { user, tokens } = await authService.loginUser(email, password, sessionMetaFor(req), rememberMe);
    setRefreshCookie(res, tokens.refreshToken, tokens.persistent);

    res.json({
      success: true,
      data: { user, accessToken: tokens.accessToken },
    });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/refresh
 */
export async function refresh(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
    const { user, tokens } = await authService.refreshTokens(token, sessionMetaFor(req));
    setRefreshCookie(res, tokens.refreshToken, tokens.persistent);

    res.json({
      success: true,
      data: { user, accessToken: tokens.accessToken },
    });
  } catch (error) {
    clearRefreshCookie(res);
    next(error);
  }
}

/**
 * POST /api/auth/logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
  const token = req.cookies?.[REFRESH_COOKIE] || req.body?.refreshToken;
  await authService.logoutUser(token);
  clearRefreshCookie(res);
  res.json({ success: true, message: 'Logged out' });
}

/**
 * GET /api/auth/me
 */
export async function me(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await authService.getCurrentUser(req.user!.sub);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/password-reset/request
 *
 * Always 202 with the same body. The service decides silently whether a link
 * was issued, because an unknown address, a Google-only account, a suspended
 * account and an administrator must look identical from the outside. The token
 * never appears in this response in any environment.
 */
export async function requestPasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body;
    const result = await passwordResetService.requestPasswordReset(email);
    res.status(202).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * POST /api/auth/password-reset/complete
 *
 * On success there is no session and no token: the client signs in with the new
 * password, which is also what proves the change took effect. A bad, expired,
 * used or stale token all produce the same generic failure.
 */
export async function completePasswordReset(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { token, newPassword } = req.body;
    const result = await passwordResetService.completePasswordReset(token, newPassword);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/auth/google/callback
 */
export async function googleCallback(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const clientUrl = clientUrlForRequest(req);
    const profile = req.user as any;
    if (!profile) {
      return res.redirect(`${clientUrl}/login?error=oauth_failed`);
    }

    const { user, tokens } = await authService.googleAuth(
      {
        googleId: profile.id,
        email: profile.emails?.[0]?.value || `${profile.id}@google.oauth`,
        // Google's verdict, from whichever profile shape the strategy used:
        // the OpenID parser marks it on the email entry, the default Google
        // Sign-In parser leaves it in the raw payload. An address Google has not
        // verified is a claim, not proof of ownership, so auth.service refuses it.
        emailVerified:
          profile.emails?.[0]?.verified === true || profile._json?.email_verified === true,
        firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
        lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
      },
      sessionMetaFor(req)
    );

    setRefreshCookie(res, tokens.refreshToken, tokens.persistent);
    // Nothing sensitive goes in the address bar. The refresh cookie already
    // carries the session, and the client trades it for an access token, so a
    // bearer token never reaches history, logs, referrers or analytics.
    res.redirect(new URL('/auth/callback', clientUrl).toString());
  } catch (error) {
    next(error);
  }
}
