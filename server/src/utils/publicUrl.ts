import { Request } from 'express';
import { env } from '../config/env.js';

const WARNED_ENV_URLS = new Set<string>();

function isLocalUrl(url?: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(url || '');
}

function normalizeEnvUrl(key: 'CLIENT_URL' | 'GOOGLE_CALLBACK_URL', value?: string): string | undefined {
  if (!value) return undefined;
  let normalized = value.trim().replace(/^['"]|['"]$/g, '');
  const assignment = normalized.match(new RegExp(`^${key}\\s*=\\s*(.+)$`, 'i'));
  if (assignment) {
    normalized = assignment[1].trim().replace(/^['"]|['"]$/g, '');
    if (!WARNED_ENV_URLS.has(key)) {
      WARNED_ENV_URLS.add(key);
      console.warn(`${key} appears to include the variable name; using the URL value after '='. Update the environment variable value to contain only the URL.`);
    }
  }
  return normalized;
}

function forwardedValue(req: Request, header: string): string | undefined {
  const value = req.get(header);
  return value?.split(',')[0]?.trim();
}

export function requestOrigin(req: Request): string {
  const protocol = forwardedValue(req, 'x-forwarded-proto') || req.protocol || 'https';
  const host = forwardedValue(req, 'x-forwarded-host') || req.get('host');
  if (!host) return normalizeEnvUrl('CLIENT_URL', env.CLIENT_URL) || env.CLIENT_URL;
  return `${protocol}://${host}`;
}

export function clientUrlForRequest(req: Request): string {
  const clientUrl = normalizeEnvUrl('CLIENT_URL', env.CLIENT_URL) || env.CLIENT_URL;
  if (env.NODE_ENV === 'production' && isLocalUrl(clientUrl)) {
    return requestOrigin(req);
  }
  return clientUrl;
}

/**
 * The address that belongs in a canonical link, an Open Graph tag or the
 * sitemap entry for a page.
 *
 * These all answer "where does this page really live", and they are written into
 * HTML that crawlers and shared caches read. Building that answer from the Host
 * header means one request can declare the site lives somewhere else, so the
 * configured CLIENT_URL wins whenever it is a real public address. Only a local
 * or missing one falls back to the request, which is the development case where
 * no public address exists.
 */
export function publicOriginForCrawlers(req: Request): string {
  const configured = (normalizeEnvUrl('CLIENT_URL', env.CLIENT_URL) || env.CLIENT_URL || '').replace(/\/+$/, '');
  if (configured && !isLocalUrl(configured)) return configured;
  return requestOrigin(req).replace(/\/+$/, '');
}

export function googleCallbackUrlForRequest(req: Request): string {
  const callbackUrl = normalizeEnvUrl('GOOGLE_CALLBACK_URL', env.GOOGLE_CALLBACK_URL);
  if (callbackUrl && !(env.NODE_ENV === 'production' && isLocalUrl(callbackUrl))) {
    return callbackUrl;
  }
  return `${requestOrigin(req)}/api/auth/google/callback`;
}

/**
 * The app's own public address, from configuration only.
 *
 * Deliberately takes no Request: a link inside an email is built long before
 * anyone clicks it, and the Host header is attacker-controlled, so a reset link
 * derived from it would point at whatever domain the requester typed in. The
 * configured CLIENT_URL is the only honest answer. Falls back to the raw env
 * value so a misconfigured deployment still forms an absolute URL instead of a
 * relative one.
 */
export function publicClientUrl(): string {
  return (normalizeEnvUrl('CLIENT_URL', env.CLIENT_URL) || env.CLIENT_URL).replace(/\/+$/, '');
}
