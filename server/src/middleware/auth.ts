import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../types/index.js';
import prisma from '../config/prisma.js';

/**
 * Require a valid JWT access token. Attaches decoded payload to req.user.
 */
export async function authenticate(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    // Resolve current account state on every protected request so suspension,
    // erasure, and role changes take effect immediately instead of waiting for
    // an already-issued access token to expire.
    const account = await prisma.user.findUnique({
      where: { id: decoded.sub },
      select: { email: true, role: true, suspended: true, deletedAt: true },
    });
    if (!account || account.suspended || account.deletedAt) {
      throw new UnauthorizedError('This account is no longer active');
    }
    req.user = {
      ...decoded,
      email: account.email,
      role: account.role as typeof decoded.role,
    };
    next();
  } catch (error: any) {
    if (error.name === 'TokenExpiredError') {
      next(new UnauthorizedError('Token expired'));
    } else if (error.name === 'JsonWebTokenError') {
      next(new UnauthorizedError('Invalid token'));
    } else {
      next(error);
    }
  }
}

/**
 * Require admin role in addition to valid JWT.
 * Must be used after `authenticate`.
 */
export function requireAdmin(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (req.user.role !== 'ADMIN') {
    return next(new ForbiddenError('Admin access required'));
  }
  next();
}

/**
 * Require at least host-level access (HOST or ADMIN) in addition to valid JWT.
 * Must be used after `authenticate`.
 */
export function requireHost(req: Request, _res: Response, next: NextFunction): void {
  if (!req.user) {
    return next(new UnauthorizedError());
  }
  if (req.user.role !== 'HOST' && req.user.role !== 'ADMIN') {
    return next(new ForbiddenError('Host access required'));
  }
  next();
}
