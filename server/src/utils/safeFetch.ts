import type { LookupAddress } from 'node:dns';
import { promises as dns } from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import type { LookupFunction } from 'node:net';
import { isIP } from 'node:net';
import { ValidationError } from '../types/index.js';

/**
 * Fetch a host-supplied calendar feed without letting them aim the server at
 * internal services.
 *
 * The address check runs inside the socket's DNS lookup, not before the fetch,
 * so a hostname that resolves differently between a pre-check and the real
 * request (DNS rebinding) is still refused: the IP the socket is about to
 * connect to is the one that gets validated. Every redirect hop is validated
 * the same way.
 */

const MAX_REDIRECTS = 3;
const MAX_BYTES = 2 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const ALLOWED_PROTOCOLS = new Set(['http:', 'https:']);
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308]);

function isPublicIpv4(ip: string): boolean {
  const parts = ip.split('.');
  if (parts.length !== 4) return false;
  const octets = parts.map(Number);
  if (octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) return false;
  const [a, b, c] = octets;
  if (a === 0) return false; // "this" network
  if (a === 10) return false; // private
  if (a === 127) return false; // loopback
  if (a === 169 && b === 254) return false; // link-local, incl. cloud metadata
  if (a === 172 && b >= 16 && b <= 31) return false; // private
  if (a === 192 && b === 168) return false; // private
  if (a === 192 && b === 0 && c === 0) return false; // IETF protocol assignments
  if (a === 100 && b >= 64 && b <= 127) return false; // carrier-grade NAT
  if (a === 192 && b === 0 && c === 2) return false; // TEST-NET-1
  if (a === 198 && (b === 18 || b === 19)) return false; // benchmarking
  if (a === 198 && b === 51 && c === 100) return false; // TEST-NET-2
  if (a === 203 && b === 0 && c === 113) return false; // TEST-NET-3
  if (a >= 224) return false; // multicast, reserved, broadcast
  return true;
}

function isPublicIpv6(ip: string): boolean {
  const value = ip.toLowerCase().split('%')[0]; // drop any zone id
  if (value === '::' || value === '::1') return false;
  const mapped = value.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPublicIpv4(mapped[1]);
  if (/^fe[89ab]/.test(value)) return false; // link-local fe80::/10
  if (/^f[cd]/.test(value)) return false; // unique local fc00::/7
  if (/^ff/.test(value)) return false; // multicast
  if (value.startsWith('2001:db8')) return false; // documentation
  if (value.startsWith('64:ff9b')) return false; // NAT64 that maps to IPv4
  return true;
}

/** True only for addresses that are routable on the public internet. */
export function isPublicAddress(ip: string): boolean {
  const value = String(ip || '').trim();
  if (!value) return false;
  return value.includes(':') ? isPublicIpv6(value) : isPublicIpv4(value);
}

const BLOCKED_HOSTNAMES = /(^|\.)(localhost|local|internal|localdomain|home\.arpa)$/i;

/**
 * Structural check a URL must pass before any connection is attempted. The
 * address itself is re-checked at connection time, because DNS can change.
 */
export function validateOutboundUrl(raw: string): URL {
  let parsed: URL;
  try {
    parsed = new URL(String(raw || '').trim());
  } catch {
    throw new ValidationError('That is not a valid URL. Paste the full https:// address of the calendar feed.');
  }

  if (!ALLOWED_PROTOCOLS.has(parsed.protocol)) {
    throw new ValidationError('Calendar feeds must start with http:// or https://.');
  }
  // Credentials in a feed URL would be stored in plain text and sent to a
  // third party we do not control.
  if (parsed.username || parsed.password) {
    throw new ValidationError('Remove the username and password from the calendar URL.');
  }
  if (!parsed.hostname) {
    throw new ValidationError('That URL has no address. Paste the full https:// address of the calendar feed.');
  }
  if (BLOCKED_HOSTNAMES.test(parsed.hostname)) {
    throw new ValidationError('That address is not a public calendar feed.');
  }
  // A literal IP never goes through DNS, so there is no connection-time check
  // to catch it: test it here. Every other host is validated when the socket
  // resolves it, which also covers odd encodings such as a decimal IPv4.
  const bareHost = parsed.hostname.replace(/^\[|\]$/g, '');
  if (isIP(bareHost) !== 0 && !isPublicAddress(bareHost)) {
    throw new ValidationError('That address is not a public calendar feed.');
  }
  return parsed;
}

type LookupCallback = (err: NodeJS.ErrnoException | null, address?: unknown, family?: number) => void;

