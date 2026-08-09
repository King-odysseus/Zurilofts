/**
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" NODE_ENV=production node --import tsx --test tests/public-url.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clientUrlForRequest,
  googleCallbackUrlForRequest,
  requestOrigin,
} from '../src/utils/publicUrl.js';

function req(headers: Record<string, string>, protocol = 'http') {
  return {
    protocol,
    get(name: string) {
      return headers[name.toLowerCase()];
    },
  } as any;
}

test('requestOrigin trusts Railway forwarded protocol and host', () => {
  const origin = requestOrigin(req({
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'zurilofts.co.ke',
    host: 'internal.railway.app',
  }));

  assert.equal(origin, 'https://zurilofts.co.ke');
});

test('production localhost CLIENT_URL falls back to the public request origin', () => {
  const clientUrl = clientUrlForRequest(req({
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'zurilofts.co.ke',
    host: 'internal.railway.app',
  }));

  assert.equal(clientUrl, 'https://zurilofts.co.ke');
});

test('production Google callback URL is derived when env is local or omitted', () => {
  const callbackUrl = googleCallbackUrlForRequest(req({
    'x-forwarded-proto': 'https',
    'x-forwarded-host': 'zurilofts.co.ke',
    host: 'internal.railway.app',
  }));

  assert.equal(callbackUrl, 'https://zurilofts.co.ke/api/auth/google/callback');
});

