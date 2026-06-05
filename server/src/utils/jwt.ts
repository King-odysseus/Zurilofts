import jwt, { type SignOptions } from 'jsonwebtoken';
import { env } from '../config/env.js';
import type { JwtPayload } from '../types/index.js';

function parseExpiry(expiry: string): SignOptions['expiresIn'] {
  // If it's a number string like "3600", parse to int (seconds)
  const num = parseInt(expiry, 10);
  if (!isNaN(num) && String(num) === expiry) return num;
  // Otherwise it's a string like "15m" or "7d" — cast to the expected type
  return expiry as SignOptions['expiresIn'];
}

export function signAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_ACCESS_SECRET, {
    expiresIn: parseExpiry(env.JWT_ACCESS_EXPIRY),
  });
}

export function signRefreshToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, env.JWT_REFRESH_SECRET, {
    expiresIn: parseExpiry(env.JWT_REFRESH_EXPIRY),
  });
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_ACCESS_SECRET) as JwtPayload;
}

export function verifyRefreshToken(token: string): JwtPayload {
  return jwt.verify(token, env.JWT_REFRESH_SECRET) as JwtPayload;
}
