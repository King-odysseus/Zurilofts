/**
 * Eligibility, public-serialization/privacy, and aggregate tests for
 * host-authored guest reviews. No database is touched: these exercise the pure
 * helpers only, which is where every rule that decides what a host may see and
 * do actually lives.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/guest-review.transitions.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  assertGuestReviewEligibility,
  guestReviewEligibilityReason,
  toPublicGuestReview,
  computeGuestReviewAggregate,
  type GuestReviewEligibilityBooking,
} from '../src/services/guest-review.service.js';
import { NotFoundError, ValidationError, ConflictError } from '../src/types/index.js';

const HOST = 'host-1';
const OTHER_HOST = 'host-2';
const NOW = new Date('2026-08-09T00:00:00Z');
const PAST = new Date('2026-08-01T00:00:00Z');
const FUTURE = new Date('2026-09-01T00:00:00Z');

function bookingOwnedBy(
  overrides: Partial<GuestReviewEligibilityBooking> = {},
): GuestReviewEligibilityBooking {
  return {
    userId: 'guest-1',
    status: 'CONFIRMED',
    paidAt: PAST,
    checkOut: PAST,
    property: { hostId: HOST },
    guestReview: null,
    ...overrides,
  };
}

// ---- Eligibility ----

test('a confirmed, paid, ended, unreviewed stay is reviewable', () => {
  assert.doesNotThrow(() => assertGuestReviewEligibility(bookingOwnedBy(), HOST, NOW));
});

test('a missing booking is rejected as not found', () => {
  assert.throws(
    () => assertGuestReviewEligibility(null, HOST, NOW),
    (error: unknown) => error instanceof NotFoundError,
  );
});

test("another host's booking is rejected as not found, not as forbidden", () => {
  // 404 rather than 403 on purpose: a host must not be able to probe whether a
  // booking id belongs to somebody else.
  assert.throws(
    () => assertGuestReviewEligibility(bookingOwnedBy({ property: { hostId: OTHER_HOST } }), HOST, NOW),
    (error: unknown) => error instanceof NotFoundError && /not found/i.test(error.message),
  );
});

test('a booking whose listing was not loaded is rejected as not found', () => {
  assert.throws(
    () => assertGuestReviewEligibility(bookingOwnedBy({ property: null }), HOST, NOW),
    (error: unknown) => error instanceof NotFoundError,
  );
});

test('a stay that is not CONFIRMED is rejected', () => {
  for (const status of ['PENDING', 'CANCELLED', 'CONFLICT']) {
    assert.throws(
      () => assertGuestReviewEligibility(bookingOwnedBy({ status }), HOST, NOW),
      (error: unknown) => error instanceof ValidationError && /confirmed stay/i.test(error.message),
      `status ${status} should be rejected`,
    );
  }
});

test('an unpaid stay is rejected even when confirmed and ended', () => {
  assert.throws(
    () => assertGuestReviewEligibility(bookingOwnedBy({ paidAt: null }), HOST, NOW),
    (error: unknown) => error instanceof ValidationError && /paid/i.test(error.message),
  );
});

test('a stay that has not ended yet is rejected against a pinned clock', () => {
  assert.throws(
    () => assertGuestReviewEligibility(bookingOwnedBy({ checkOut: FUTURE }), HOST, NOW),
    (error: unknown) => error instanceof ValidationError && /stay has ended/i.test(error.message),
  );
});

test('a guest who was already reviewed for that stay is rejected as a conflict', () => {
  assert.throws(
    () => assertGuestReviewEligibility(bookingOwnedBy({ guestReview: { id: 'gr-1' } }), HOST, NOW),
    (error: unknown) => error instanceof ConflictError && /already reviewed/i.test(error.message),
  );
});

test('eligibility reasons follow the check order', () => {
  // A stay that is unpaid AND already reviewed must report the earlier blocker,
  // so the reason the host sees matches the error a rejected submit would throw.
  assert.equal(
    guestReviewEligibilityReason(
      { status: 'CONFIRMED', paidAt: null, checkOut: PAST, guestReview: { id: 'gr-1' } },
      NOW,
    ),
    'UNPAID',
  );
  assert.equal(
    guestReviewEligibilityReason({ status: 'PENDING', paidAt: null, checkOut: FUTURE }, NOW),
    'NOT_CONFIRMED',
  );
  assert.equal(
    guestReviewEligibilityReason({ status: 'CONFIRMED', paidAt: PAST, checkOut: FUTURE }, NOW),
    'NOT_ENDED',
  );
  assert.equal(
    guestReviewEligibilityReason({ status: 'CONFIRMED', paidAt: PAST, checkOut: PAST }, NOW),
    null,
  );
});

// ---- Public serialization / privacy ----

test('toPublicGuestReview exposes only the allowlisted key set', () => {
  const row = {
    id: 'gr-1',
    rating: 5,
    publicComment: 'Quiet, tidy, left the place spotless.',
    createdAt: PAST,
    // Internal / private fields that must never leave the service:
    privateNote: 'Broke a glass and did not mention it.',
    hidden: false,
    guestId: 'guest-1',
    hostId: 'host-1',
    bookingId: 'b-1',
    propertyId: 'p-1',
    booking: { total: 50000, paidAt: PAST },
    host: { firstName: 'Jane', lastName: 'Doe', email: 'jane@example.com' },
    property: { id: 'p-1', title: 'Kilimani Loft', hostId: 'host-1' },
  };

  const pub = toPublicGuestReview(row);

  assert.deepEqual(Object.keys(pub).sort(), [
    'createdAt',
    'host',
    'id',
    'property',
    'publicComment',
    'rating',
  ]);

  assert.deepEqual(pub, {
    id: 'gr-1',
    rating: 5,
    publicComment: 'Quiet, tidy, left the place spotless.',
    createdAt: PAST,
    host: { firstName: 'Jane', lastName: 'Doe' },
    property: { id: 'p-1', title: 'Kilimani Loft' },
  });

  // Explicitly assert nothing private survived serialization.
  const serialized = JSON.stringify(pub);
  for (const leak of [
    'privateNote',
    'hidden',
    'guestId',
    'hostId',
    'bookingId',
    'propertyId',
    'email',
    'total',
    'paidAt',
  ]) {
    assert.ok(!serialized.includes(leak), `serialized public guest review must not contain "${leak}"`);
  }
});

test('toPublicGuestReview null-safes a missing comment, host and property', () => {
  const pub = toPublicGuestReview({ id: 'gr-2', rating: 4, createdAt: PAST });
  assert.equal(pub.publicComment, null);
  assert.equal(pub.host, null);
  assert.equal(pub.property, null);
});

// ---- Aggregate ----

test('computeGuestReviewAggregate averages, counts, and buckets ratings', () => {
  const agg = computeGuestReviewAggregate([5, 5, 4, 3, 1]);
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

test('computeGuestReviewAggregate rounds the average to one decimal', () => {
  // 5 + 4 + 4 = 13 / 3 = 4.333... -> 4.3
  assert.equal(computeGuestReviewAggregate([5, 4, 4]).averageRating, 4.3);
});

test('computeGuestReviewAggregate returns zeros for an unreviewed guest', () => {
  const agg = computeGuestReviewAggregate([]);
  assert.equal(agg.totalReviews, 0);
  assert.equal(agg.averageRating, 0);
  assert.deepEqual(agg.distribution.map((bucket) => bucket.count), [0, 0, 0, 0, 0]);
});
