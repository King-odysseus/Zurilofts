/**
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" NODE_ENV=production node --import tsx --test tests/public-url.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  clientUrlForRequest,
  googleCallbackUrlForRequest,
  publicOriginForCrawlers,
  requestOrigin,
} from '../src/utils/publicUrl.js';
import { env } from '../src/config/env.js';

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

test('Google callback env pasted as KEY=value is normalized to only the URL', () => {
  const original = env.GOOGLE_CALLBACK_URL;
  env.GOOGLE_CALLBACK_URL = 'GOOGLE_CALLBACK_URL = https://thezurilofts.com/api/auth/google/callback';
  try {
    const callbackUrl = googleCallbackUrlForRequest(req({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'thezurilofts.com',
      host: 'internal.railway.app',
    }));

    assert.equal(callbackUrl, 'https://thezurilofts.com/api/auth/google/callback');
  } finally {
    env.GOOGLE_CALLBACK_URL = original;
  }
});

test('a configured public CLIENT_URL wins over a forged request host', () => {
  // Canonical links, og:url and the sitemap are read by crawlers and caches. The
  // Host header is whatever the requester typed, so the configured address is the
  // only answer that cannot be pointed at an attacker's domain.
  const original = env.CLIENT_URL;
  env.CLIENT_URL = 'https://thezurilofts.com';
  try {
    const origin = publicOriginForCrawlers(req({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'evil.example',
      host: 'internal.railway.app',
    }));

    assert.equal(origin, 'https://thezurilofts.com');
  } finally {
    env.CLIENT_URL = original;
  }
});

test('a local CLIENT_URL falls back to the request origin', () => {
  // Development has no public address, so the request is all there is.
  const original = env.CLIENT_URL;
  env.CLIENT_URL = 'http://localhost:5173';
  try {
    const origin = publicOriginForCrawlers(req({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'zurilofts.co.ke',
    }));

    assert.equal(origin, 'https://zurilofts.co.ke');
  } finally {
    env.CLIENT_URL = original;
  }
});

test('client URL env pasted as KEY=value is normalized to only the URL', () => {
  const original = env.CLIENT_URL;
  env.CLIENT_URL = 'CLIENT_URL=https://thezurilofts.com';
  try {
    const clientUrl = clientUrlForRequest(req({
      'x-forwarded-proto': 'https',
      'x-forwarded-host': 'thezurilofts.com',
      host: 'internal.railway.app',
    }));

    assert.equal(clientUrl, 'https://thezurilofts.com');
  } finally {
    env.CLIENT_URL = original;
  }
});
