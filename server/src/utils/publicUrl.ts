import { Request } from 'express';
import { env } from '../config/env.js';

function isLocalUrl(url?: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url || '');
}

function forwardedValue(req: Request, header: string): string | undefined {
  const value = req.get(header);
  return value?.split(',')[0]?.trim();
}

export function requestOrigin(req: Request): string {
  const protocol = forwardedValue(req, 'x-forwarded-proto') || req.protocol || 'https';
  const host = forwardedValue(req, 'x-forwarded-host') || req.get('host');
  if (!host) return env.CLIENT_URL;
  return `${protocol}://${host}`;
}

export function clientUrlForRequest(req: Request): string {
  if (env.NODE_ENV === 'production' && isLocalUrl(env.CLIENT_URL)) {
    return requestOrigin(req);
  }
  return env.CLIENT_URL;
}

export function googleCallbackUrlForRequest(req: Request): string {
  if (env.GOOGLE_CALLBACK_URL && !(env.NODE_ENV === 'production' && isLocalUrl(env.GOOGLE_CALLBACK_URL))) {
    return env.GOOGLE_CALLBACK_URL;
  }
  return `${requestOrigin(req)}/api/auth/google/callback`;
}

