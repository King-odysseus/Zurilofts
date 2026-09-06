import rateLimit from 'express-rate-limit';

/**
 * Rate limiter for auth routes - 10 attempts per 15 minutes per IP.
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

/**
 * Rate limiter for the token-refresh endpoint. Rotation issues a fresh token
 * and bumps a server row, so it is cheap for a legit client but a prime target
 * for a stolen-cookie brute force. Keep the window long enough that a normal
 * multi-tab user (each tab refreshing once an hour) is never hit.
 */
export const refreshLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: false,
  message: {
    success: false,
    error: 'Too many refresh attempts. Please log in again.',
  },
});

/**
 * Rate limiter for chat endpoints - 20 requests per minute per IP.
 * Chat is conversational, so we allow more throughput than auth.
 */
export const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    error: 'Too many chat requests. Please slow down.',
  },
});
