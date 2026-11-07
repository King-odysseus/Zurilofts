import { randomBytes, timingSafeEqual } from 'node:crypto';
import type { Request } from 'express';
import { env } from '../config/env.js';

/**
 * Browser-bound state and PKCE verifier for Google sign-in.
 *
 * passport-oauth2 normally keeps both in a server session, which this API does
 * not have. They live in one short-lived httpOnly cookie instead, so the callback
 * can only complete in the browser that started the sign-in: a callback URL
 * opened anywhere else (login CSRF) or a stolen authorization code (code
 * injection) has nothing to match against.
 */
export const GOOGLE_STATE_COOKIE = 'zuri_google_state';

const COOKIE_LIFETIME_MS = 10 * 60 * 1000;

function cookieOptions(maxAge?: number) {
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

type StoreCallback = (error: Error | null, value?: string | false, info?: { message: string }) => void;

/**
 * The store object passport-oauth2 calls when `pkce` is on. It never sees `res`,
 * so the cookie is written through `req.res`, which Express always sets.
 */
export class GoogleCookieStore {
  /** Mint the state handle and remember it with the PKCE verifier. */
  store(req: Request, verifier: string, _state: unknown, _meta: unknown, callback: StoreCallback): void {
    const res = req.res;
    if (!res) {
      callback(new Error('Google sign-in needs a response object to bind the browser'));
      return;
    }
    const handle = randomBytes(32).toString('base64url');
    // Both halves are base64url, which has no '.', so one separator is unambiguous.
    res.cookie(GOOGLE_STATE_COOKIE, `${handle}.${verifier}`, cookieOptions(COOKIE_LIFETIME_MS));
    callback(null, handle);
  }

  /**
   * Check the callback belongs to the browser that started it and hand back the
   * PKCE verifier for the token exchange. Single use: the cookie is cleared on
   * every outcome, so a replayed callback URL fails.
   */
  verify(req: Request, providedState: unknown, callback: StoreCallback): void {
    req.res?.clearCookie(GOOGLE_STATE_COOKIE, cookieOptions());

    const stored = req.cookies?.[GOOGLE_STATE_COOKIE];
    const separator = typeof stored === 'string' ? stored.indexOf('.') : -1;
    if (separator < 1) {
      callback(null, false, { message: 'Unable to verify the sign-in request.' });
      return;
    }

    const handle = stored.slice(0, separator);
    const verifier = stored.slice(separator + 1);
    if (!verifier || !googleStateMatches(handle, providedState)) {
      callback(null, false, { message: 'Invalid sign-in request.' });
      return;
    }

    // A string result is what tells passport-oauth2 to send it as code_verifier.
    callback(null, verifier);
  }
}
