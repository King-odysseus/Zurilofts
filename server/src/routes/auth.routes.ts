import { Router } from 'express';
import passport from '../config/passport.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema, refreshSchema } from '../types/index.js';
import { env } from '../config/env.js';
import * as authController from '../controllers/auth.controller.js';
import { clientUrlForRequest, googleCallbackUrlForRequest } from '../utils/publicUrl.js';

const router = Router();

type GoogleAuthenticateOptions = {
  scope?: string[];
  session: false;
  failureRedirect?: string;
  callbackURL: string;
};

// Email/Password auth
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);

// Current user (requires auth)
router.get('/me', authenticate, authController.me);

// Google OAuth - only register routes if Google credentials are configured.
// The callback URL is derived from the production request when Railway/custom
// domain env still points at localhost.
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET) {
  router.get(
    '/google',
    (req, res, next) => passport.authenticate('google', {
      scope: ['profile', 'email'],
      session: false,
      callbackURL: googleCallbackUrlForRequest(req),
    } as GoogleAuthenticateOptions)(req, res, next)
  );

  router.get(
    '/google/callback',
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
