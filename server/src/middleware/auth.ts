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
 * This is the *verified* gate: only an approved host account may reach it.
 * Used for money-adjacent actions (payouts, bank/payout-destination details)
 * where a mid-verification account should not yet participate.
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

/**
 * Require access to the host workspace: an approved HOST/ADMIN, or a plain
 * USER who has expressed hosting intent (any HostApplication row, regardless
 * of status). This is what lets a brand-new applicant land straight in their
 * dashboard and prepare draft listings while verification is still pending -
 * see the host onboarding/verification plan. It intentionally does NOT grant
 * publish or payout access; those stay behind `requireHost` (approved) or
 * per-listing status checks in property.service.ts.
 * Must be used after `authenticate`.
 */
export async function requireHostWorkspace(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    if (!req.user) {
      return next(new UnauthorizedError());
    }
    if (req.user.role === 'HOST' || req.user.role === 'ADMIN') {
      return next();
    }
    if (req.user.role === 'USER') {
      const application = await prisma.hostApplication.findUnique({
        where: { userId: req.user.sub },
        select: { id: true },
      });
      if (application) {
        return next();
      }
    }
    return next(new ForbiddenError('Host workspace access required'));
  } catch (error) {
    next(error);
  }
}
