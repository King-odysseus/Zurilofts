import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/jwt.js';
import { ConflictError, UnauthorizedError, NotFoundError, ValidationError } from '../types/index.js';

const SALT_ROUNDS = 12;

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface UserResponse {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  avatar: string | null;
  role: string;
  createdAt: Date;
}

function toUserResponse(user: any): UserResponse {
  return {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    phone: user.phone,
    avatar: user.avatar,
    role: user.role,
    createdAt: user.createdAt,
  };
}

async function generateTokens(user: { id: string; email: string; role: string }): Promise<AuthTokens> {
  const payload = { sub: user.id, email: user.email, role: user.role as 'USER' | 'ADMIN' };
  return {
    accessToken: signAccessToken(payload),
    refreshToken: signRefreshToken(payload),
  };
}

/**
 * Register a new user with email + password.
 */
export async function registerUser(
  email: string,
  password: string,
  firstName: string,
  lastName: string
): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new ConflictError('A user with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
  const user = await prisma.user.create({
    data: { email, passwordHash, firstName, lastName },
  });

  const tokens = await generateTokens(user);
  return { user: toUserResponse(user), tokens };
}

/**
 * Login with email + password.
 */
export async function loginUser(email: string, password: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !user.passwordHash) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) {
    throw new UnauthorizedError('Invalid email or password');
  }

  const tokens = await generateTokens(user);
  return { user: toUserResponse(user), tokens };
}

/**
 * Refresh tokens using a valid refresh token.
 */
export async function refreshTokens(refreshToken?: string): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  if (!refreshToken) {
    throw new UnauthorizedError('Refresh token required');
  }

  let payload;
  try {
    payload = verifyRefreshToken(refreshToken);
  } catch {
    throw new UnauthorizedError('Invalid or expired refresh token');
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  if (!user) {
    throw new NotFoundError('User');
  }

  const tokens = await generateTokens(user);
  return { user: toUserResponse(user), tokens };
}

/**
 * Find or create user from Google OAuth profile.
 */
export async function googleAuth(profile: {
  googleId: string;
  email: string;
  firstName: string;
  lastName: string;
}): Promise<{ user: UserResponse; tokens: AuthTokens }> {
  // Try to find by Google ID first
  let user = await prisma.user.findUnique({ where: { googleId: profile.googleId } });

  // If not found, try by email — link accounts
  if (!user) {
    user = await prisma.user.findUnique({ where: { email: profile.email } });
    if (user) {
      // Link Google account to existing user
      user = await prisma.user.update({
        where: { id: user.id },
        data: { googleId: profile.googleId },
      });
    }
  }

  // If still not found, create new user
  if (!user) {
    user = await prisma.user.create({
      data: {
        email: profile.email,
        googleId: profile.googleId,
        firstName: profile.firstName,
        lastName: profile.lastName,
      },
    });
  }

  const tokens = await generateTokens(user);
  return { user: toUserResponse(user), tokens };
}

/**
 * Get current user by ID.
 */
export async function getCurrentUser(userId: string): Promise<UserResponse> {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new NotFoundError('User');
  }
  return toUserResponse(user);
}
