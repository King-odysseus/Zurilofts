import { Request, Response, NextFunction } from 'express';
import { verifyAccessToken } from '../utils/jwt.js';
import { UnauthorizedError, ForbiddenError } from '../types/index.js';

/**
 * Require a valid JWT access token. Attaches decoded payload to req.user.
 */
export function authenticate(req: Request, _res: Response, next: NextFunction): void {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedError('No token provided');
    }

    const token = authHeader.split(' ')[1];
    const decoded = verifyAccessToken(token);
    req.user = decoded;
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
