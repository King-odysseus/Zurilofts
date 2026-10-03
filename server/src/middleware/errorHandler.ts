import { Request, Response, NextFunction } from 'express';
import { AppError } from '../types/index.js';

/**
 * Global error handler middleware.
 */
export function errorHandler(err: Error, _req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
    });
    return;
  }

  // Prisma unique-constraint violation (P2002) is a client error, not a crash:
  // surface it as 409 so a caller gets an actionable message instead of a 500.
  // Duck-typed because the generated Prisma error class is not imported here.
  if ((err as { code?: string })?.code === 'P2002') {
    res.status(409).json({ success: false, error: 'That value is already taken' });
    return;
  }

  console.error('Unexpected error:', err);

  res.status(500).json({
    success: false,
    error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
  });
}
