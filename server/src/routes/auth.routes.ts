import { NextFunction, Request, Response, Router } from 'express';
import passport from '../config/passport.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, refreshLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema, refreshSchema, passwordResetRequestSchema, passwordResetCompleteSchema } from '../types/index.js';
import { env } from '../config/env.js';
import * as authController from '../controllers/auth.controller.js';
import { clientUrlForRequest, googleCallbackUrlForRequest } from '../utils/publicUrl.js';
import { summarizeOAuthFailure } from '../utils/oauthDiagnostics.js';

const router = Router();

type GoogleAuthenticateOptions = {
  scope?: string[];
  session: false;
  callbackURL: string;
};

/**
 * Where a Google sign-in that fails after the browser comes back ends up.
 *
 * passport reports a refused exchange by calling next(err), and next(err) on this
 * route is the JSON error handler: the visitor was left on a blank page reading
 * {"success":false,"error":"Internal server error"} with no link, no message and
 * no way forward. Nothing the visitor can do differs between these failures - the
 * fix is always on our side, a wrong client secret or a database missing a
 * migration - so record the one part an operator can act on and put the browser
 * back on the login page the sign-in started from.
 */
function sendGoogleFailureToLogin(error: unknown, req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }
  const summary = summarizeOAuthFailure(error);
  console.error(`Google sign-in failed: ${summary.code}${summary.detail ? ` - ${summary.detail}` : ''}`);
  res.redirect(`${clientUrlForRequest(req)}/login?error=google_auth_failed`);
}

// Email/Password auth
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', refreshLimiter, validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);

// Current user (requires auth)
router.get('/me', authenticate, authController.me);

// Password recovery. Both unauthenticated: a member who cannot sign in has to
// be able to ask for a link, and the link itself is the only credential the
// completion call needs. One limiter for the pair, so a script cannot alternate
// between the two to double its budget.
router.post(
  '/password-reset/request',
  passwordResetLimiter,
  validate(passwordResetRequestSchema),
  authController.requestPasswordReset
);
router.post(
  '/password-reset/complete',
  passwordResetLimiter,
  validate(passwordResetCompleteSchema),
  authController.completePasswordReset
);

// Google OAuth - only register routes if Google credentials are configured.
// The callback URL is derived from the production request when Railway/custom
// domain env still points at localhost.
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  // State and the PKCE verifier are minted by the strategy's cookie store (see
  // utils/googleOAuthStore.ts), so the callback can prove it came back to the
  // browser that started the sign-in.
  router.get('/google', (req, res, next) => {
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      callbackURL: googleCallbackUrlForRequest(req),
    } as GoogleAuthenticateOptions)(req, res, next);
  });

  router.get(
    '/google/callback',
    // The custom-callback form so a refused callback (wrong browser, replayed
    // link, denied consent) ends on the login page of this site, not on a
    // relative path of the API host.
    (req: Request, res: Response, next: NextFunction) => passport.authenticate(
      'google',
      { session: false, callbackURL: googleCallbackUrlForRequest(req) } as GoogleAuthenticateOptions,
      (error: unknown, user: Express.User | false | null) => {
        if (error) {
          sendGoogleFailureToLogin(error, req, res, next);
          return;
        }
        if (!user) {
          res.redirect(`${clientUrlForRequest(req)}/login?error=google_auth_failed`);
          return;
        }
        req.user = user as typeof req.user;
        next();
      },
    )(req, res, next),
    authController.googleCallback,
    sendGoogleFailureToLogin
  );
} else {
  router.get('/google', (req, res) => {
    res.redirect(`${clientUrlForRequest(req)}/login?error=google_not_configured`);
  });

  router.get('/google/callback', (req, res) => {
    res.redirect(`${clientUrlForRequest(req)}/login?error=google_not_configured`);
  });
}

export default router;
