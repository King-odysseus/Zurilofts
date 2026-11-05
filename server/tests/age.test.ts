/**
 * Behaviour tests for the 18+ rule used at sign-up, booking and payment.
 *
 * Run from server/:
 *   node --import tsx --test tests/age.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isAdultOn, parseDateOfBirth } from '../src/utils/age.js';

const TODAY = new Date('2026-11-05T10:00:00Z');

test('someone who turned 18 yesterday, today or earlier is an adult', () => {
  assert.equal(isAdultOn('2008-11-04', TODAY), true);
  assert.equal(isAdultOn('2008-11-05', TODAY), true);
  assert.equal(isAdultOn('1990-01-01', TODAY), true);
});

test('someone who turns 18 tomorrow is still a minor today', () => {
  assert.equal(isAdultOn('2008-11-06', TODAY), false);
  assert.equal(isAdultOn('2015-05-05', TODAY), false);
});

test('a missing, blank or malformed date is never an adult', () => {
  for (const value of [undefined, null, '', '05/11/1990', '1990-1-1', 19900101, {}]) {
    assert.equal(isAdultOn(value, TODAY), false, `${String(value)} must not pass`);
  }
});

test('a date that does not exist on the calendar is rejected, not rolled over', () => {
  assert.equal(parseDateOfBirth('1990-02-31'), null);
  assert.equal(isAdultOn('1990-02-31', TODAY), false);
  assert.equal(parseDateOfBirth('1990-13-01'), null);
});

test('a leap-day birthday becomes an adult on 1 March in a non-leap year', () => {
  // Born 2008-02-29: 18th birthday falls in 2026, a non-leap year.
  assert.equal(isAdultOn('2008-02-29', new Date('2026-02-28T12:00:00Z')), false);
  assert.equal(isAdultOn('2008-02-29', new Date('2026-03-01T12:00:00Z')), true);
});
