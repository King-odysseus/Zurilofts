/**
 * Eligibility, public-serialization/privacy, and aggregate tests for reviews.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/review.privacy.test.ts
 *
 * These exercise the pure helpers only - no database is touched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertReviewEligibility,
  toPublicReview,
  computeReviewAggregate,
  type ReviewEligibilityBooking,
} from '../src/services/review.service.js';

const CALLER = 'user-1';
const NOW = new Date('2026-08-09T00:00:00Z');
const PAST = new Date('2026-08-01T00:00:00Z');
const FUTURE = new Date('2026-09-01T00:00:00Z');

function eligibleBooking(overrides: Partial<ReviewEligibilityBooking> = {}): ReviewEligibilityBooking {
  return {
    userId: CALLER,
    status: 'CONFIRMED',
    paidAt: PAST,
    checkOut: PAST,
    review: null,
    ...overrides,
  };
}

// ---- Eligibility ----

test('a confirmed, paid, ended, un-reviewed booking is eligible', () => {
  assert.doesNotThrow(() => assertReviewEligibility(eligibleBooking(), CALLER, NOW));
});

test('a missing booking is rejected as not found', () => {
  assert.throws(() => assertReviewEligibility(null, CALLER, NOW), /not found/i);
});

test("another user's booking is rejected as not found", () => {
  assert.throws(
    () => assertReviewEligibility(eligibleBooking({ userId: 'someone-else' }), CALLER, NOW),
    /not found/i,
  );
});

test('non-CONFIRMED statuses are rejected', () => {
  for (const status of ['PENDING', 'CANCELLED', 'CONFLICT']) {
    assert.throws(
      () => assertReviewEligibility(eligibleBooking({ status }), CALLER, NOW),
      /confirmed stay/i,
      `status ${status} should be rejected`,
    );
  }
});

test('an unpaid booking is rejected even when confirmed and ended', () => {
  assert.throws(
    () => assertReviewEligibility(eligibleBooking({ paidAt: null }), CALLER, NOW),
    /paid/i,
  );
});

test('a future / not-yet-ended stay is rejected', () => {
  assert.throws(
    () => assertReviewEligibility(eligibleBooking({ checkOut: FUTURE }), CALLER, NOW),
    /after your stay has ended/i,
  );
});

test('a booking that was already reviewed is rejected', () => {
  assert.throws(
    () => assertReviewEligibility(eligibleBooking({ review: { id: 'r-1' } }), CALLER, NOW),
    /already reviewed/i,
  );
});

// ---- Public serialization / privacy ----

test('toPublicReview exposes only the allowlisted fields', () => {
  const row = {
    id: 'r-1',
    rating: 5,
    publicComment: 'Lovely stay',
    createdAt: PAST,
    hidden: false,
    // Private / internal fields that must never leak:
    privateNote: 'the wifi was slow, fix it',
    satisfaction: 'unhappy',
    userId: 'user-1',
    bookingId: 'b-1',
    propertyId: 'p-1',
    booking: { total: 50000, paidAt: PAST },
    user: { firstName: 'Ada', lastName: 'Lovelace', email: 'ada@example.com' },
  };

  const pub = toPublicReview(row);

  assert.deepEqual(pub, {
    id: 'r-1',
    rating: 5,
    publicComment: 'Lovely stay',
    createdAt: PAST,
    user: { firstName: 'Ada', lastName: 'Lovelace' },
  });

  // Explicitly assert nothing private survived serialization.
  const serialized = JSON.stringify(pub);
  for (const leak of ['privateNote', 'satisfaction', 'email', 'bookingId', 'propertyId', 'userId', 'total', 'paidAt', 'hidden']) {
    assert.ok(!serialized.includes(leak), `serialized public review must not contain "${leak}"`);
  }
});

test('toPublicReview null-safes a missing comment and user', () => {
  const pub = toPublicReview({ id: 'r-2', rating: 4, createdAt: PAST });
  assert.equal(pub.publicComment, null);
  assert.equal(pub.user, null);
});

// ---- Aggregate recalculation ----

test('computeReviewAggregate averages, counts, and buckets ratings', () => {
  const agg = computeReviewAggregate([5, 5, 4, 3, 1]);
  assert.equal(agg.totalReviews, 5);
  assert.equal(agg.averageRating, 3.6); // 18 / 5 = 3.6
  assert.deepEqual(agg.distribution, [
    { stars: 5, count: 2 },
    { stars: 4, count: 1 },
    { stars: 3, count: 1 },
    { stars: 2, count: 0 },
    { stars: 1, count: 1 },
  ]);
});

test('computeReviewAggregate rounds the average to one decimal', () => {
  // 5 + 4 + 4 = 13 / 3 = 4.333... -> 4.3
  assert.equal(computeReviewAggregate([5, 4, 4]).averageRating, 4.3);
});

test('computeReviewAggregate returns zeros for no visible reviews', () => {
  const agg = computeReviewAggregate([]);
  assert.equal(agg.totalReviews, 0);
  assert.equal(agg.averageRating, 0);
  assert.deepEqual(
    agg.distribution.map((d) => d.count),
    [0, 0, 0, 0, 0],
  );
});