// dns.lookup's overloads are chosen by the literal options shape, which a
// pass-through wrapper cannot express, so the "resolve everything" form is
// declared explicitly.
type LookupAll = (
  hostname: string,
  options: { all: true },
  callback: (err: NodeJS.ErrnoException | null, addresses: LookupAddress[]) => void
) => void;
const lookupAll = dns.lookup as unknown as LookupAll;

/** DNS lookup that refuses to hand the socket a non-public address. */
function publicOnlyLookup(hostname: string, options: Record<string, unknown>, callback: LookupCallback): void {
  lookupAll(hostname, { all: true }, (err, addresses) => {
    if (err) {
      callback(err);
      return;
    }
    const blocked = addresses.find((entry) => !isPublicAddress(entry.address));
    if (blocked) {
      const blockedError: NodeJS.ErrnoException = new Error(
        'Calendar feed address resolves to a private or internal address.'
      );
      blockedError.code = 'EBLOCKEDADDRESS';
      callback(blockedError);
      return;
    }
    if (options.all) {
      callback(null, addresses);
      return;
    }
    callback(null, addresses[0].address, addresses[0].family);
  });
}

type FetchResult = { status: number; location?: string; body: string };

function requestText(target: URL): Promise<FetchResult> {
  return new Promise((resolve, reject) => {
    const transport = target.protocol === 'https:' ? https : http;
    const request = transport.request(
      target,
      {
        method: 'GET',
        lookup: publicOnlyLookup as unknown as LookupFunction,
        headers: {
          // Some feeds serve different bodies to unknown agents.
          Accept: 'text/calendar, text/plain;q=0.9, */*;q=0.5',
          'User-Agent': 'ZuriLofts-Calendar/1.0',
        },
      },
      (response) => {
        const status = response.statusCode ?? 0;
        if (REDIRECT_STATUSES.has(status)) {
          response.resume(); // drain, we only need the Location
          resolve({ status, location: response.headers.location, body: '' });
          return;
        }
        if (status < 200 || status >= 300) {
          response.resume();
          resolve({ status, body: '' });
          return;
        }

        const chunks: Buffer[] = [];
        let received = 0;
        response.on('data', (chunk: Buffer) => {
          received += chunk.length;
          if (received > MAX_BYTES) {
            request.destroy(
              new ValidationError('That calendar feed is too large to import (over 2 MB).')
            );
            return;
          }
          chunks.push(chunk);
        });
        response.on('end', () => resolve({ status, body: Buffer.concat(chunks).toString('utf8') }));
        response.on('error', reject);
      }
    );

    request.setTimeout(TIMEOUT_MS, () => {
      request.destroy(new ValidationError('That calendar feed took too long to respond (over 15 seconds).'));
    });
    request.on('error', (err: NodeJS.ErrnoException) => {
      if (err.code === 'EBLOCKEDADDRESS') {
        reject(new ValidationError('That address is not a public calendar feed, so it was not opened.'));
        return;
      }
      reject(err);
    });
    request.end();
  });
}

/**
 * Read a calendar feed as text, following a bounded number of redirects and
 * refusing any hop that points at a non-public address.
 */
export async function fetchCalendarFeedText(rawUrl: string): Promise<string> {
  let current = validateOutboundUrl(rawUrl);

  for (let hop = 0; hop <= MAX_REDIRECTS; hop += 1) {
    const { status, location, body } = await requestText(current);

    if (status >= 200 && status < 300) return body;

    if (REDIRECT_STATUSES.has(status) && location) {
      // Resolved against the current URL so relative Locations work, then
      // validated exactly like the original address.
      current = validateOutboundUrl(new URL(location, current).toString());
      continue;
    }

    if (REDIRECT_STATUSES.has(status)) {
      throw new ValidationError('That calendar feed redirected without saying where.');
    }
    throw new ValidationError(`That calendar feed could not be read (the server answered ${status}).`);
  }

  throw new ValidationError('That calendar feed redirected too many times.');
}

/**
 * Run tasks with a bounded number in flight, so one host with many slow feeds
 * cannot exhaust the event loop or the socket pool.
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const index = cursor;
      cursor += 1;
      try {
        results[index] = { status: 'fulfilled', value: await task(items[index]) };
      } catch (reason) {
        results[index] = { status: 'rejected', reason };
      }
    }
  }

  const workers = Array.from({ length: Math.min(limit, items.length) }, worker);
  await Promise.all(workers);
  return results;
}
