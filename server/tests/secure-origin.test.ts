/**
 * Run from server/:
 *   node --import tsx --test tests/secure-origin.test.ts
 *
 * The server refuses to boot in production when a configured origin is plain
 * http. That rule exists because the refresh cookie is only marked Secure in
 * production, so an http origin puts sessions, identity documents and payout
 * bank details on the wire in clear text.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findPlainHttpOrigins } from '../src/utils/secureOrigin.js';

test('an https origin is accepted', () => {
  assert.deepEqual(findPlainHttpOrigins('https://thezurilofts.com'), []);
});

test('a plain http origin off localhost is reported', () => {
  assert.deepEqual(findPlainHttpOrigins('http://thezurilofts.com'), ['http://thezurilofts.com']);
});

test('localhost over http is allowed, because the server falls back to the request origin', () => {
  assert.deepEqual(findPlainHttpOrigins('http://localhost:5173'), []);
  assert.deepEqual(findPlainHttpOrigins('http://127.0.0.1:4000'), []);
  // The shipped dev value in .env and .env.example must never block a boot.
  assert.deepEqual(findPlainHttpOrigins('http://localhost:5173', 'http://localhost:5173'), []);
});

test('one bad origin in a comma-separated CORS list is still caught', () => {
  assert.deepEqual(
    findPlainHttpOrigins('https://thezurilofts.com', 'https://thezurilofts.com, http://old.thezurilofts.com'),
    ['http://old.thezurilofts.com'],
  );
});

test('an unset or empty value is not treated as insecure', () => {
  assert.deepEqual(findPlainHttpOrigins(undefined, '', '  '), []);
});

test('a missing scheme is not silently accepted as secure', () => {
  // A bare host or a protocol-relative value is a misconfiguration too: it is
  // not https, so links and redirects built from it would not be.
  assert.deepEqual(findPlainHttpOrigins('thezurilofts.com'), ['thezurilofts.com']);
  assert.deepEqual(findPlainHttpOrigins('//thezurilofts.com'), ['//thezurilofts.com']);
});

test('a lookalike host is not mistaken for localhost', () => {
  assert.deepEqual(
    findPlainHttpOrigins('http://localhost.evil.com'),
    ['http://localhost.evil.com'],
  );
});
