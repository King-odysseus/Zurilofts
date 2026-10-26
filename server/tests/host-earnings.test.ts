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

test('the split always reconciles: guest paid equals host net plus tax plus platform revenue', () => {
  const result = calculateHostEarnings(
    { subtotal: 40000, discountAmount: 4000, extraGuestFee: 1600, cleaningFee: 1500, lateCheckoutFee: 500, serviceFee: 4800 },
    { ...ORIGINAL, commissionRate: 0.1, payCleaningFee: true, payLateCheckoutFee: true },
    WHT,
  );

  assert.equal(result.guestPaid, 44400); // 40000 + 1500 + 4800 + 500 + 1600 - 4000
  assert.equal(
    result.guestPaid,
    result.hostNet + result.withholdingTax + result.platformRevenue,
    'no money may appear or disappear in the split',
  );
});

test('under the original split the platform keeps the guest fee and the cleaning fee', () => {
  const result = calculateHostEarnings(
    { subtotal: 30000, cleaningFee: 1500, serviceFee: 3600 },
    ORIGINAL,
    WHT,
  );

  assert.equal(result.commission, 0);
  assert.equal(result.platformRevenue, 5100); // 3600 guest fee + 1500 cleaning
  assert.equal(result.hostNet, 28500); // 30000 - 5% tax
});

test('commission from the host adds to platform revenue', () => {
  const off = calculateHostEarnings({ subtotal: 30000, serviceFee: 3600 }, ORIGINAL, WHT);
  const on = calculateHostEarnings({ subtotal: 30000, serviceFee: 3600 }, { ...ORIGINAL, commissionRate: 0.1 }, WHT);

  assert.equal(on.platformRevenue - off.platformRevenue, 3000); // the 10% commission
  assert.equal(on.hostNet + 3000, off.hostNet, 'the host pays it, the guest does not');
});

test('passing the cleaning fee through moves it off platform revenue', () => {
  const kept = calculateHostEarnings({ subtotal: 30000, cleaningFee: 1500, serviceFee: 3600 }, ORIGINAL, WHT);
  const passed = calculateHostEarnings(
    { subtotal: 30000, cleaningFee: 1500, serviceFee: 3600 },
    { ...ORIGINAL, payCleaningFee: true },
    WHT,
  );

  assert.equal(kept.platformRevenue - passed.platformRevenue, 1500);
  assert.equal(passed.platformRevenue, 3600); // just the guest service fee
});

test('a platform-funded promo shows up as the platform spending money', () => {
  const funded = calculateHostEarnings(
    { subtotal: 30000, discountAmount: 3000, serviceFee: 3600 },
    { ...ORIGINAL, platformFundsPromo: true },
    WHT,
  );

  // Guest paid 30000 - 3000 + 3600; host still gets the full 30000 less tax, so
  // the 3000 discount comes out of the platform's own fee.
  assert.equal(funded.guestPaid, 30600);
  assert.equal(funded.hostNet, 28500);
  assert.equal(funded.platformRevenue, 600); // 3600 guest fee - 3000 absorbed
});
