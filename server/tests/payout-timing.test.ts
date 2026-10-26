/**
 * Timing rules for host money.
 *
 * A host is only paid once the stay has started, so these tests pin the release
 * decision: what unlocks, when, and - just as important - what never unlocks
 * twice. Getting this wrong either pays a host for a night that has not
 * happened or credits the same stay again.
 *
 * Run from server/:
 *   node --import tsx --test tests/payout-timing.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  computeHostPayableAt,
  isHostFundsDue,
  DEFAULT_HOST_FUNDS_HOLD_HOURS,
} from '../src/utils/payoutTiming.js';

const CHECK_IN = new Date('2026-11-10T00:00:00.000Z');
const HOUR_MS = 60 * 60 * 1000;

test('the default hold is 24 hours after check-in', () => {
  assert.equal(DEFAULT_HOST_FUNDS_HOLD_HOURS, 24);
  const payableAt = computeHostPayableAt(CHECK_IN);
  assert.equal(payableAt.getTime(), CHECK_IN.getTime() + 24 * HOUR_MS);
});

test('a zero hold pays out at check-in, not before', () => {
  const payableAt = computeHostPayableAt(CHECK_IN, 0);
  assert.equal(payableAt.getTime(), CHECK_IN.getTime());
});

test('a nonsensical hold falls back to the default instead of paying early', () => {
  const expected = CHECK_IN.getTime() + DEFAULT_HOST_FUNDS_HOLD_HOURS * HOUR_MS;
  assert.equal(computeHostPayableAt(CHECK_IN, -5).getTime(), expected);
  assert.equal(computeHostPayableAt(CHECK_IN, Number.NaN).getTime(), expected);
});

test('funds are not due before the hold has expired', () => {
  const payableAt = computeHostPayableAt(CHECK_IN);
  const justBefore = new Date(payableAt.getTime() - 1);

  assert.equal(isHostFundsDue({ status: 'CONFIRMED', hostNetAmount: 5000, hostPayableAt: payableAt }, justBefore), false);
  assert.equal(isHostFundsDue({ status: 'CONFIRMED', hostNetAmount: 5000, hostPayableAt: payableAt }, payableAt), true);
  assert.equal(isHostFundsDue({ status: 'CONFIRMED', hostNetAmount: 5000, hostPayableAt: payableAt }, new Date(payableAt.getTime() + HOUR_MS)), true);
});

test('a stay that has not been confirmed never releases money', () => {
  const now = new Date(CHECK_IN.getTime() + 7 * 24 * HOUR_MS);
  for (const status of ['PENDING', 'CANCELLED', 'CONFLICT']) {
    assert.equal(isHostFundsDue({ status, hostNetAmount: 5000, hostPayableAt: CHECK_IN }, now), false);
  }
});

test('a booking with nothing owed to the host releases nothing', () => {
  const now = new Date(CHECK_IN.getTime() + 7 * 24 * HOUR_MS);
  assert.equal(isHostFundsDue({ status: 'CONFIRMED', hostNetAmount: 0, hostPayableAt: CHECK_IN }, now), false);
  assert.equal(isHostFundsDue({ status: 'CONFIRMED', hostNetAmount: null, hostPayableAt: CHECK_IN }, now), false);
});

test('a stay releases once and then never again', () => {
  const now = new Date(CHECK_IN.getTime() + 7 * 24 * HOUR_MS);
  const alreadyReleased = {
    status: 'CONFIRMED',
    hostNetAmount: 5000,
    hostPayableAt: CHECK_IN,
    hostFundsReleasedAt: CHECK_IN,
  };
  assert.equal(isHostFundsDue(alreadyReleased, now), false);
});

test('a booking from before the hold rule is treated as already settled', () => {
  // Those rows had their host share credited at payment time, so a missing
  // payable date must never look like money still owed.
  const now = new Date(CHECK_IN.getTime() + 7 * 24 * HOUR_MS);
  assert.equal(isHostFundsDue({ status: 'CONFIRMED', hostNetAmount: 5000, hostPayableAt: null }, now), false);
});
