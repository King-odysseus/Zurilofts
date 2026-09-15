/**
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/remember-me.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { refreshLifetimeMs } from '../src/services/auth.service.js';
import { refreshCookieOptions } from '../src/controllers/auth.controller.js';

test('a remembered session lives 7 days', () => {
  assert.equal(refreshLifetimeMs(true), 7 * 24 * 60 * 60 * 1000);
});

test('an unremembered session is capped at 24 hours as a server-side backstop', () => {
  assert.equal(refreshLifetimeMs(false), 24 * 60 * 60 * 1000);
});

test('a remembered cookie carries a 7-day maxAge', () => {
  const options = refreshCookieOptions(true);
  assert.equal(options.maxAge, 7 * 24 * 60 * 60 * 1000);
});

test('an unremembered cookie has no maxAge, so the browser treats it as a session cookie', () => {
  const options = refreshCookieOptions(false);
  assert.equal('maxAge' in options, false);
});

test('both cookie variants keep the shared security attributes', () => {
  for (const persistent of [true, false]) {
    const options = refreshCookieOptions(persistent);
    assert.equal(options.httpOnly, true);
    assert.equal(options.sameSite, 'lax');
    assert.equal(options.path, '/api/auth');
  }
});
