import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for auth routes — 10 attempts per 15 minutes per IP.
 */
export const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many attempts. Please try again after 15 minutes.',
  },
});
