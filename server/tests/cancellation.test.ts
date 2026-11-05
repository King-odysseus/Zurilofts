/**
 * The cancellation policy: the numbers the checkout shows and the booking keeps.
 *
 * Two things are being pinned here. First, the arithmetic, because the edges are
 * where a guest and the company disagree about money: the day a full refund
 * stops being available, and which Nairobi day "today" is when the guest is
 * cancelling at 1am. Second, that the published Terms still say what this code
 * enforces, because a policy shown at checkout that contradicts the contract is
 * worse than showing nothing at all.
 *
 * Run from server/:
 *   node --import tsx --test tests/cancellation.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CANCELLATION_POLICY_VERSION,
  FULL_REFUND_DAYS_BEFORE_CHECK_IN,
  HALF_REFUND_DAYS_BEFORE_CHECK_IN,
  cancellationTerms,
  cancellationTierFor,
  daysBeforeCheckIn,
} from '../src/utils/cancellation.js';

const SERVER_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const REPO_ROOT = join(SERVER_ROOT, '..');
const SERVICE_SOURCE = readFileSync(join(SERVER_ROOT, 'src/services/booking.service.ts'), 'utf8');
const TERMS_SOURCE = readFileSync(join(REPO_ROOT, 'src/i18n/domains/legal-terms.js'), 'utf8');

/** A Nairobi morning, so the tests are not reading the clock of the machine. */
const NOON_NAIROBI = new Date('2026-11-05T09:00:00Z'); // 12:00 EAT

// ---------------------------------------------------------------------------
// Tiers
// ---------------------------------------------------------------------------

test('the three bands meet where the Terms say they do', () => {
  // "More than 14 days" is 15 or more, because on the 14th day the guest is
  // exactly 14 days away, which the Terms put inside the 50% band.
  assert.equal(cancellationTierFor(15).code, 'FULL');
  assert.equal(cancellationTierFor(14).code, 'HALF');
  assert.equal(cancellationTierFor(7).code, 'HALF');
  assert.equal(cancellationTierFor(6).code, 'NONE');
});

test('a cancellation long before check-in returns the nightly rate and the cleaning fee', () => {
  const tier = cancellationTierFor(30);

  assert.equal(tier.nightlyRateRefundPercent, 100);
  assert.equal(tier.cleaningFeeRefundable, true);
});

test('the middle band returns half the nightly rate and nothing else', () => {
  const tier = cancellationTierFor(10);

  assert.equal(tier.nightlyRateRefundPercent, 50);
  // The Terms make the cleaning fee refundable only in the top band, so a
  // checkout that implied otherwise would be promising money back that is not.
  assert.equal(tier.cleaningFeeRefundable, false);
});

test('inside a week, and after check-in, nothing is returned', () => {
  for (const days of [6, 1, 0, -3]) {
    const tier = cancellationTierFor(days);
    assert.equal(tier.code, 'NONE', `${days} days before check-in must not be refundable`);
    assert.equal(tier.nightlyRateRefundPercent, 0);
    assert.equal(tier.cleaningFeeRefundable, false);
  }
});

// ---------------------------------------------------------------------------
// Counting the days
// ---------------------------------------------------------------------------

test('days before check-in counts calendar days, not hours', () => {
  // 09:00 in Nairobi, check-in on the 12th: today, tomorrow, then ten more.
  assert.equal(daysBeforeCheckIn('2026-11-05', NOON_NAIROBI), 0);
  assert.equal(daysBeforeCheckIn('2026-11-06', NOON_NAIROBI), 1);
  assert.equal(daysBeforeCheckIn('2026-11-12', NOON_NAIROBI), 7);
});

test('the count survives a month and a year boundary', () => {
  assert.equal(daysBeforeCheckIn('2026-12-02', new Date('2026-11-28T09:00:00Z')), 4);
  assert.equal(daysBeforeCheckIn('2027-01-02', new Date('2026-12-28T09:00:00Z')), 5);
});

