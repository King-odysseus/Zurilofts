import { Router } from 'express';
import passport from '../config/passport.js';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import { registerSchema, loginSchema, refreshSchema } from '../types/index.js';
import { env } from '../config/env.js';
import * as authController from '../controllers/auth.controller.js';

const router = Router();

// Email/Password auth
router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/refresh', validate(refreshSchema), authController.refresh);
router.post('/logout', authController.logout);

// Current user (requires auth)
router.get('/me', authenticate, authController.me);

// Google OAuth — only register routes if Google credentials are configured
if (env.GOOGLE_CLIENT_ID && env.GOOGLE_CLIENT_SECRET && env.GOOGLE_CALLBACK_URL) {
  router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
  );

  router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/login?error=google_auth_failed' }),
    authController.googleCallback
  );
}

export default router;
