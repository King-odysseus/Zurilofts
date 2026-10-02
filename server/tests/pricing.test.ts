/**
 * Behaviour tests for the shared pricing engine.
 *
 * These pin the numbers a guest is actually charged: nights, seasonal rates,
 * the extra-guest surcharge, late check-out, and promo discounts. The checkout
 * quote endpoint and the booking service both price through this module, so a
 * change here changes money - add a case before altering a rate.
 *
 * Run from server/:
 *   node --import tsx --test tests/pricing.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  CLEANING_FEE,
  SERVICE_FEE_RATE,
  EXTRA_GUEST_FEE_PER_NIGHT,
  LATE_CHECKOUT_FULL_NIGHT_HOURS,
  calculateNights,
  priceForNight,
  computeSubtotal,
  computeExtraGuestFee,
  lateCheckoutFee,
  lateCheckoutOptions,
  calculateFees,
  calculatePricing,
  computeDiscountAmount,
} from '../src/utils/pricing.js';

const checkIn = new Date('2026-06-01T00:00:00.000Z');
const threeNights = new Date('2026-06-04T00:00:00.000Z');

test('published rates are unchanged', () => {
  // If one of these breaks, the UI copy quoting these numbers is now wrong too
  // (BookingPage and the property page both print the per-night guest fee).
  assert.equal(EXTRA_GUEST_FEE_PER_NIGHT, 800);
  assert.equal(CLEANING_FEE, 1500);
  assert.equal(SERVICE_FEE_RATE, 0.12);
  assert.equal(LATE_CHECKOUT_FULL_NIGHT_HOURS, 3);
});

test('calculateNights counts whole nights and never returns 0', () => {
  assert.equal(calculateNights(checkIn, threeNights), 3);
  // A same-day or part-day range still bills one night, so a caller can never
  // produce a free stay by picking identical dates.
  assert.equal(calculateNights(checkIn, new Date('2026-06-01T12:00:00.000Z')), 1);
  assert.equal(calculateNights(checkIn, checkIn), 1);
});

test('priceForNight prefers the seasonal rule covering that night', () => {
  const rules = [{ start: '2026-06-02T00:00:00.000Z', end: '2026-06-03T00:00:00.000Z', price: 20000 }];

  // Rule window is start-inclusive, end-exclusive.
  assert.equal(priceForNight(new Date('2026-06-02T00:00:00.000Z'), 10000, rules), 20000);
  assert.equal(priceForNight(new Date('2026-06-03T00:00:00.000Z'), 10000, rules), 10000);
  assert.equal(priceForNight(new Date('2026-06-01T00:00:00.000Z'), 10000, rules), 10000);
});

test('computeSubtotal applies a seasonal rule to only the nights it covers', () => {
  const rules = [{ start: '2026-06-02T00:00:00.000Z', end: '2026-06-03T00:00:00.000Z', price: 20000 }];

  // 10,000 + 20,000 + 10,000
  assert.equal(computeSubtotal(checkIn, 3, 10000, rules), 40000);
  assert.equal(computeSubtotal(checkIn, 3, 10000, []), 30000);
});

test('computeExtraGuestFee charges per extra guest per night, by bed option', () => {
  // 1-bed sleeps 2, 2-bed sleeps 4; the extra guest pays each night.
  assert.equal(computeExtraGuestFee(2, '1bed', 3), 0);
  assert.equal(computeExtraGuestFee(3, '1bed', 3), 2400);
  assert.equal(computeExtraGuestFee(6, '1bed', 3), 9600);
  assert.equal(computeExtraGuestFee(4, '2bed', 3), 0);
  assert.equal(computeExtraGuestFee(5, '2bed', 3), 2400);
  // An unknown bed option falls back to the 1-bed capacity rather than free guests.
  assert.equal(computeExtraGuestFee(3, null, 1), 800);
});

test('lateCheckoutFee is free at 10:00 and doubles each hour up to one night', () => {
  assert.equal(lateCheckoutFee('10:00', 10000), 0);
  assert.equal(lateCheckoutFee(null, 10000), 0);
  assert.equal(lateCheckoutFee('09:00', 10000), 0);
  assert.equal(lateCheckoutFee('11:00', 10000), 2500); // 1h late = quarter night
  assert.equal(lateCheckoutFee('12:00', 10000), 5000); // 2h late = half night
  assert.equal(lateCheckoutFee('13:00', 10000), 10000); // 3h late = full night
  // Past the 3h cap the fee stops growing: the guest is charged a night, not more.
  assert.equal(lateCheckoutFee('14:00', 10000), 10000);
});

test('calculateFees adds cleaning and the 12% service fee, then applies the discount', () => {
  const fees = calculateFees(30000, 10);
  assert.equal(fees.subtotal, 30000);
  assert.equal(fees.cleaningFee, 1500);
  assert.equal(fees.serviceFee, 3600);
  assert.equal(fees.discountAmount, 3000);
  assert.equal(fees.total, 32100);
});

test('calculatePricing and calculateFees agree for a flat-rate stay', () => {
  // This parity is what lets one quote serve both flat and seasonal stays: a
  // seasonal subtotal is just computeSubtotal fed into calculateFees.
  assert.deepEqual(calculatePricing(10000, 3, 10, null), calculateFees(30000, 10, null));
  assert.deepEqual(calculatePricing(10000, 3), calculateFees(30000));
});

test('lateCheckoutOptions lists every pickable check-out time with its fee', () => {
  const options = lateCheckoutOptions(10000);
  assert.deepEqual(options.map((option) => option.time), ['10:00', '11:00', '12:00', '13:00']);
  assert.deepEqual(options.map((option) => option.fee), [0, 2500, 5000, 10000]);
  // Every published fee must equal what the booking is actually charged.
  for (const option of options) {
    assert.equal(option.fee, lateCheckoutFee(option.time, 10000));
  }
});
test('computeDiscountAmount applies the percentage and honours the cap', () => {
  assert.equal(computeDiscountAmount(30000, 0), 0);
  assert.equal(computeDiscountAmount(30000, 10), 3000);
  assert.equal(computeDiscountAmount(30000, 10, 2000), 2000); // capped down
  assert.equal(computeDiscountAmount(30000, 10, 5000), 3000); // cap not reached
  assert.equal(computeDiscountAmount(33333, 10), 3333); // rounded to whole KES
  // A percent with no maxDiscount must not be treated as a zero cap.
  assert.equal(computeDiscountAmount(30000, 10, null), 3000);
  assert.equal(computeDiscountAmount(30000, 10, undefined), 3000);
});
