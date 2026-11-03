import { Router } from 'express';
import passport from '../config/passport.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter, refreshLimiter, passwordResetLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema, refreshSchema, passwordResetRequestSchema, passwordResetCompleteSchema } from '../types/index.js';
import { env } from '../config/env.js';
import * as authController from '../controllers/auth.controller.js';
import { clientUrlForRequest, googleCallbackUrlForRequest } from '../utils/publicUrl.js';

const router = Router();

type GoogleAuthenticateOptions = {
  scope?: string[];
  session: false;
  failureRedirect?: string;
  callbackURL: string;
  // Forwarded to Google and echoed back; verified against the cookie on return.
  state?: string;
};

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
  router.get('/google', (req, res, next) => {
    // The value is minted here and kept in an httpOnly cookie, so the callback
    // can prove it came back to the browser that started the sign-in.
    const state = authController.beginGoogleAuth(res);
    passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      callbackURL: googleCallbackUrlForRequest(req),
      state,
    } as GoogleAuthenticateOptions)(req, res, next);
  });

  router.get(
    '/google/callback',
    // Runs before passport exchanges the code, so a callback that is not ours
    // never gets that far.
    (req, res, next) => {
      if (!authController.verifyGoogleState(req, res)) {
        res.redirect(`${clientUrlForRequest(req)}/login?error=google_auth_failed`);
        return;
      }
      next();
    },
    (req, res, next) => passport.authenticate('google', {
      session: false,
      failureRedirect: '/login?error=google_auth_failed',
      callbackURL: googleCallbackUrlForRequest(req),
    } as GoogleAuthenticateOptions)(req, res, next),
    authController.googleCallback
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
