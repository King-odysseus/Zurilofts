/**
 * Referral programme rules.
 *
 * These decide whether real money is credited to a real host, so they are pinned
 * here with no database and no network: a mistake either pays a stranger or pays
 * twice. The pure helpers are imported directly; the async functions are covered
 * by their callers' integration points, not here.
 *
 * Run from server/:
 *   node --import tsx --test tests/referral.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatReferralCode,
  normaliseReferralCode,
  parseRewardKes,
  planReferralCredit,
  referralCountsForPayout,
} from '../src/services/referral.service.js';

// ---------------------------------------------------------------
// Reading a typed code
// ---------------------------------------------------------------

test('a typed code is uppercased and trimmed, so a share link is not case sensitive', () => {
  assert.equal(normaliseReferralCode('  zuri-4f2a  '), 'ZURI-4F2A');
});

test('stray symbols are stripped rather than rejecting the whole code', () => {
  assert.equal(normaliseReferralCode('ZURI 4F2A!'), 'ZURI4F2A');
});

test('anything too short to be a real code is refused', () => {
  // A three-character value is far more likely a typo than a shared code.
  assert.equal(normaliseReferralCode('ABC'), null);
  assert.equal(normaliseReferralCode(''), null);
});

test('a non-string is refused instead of being coerced into a code', () => {
  assert.equal(normaliseReferralCode(undefined), null);
  assert.equal(normaliseReferralCode(null), null);
  assert.equal(normaliseReferralCode(12345), null);
  assert.equal(normaliseReferralCode({ code: 'ZURI-4F2A' }), null);
});

test('a very long paste is cut to the stored length instead of failing', () => {
  const code = normaliseReferralCode('x'.repeat(200));
  assert.equal(code?.length, 24);
});

// ---------------------------------------------------------------
// Generating a code
// ---------------------------------------------------------------

test('a code carries the prefix and is the documented length', () => {
  const code = formatReferralCode([0, 1, 2, 3, 4, 5]);
  assert.match(code, /^ZURI-[A-Z0-9]{6}$/);
});

test('generated codes avoid the characters people mistype when reading aloud', () => {
  // I, O, 0 and 1 are excluded so a code read over the phone still works.
  const code = formatReferralCode([0, 0, 0, 0, 0, 0]);
  const body = code.replace('ZURI-', '');
  for (const banned of ['I', 'O', '0', '1']) {
    assert.equal(body.includes(banned), false, `body must not contain ${banned}`);
  }
});

test('short random input still produces a full code rather than undefined characters', () => {
  assert.match(formatReferralCode([7]), /^ZURI-[A-Z0-9]{6}$/);
  assert.match(formatReferralCode([]), /^ZURI-[A-Z0-9]{6}$/);
});

test('the same bytes always produce the same code', () => {
  assert.equal(formatReferralCode([9, 9, 9, 9, 9, 9]), formatReferralCode([9, 9, 9, 9, 9, 9]));
});

// ---------------------------------------------------------------
// The reward amount
// ---------------------------------------------------------------

test('the shipped default of 0 switches the bonus off', () => {
  assert.equal(parseRewardKes('0'), 0);
});

test('a reward is a whole number of shillings', () => {
  assert.equal(parseRewardKes('500.9'), 500);
  assert.equal(parseRewardKes(1500), 1500);
});

test('nonsense and negative rewards switch the bonus off rather than charging a host', () => {
  assert.equal(parseRewardKes('-500'), 0);
  assert.equal(parseRewardKes('abc'), 0);
  assert.equal(parseRewardKes(undefined), 0);
  assert.equal(parseRewardKes(Number.NaN), 0);
});

// ---------------------------------------------------------------
// Whether a referral pays
// ---------------------------------------------------------------

const payable = {
  awardKes: 1000,
  referrerHostId: 'host-a',
  referredHostId: 'host-b',
  alreadyCredited: false,
  referrerSuspended: false,
};

test('a real referral between two different hosts pays', () => {
  assert.equal(planReferralCredit(payable), true);
});

test('the same referred host never pays twice', () => {
  assert.equal(planReferralCredit({ ...payable, alreadyCredited: true }), false);
});

test('a host cannot earn a reward for referring themselves', () => {
  assert.equal(planReferralCredit({ ...payable, referrerHostId: 'host-b' }), false);
});

test('a suspended referrer is not paid', () => {
  // Otherwise a blocked account keeps earning through codes already shared.
  assert.equal(planReferralCredit({ ...payable, referrerSuspended: true }), false);
});

test('a missing side of the referral is not paid', () => {
  assert.equal(planReferralCredit({ ...payable, referrerHostId: null }), false);
  assert.equal(planReferralCredit({ ...payable, referredHostId: undefined }), false);
});

test('a switched-off programme never pays, even for a valid referral', () => {
  assert.equal(planReferralCredit({ ...payable, awardKes: 0 }), false);
});

test('only an approved host can trigger a payout', () => {
  assert.equal(referralCountsForPayout('APPROVED'), true);
  // A code typed into an application that was rejected or never finished must
  // not pay the person who shared it.
  for (const status of ['DRAFT', 'SUBMITTED', 'CHANGES_REQUESTED', 'REJECTED']) {
    assert.equal(referralCountsForPayout(status), false, status);
  }
});
