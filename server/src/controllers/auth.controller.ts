import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';
import { clientUrlForRequest } from '../utils/publicUrl.js';

const REFRESH_COOKIE = 'zuri_refresh_token';

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
        firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
        lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
      },
      sessionMetaFor(req)
    );

    setRefreshCookie(res, tokens.refreshToken, tokens.persistent);
    const redirectUrl = new URL('/auth/callback', clientUrl);
    redirectUrl.searchParams.set('token', tokens.accessToken);
    res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
}
