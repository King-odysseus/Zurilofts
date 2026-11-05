/**
 * Behaviour tests for who may receive marketing push messages.
 *
 * Consent is an append-only trail, so the question is always "what did this
 * person choose most recently". Records are passed newest first, as the query
 * returns them.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/marketing-consent.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { marketingOptInUserIds } from '../src/services/consent.service.js';

test('a user whose latest choice is yes is opted in', () => {
  const optedIn = marketingOptInUserIds([{ userId: 'a', marketing: true }]);
  assert.deepEqual([...optedIn], ['a']);
});

test('a later no beats an earlier yes', () => {
  const optedIn = marketingOptInUserIds([
    { userId: 'a', marketing: false }, // newest
    { userId: 'a', marketing: true },
  ]);
  assert.equal(optedIn.has('a'), false);
});

test('a later yes beats an earlier no', () => {
  const optedIn = marketingOptInUserIds([
    { userId: 'a', marketing: true }, // newest
    { userId: 'a', marketing: false },
  ]);
  assert.equal(optedIn.has('a'), true);
});

test('the sign-up record, which defaults to no, keeps a new account out', () => {
  const optedIn = marketingOptInUserIds([{ userId: 'new-user', marketing: false }]);
  assert.equal(optedIn.size, 0);
});

test('anonymous records and users with no record are never opted in', () => {
  const optedIn = marketingOptInUserIds([
    { userId: null, marketing: true },
    { userId: 'a', marketing: true },
  ]);
  assert.deepEqual([...optedIn], ['a']);
  assert.equal(optedIn.has('someone-with-no-record'), false);
});

test('each user is decided on their own records', () => {
  const optedIn = marketingOptInUserIds([
    { userId: 'a', marketing: true },
    { userId: 'b', marketing: false },
    { userId: 'a', marketing: false },
    { userId: 'b', marketing: true },
  ]);
  assert.equal(optedIn.has('a'), true);
  assert.equal(optedIn.has('b'), false);
});
