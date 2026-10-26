/**
 * Behaviour tests for what a host is actually paid.
 *
 * These pin the money split: commission is charged on accommodation only, the
 * guest's cleaning and late check-out fees can be passed through, and a promo
 * discount is either the host's cost or the platform's. Getting one of these
 * wrong pays a host the wrong amount, so add a case before changing a rule.
 *
 * Run from server/:
 *   node --import tsx --test tests/host-earnings.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  calculateHostEarnings,
  type HostEarningPolicy,
} from '../src/utils/hostEarnings.js';

/** Kenya's 5% withholding tax on rental income, as a fraction. */
const WHT = 0.05;

/** The split that shipped before commission existed: host carries the promo,
 *  and cleaning / late fees stay with the platform. */
const ORIGINAL: HostEarningPolicy = {
  commissionRate: 0,
  payCleaningFee: false,
  payLateCheckoutFee: false,
  platformFundsPromo: false,
};

test('the original split is unchanged when every new rule is off', () => {
  const result = calculateHostEarnings(
    { subtotal: 30000, discountAmount: 3000, extraGuestFee: 0, cleaningFee: 1500, lateCheckoutFee: 0 },
    ORIGINAL,
    WHT,
  );

  // Discount comes off the host's share, cleaning fee stays with the platform.
  assert.equal(result.hostFundedDiscount, 3000);
  assert.equal(result.hostGross, 27000);
  assert.equal(result.commission, 0);
  assert.equal(result.withholdingTax, 1350); // 5% of 27000
  assert.equal(result.hostNet, 25650);
});

test('commission is charged on accommodation only, never on pass-through fees', () => {
  const result = calculateHostEarnings(
    { subtotal: 30000, extraGuestFee: 0, cleaningFee: 1500, lateCheckoutFee: 2500 },
    { ...ORIGINAL, commissionRate: 0.1, payCleaningFee: true, payLateCheckoutFee: true },
    WHT,
  );

  assert.equal(result.commission, 3000); // 10% of 30000, not of 34000
  assert.equal(result.hostGross, 34000);
  assert.equal(result.withholdingTax, 1500); // still 5% of accommodation only
  assert.equal(result.hostNet, 34000 - 3000 - 1500);
});

test('cleaning and late check-out fees reach the host when enabled', () => {
  const off = calculateHostEarnings(
    { subtotal: 20000, cleaningFee: 1500, lateCheckoutFee: 2500 },
    ORIGINAL,
    WHT,
  );
  const on = calculateHostEarnings(
    { subtotal: 20000, cleaningFee: 1500, lateCheckoutFee: 2500 },
    { ...ORIGINAL, payCleaningFee: true, payLateCheckoutFee: true },
    WHT,
  );

  assert.equal(on.hostNet - off.hostNet, 4000);
  // Passing a fee through must not change what the host owes KRA.
  assert.equal(on.withholdingTax, off.withholdingTax);
});

test('a platform-funded promo does not reduce the host payout', () => {
  const funded = calculateHostEarnings(
    { subtotal: 30000, discountAmount: 3000 },
    { ...ORIGINAL, platformFundsPromo: true },
    WHT,
  );
  const hostFunded = calculateHostEarnings(
    { subtotal: 30000, discountAmount: 3000 },
    ORIGINAL,
    WHT,
  );

  assert.equal(funded.hostFundedDiscount, 0);
  assert.equal(funded.hostGross, 30000);
  assert.equal(hostFunded.hostGross, 27000);
});

test("a host's own promo code still comes out of that host's payout", () => {
  const result = calculateHostEarnings(
    { subtotal: 30000, discountAmount: 3000, promoOwnerHostId: 'host_123' },
    { ...ORIGINAL, platformFundsPromo: true },
    WHT,
  );

  assert.equal(result.hostFundedDiscount, 3000);
  assert.equal(result.hostGross, 27000);
});

test('a discount larger than the stay is capped at the subtotal', () => {
  const result = calculateHostEarnings(
    { subtotal: 5000, discountAmount: 999999, cleaningFee: 1500 },
    { ...ORIGINAL, commissionRate: 0.5, payCleaningFee: true },
    WHT,
  );

  // Only the accommodation is discounted; the pass-through cleaning fee is
  // still owed, and commission on a zero accommodation subtotal is zero.
  assert.equal(result.hostFundedDiscount, 5000);
  assert.equal(result.commission, 0);
  assert.equal(result.hostGross, 1500);
  assert.equal(result.hostNet, 1500);
});

test('a misconfigured rate cannot pay more than the stay was worth', () => {
  const result = calculateHostEarnings(
    { subtotal: 10000 },
    { ...ORIGINAL, commissionRate: 1 },
    WHT,
  );

  // 100% commission plus tax would be negative; the host payout floors at 0.
  assert.equal(result.hostNet, 0);
});
