import { Request, Response, NextFunction } from 'express';
import * as authService from '../services/auth.service.js';
import { env } from '../config/env.js';
import { clientUrlForRequest } from '../utils/publicUrl.js';

const REFRESH_COOKIE = 'zuri_refresh_token';

function setRefreshCookie(res: Response, token: string): void {
  res.cookie(REFRESH_COOKIE, token, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

function clearRefreshCookie(res: Response): void {
  res.clearCookie(REFRESH_COOKIE, {
    httpOnly: true,
    secure: env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/api/auth',
  });
}

/**
 * POST /api/auth/register
 */
export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email, password, firstName, lastName, role } = req.body;
    const { user, tokens } = await authService.registerUser(email, password, firstName, lastName, role);
    setRefreshCookie(res, tokens.refreshToken);

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
    const { email, password } = req.body;
    const { user, tokens } = await authService.loginUser(email, password);
    setRefreshCookie(res, tokens.refreshToken);

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
    const { user, tokens } = await authService.refreshTokens(token);
    setRefreshCookie(res, tokens.refreshToken);

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
export async function logout(_req: Request, res: Response): Promise<void> {
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

    const state = typeof req.query.state === 'string' ? req.query.state : '';
    const oauthState = new URLSearchParams(state);
    const role = oauthState.get('role')?.toUpperCase() === 'HOST' ? 'HOST' : 'USER';

    const { user, tokens } = await authService.googleAuth({
      googleId: profile.id,
      email: profile.emails?.[0]?.value || `${profile.id}@google.oauth`,
      firstName: profile.name?.givenName || profile.displayName?.split(' ')[0] || 'User',
      lastName: profile.name?.familyName || profile.displayName?.split(' ').slice(1).join(' ') || '',
      role,
    });

    setRefreshCookie(res, tokens.refreshToken);
    const redirectUrl = new URL('/auth/callback', clientUrl);
    redirectUrl.searchParams.set('token', tokens.accessToken);
    if (role === 'HOST') {
      redirectUrl.searchParams.set('intent', 'host');
    }
    res.redirect(redirectUrl.toString());
  } catch (error) {
    next(error);
  }
}