test('the day is the Nairobi day, so a late-night cancellation is judged on the right date', () => {
  // 21:30 UTC is 00:30 the next morning in Nairobi. Read as UTC the guest would
  // still have 15 days and a full refund; in Nairobi they are on the 14th day,
  // which is the 50% band. The tighter answer is the one the Terms describe.
  const lateEveningUtc = new Date('2026-11-05T21:30:00Z');

  assert.equal(daysBeforeCheckIn('2026-11-20', lateEveningUtc), 14);
  assert.equal(cancellationTerms('2026-11-20', lateEveningUtc).tier.code, 'HALF');
});

test('a date that is not a real date is refused rather than silently treated as today', () => {
  assert.throws(() => daysBeforeCheckIn('not a date', NOON_NAIROBI), RangeError);
  assert.throws(() => cancellationTerms('2026-02-31', NOON_NAIROBI), RangeError);
});

// ---------------------------------------------------------------------------
// The deadlines the checkout prints
// ---------------------------------------------------------------------------

test('the deadlines name the last day each window is open', () => {
  const terms = cancellationTerms('2026-12-18', NOON_NAIROBI);

  // 18 December minus 15 days, then minus 7 days.
  assert.equal(terms.fullRefundUntil, '2026-12-03');
  assert.equal(terms.halfRefundUntil, '2026-12-11');
});

test('the deadline dates follow the check-in date across a month end', () => {
  const terms = cancellationTerms('2027-01-05', NOON_NAIROBI);

  assert.equal(terms.fullRefundUntil, '2026-12-21');
  assert.equal(terms.halfRefundUntil, '2026-12-29');
});

test('the last day of each window is still inside it', () => {
  // A guest cancelling on the printed date must get exactly what the checkout
  // promised on that date, not the band below it.
  const full = cancellationTerms('2026-12-18', NOON_NAIROBI);
  assert.equal(cancellationTerms('2026-12-18', new Date(`${full.fullRefundUntil}T09:00:00Z`)).tier.code, 'FULL');

  const half = cancellationTerms('2026-12-18', NOON_NAIROBI);
  assert.equal(cancellationTerms('2026-12-18', new Date(`${half.halfRefundUntil}T09:00:00Z`)).tier.code, 'HALF');
});

test('the version is a policy date, so two policies can never share one', () => {
  assert.match(CANCELLATION_POLICY_VERSION, /^\d{4}-\d{2}-\d{2}$/);
  // It is recorded with every quote, which is how the checkout and the booking
  // agree on which policy was shown.
  assert.equal(cancellationTerms('2026-12-18', NOON_NAIROBI).policyVersion, CANCELLATION_POLICY_VERSION);
});

// ---------------------------------------------------------------------------
// What the rest of the app has to keep doing
// ---------------------------------------------------------------------------

test('a booking records the policy version it was made under', () => {
  // Without this the terms a guest agreed to are whatever the policy says when
  // the dispute arrives, which is the thing the column exists to prevent.
  assert.ok(
    SERVICE_SOURCE.includes('cancellationPolicyVersion: CANCELLATION_POLICY_VERSION'),
    'booking.service.ts must stamp the policy version on the booking',
  );
});

test('the quote carries the terms, so the checkout does not compute its own', () => {
  assert.ok(
    SERVICE_SOURCE.includes('cancellation: cancellationTerms('),
    'quoteBooking must return the cancellation terms with the price',
  );
});

test('the published Terms still describe the bands this code enforces', () => {
  // A change to the numbers above without the same change to the contract would
  // make the checkout promise something the Terms do not. This is the link.
  const english = TERMS_SOURCE.split('sw:')[0];

  assert.ok(
    english.includes(`More than ${FULL_REFUND_DAYS_BEFORE_CHECK_IN} days before check-in`),
    'Terms must still open the full refund at the same number of days',
  );
  assert.ok(
    english.includes(`${HALF_REFUND_DAYS_BEFORE_CHECK_IN}-${FULL_REFUND_DAYS_BEFORE_CHECK_IN} days before check-in`),
    'Terms must still describe the middle band with the same two numbers',
  );
  assert.ok(
    english.includes(`Less than ${HALF_REFUND_DAYS_BEFORE_CHECK_IN} days before check-in`),
    'Terms must still close the refund window at the same number of days',
  );
});

test('the Terms still say the service fee is never refunded', () => {
  // The checkout says this in its own words, so the contract has to agree.
  assert.ok(/Service Fee is non-refundable/.test(TERMS_SOURCE));
});
