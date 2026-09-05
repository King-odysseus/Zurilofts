/**
 * Pure state-machine tests for the listing publication lifecycle. No database
 * is touched - these exercise the exported transition helpers that every
 * DB-facing service function (submitPropertyForReview, adminReviewProperty,
 * booking.service.createBooking) delegates to.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/property.transitions.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isBookable,
  canSubmitForReview,
  assertCanSubmitForReview,
  planListingReview,
  PROPERTY_STATUSES,
} from '../src/services/property.service.js';

// ---- Bookability ----

test('only a PUBLISHED listing is bookable', () => {
  assert.equal(isBookable('PUBLISHED'), true);
  for (const status of ['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'SUSPENDED']) {
    assert.equal(isBookable(status), false, `${status} must not be bookable`);
  }
});

// ---- Submitting for review ----

test('only DRAFT and REJECTED listings can be submitted for review', () => {
  assert.equal(canSubmitForReview('DRAFT'), true);
  assert.equal(canSubmitForReview('REJECTED'), true);
  for (const status of ['PENDING_REVIEW', 'PUBLISHED', 'SUSPENDED']) {
    assert.equal(canSubmitForReview(status), false, `${status} must not be submittable`);
    assert.throws(() => assertCanSubmitForReview(status), /can be submitted for review/i);
  }
});

test('assertCanSubmitForReview is a no-op for DRAFT/REJECTED', () => {
  assert.doesNotThrow(() => assertCanSubmitForReview('DRAFT'));
  assert.doesNotThrow(() => assertCanSubmitForReview('REJECTED'));
});

// ---- Admin review actions ----

test('approve moves PENDING_REVIEW to PUBLISHED and rejects any other status', () => {
  assert.equal(planListingReview('PENDING_REVIEW', 'approve'), 'PUBLISHED');
  for (const status of ['DRAFT', 'PUBLISHED', 'REJECTED', 'SUSPENDED']) {
    assert.throws(() => planListingReview(status, 'approve'), /pending review can be approved/i);
  }
});

test('reject moves PENDING_REVIEW to REJECTED and rejects any other status', () => {
  assert.equal(planListingReview('PENDING_REVIEW', 'reject'), 'REJECTED');
  for (const status of ['DRAFT', 'PUBLISHED', 'REJECTED', 'SUSPENDED']) {
    assert.throws(() => planListingReview(status, 'reject'), /pending review can be rejected/i);
  }
});

test('suspend moves PUBLISHED to SUSPENDED and rejects any other status', () => {
  assert.equal(planListingReview('PUBLISHED', 'suspend'), 'SUSPENDED');
  for (const status of ['DRAFT', 'PENDING_REVIEW', 'REJECTED', 'SUSPENDED']) {
    assert.throws(() => planListingReview(status, 'suspend'), /published listing can be suspended/i);
  }
});

test('unsuspend moves SUSPENDED to PUBLISHED and rejects any other status', () => {
  assert.equal(planListingReview('SUSPENDED', 'unsuspend'), 'PUBLISHED');
  for (const status of ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED']) {
    assert.throws(() => planListingReview(status, 'unsuspend'), /suspended listing can be unsuspended/i);
  }
});

test('every declared status is covered by the bookable/submittable predicates without throwing', () => {
  for (const status of PROPERTY_STATUSES) {
    assert.doesNotThrow(() => isBookable(status));
    assert.doesNotThrow(() => canSubmitForReview(status));
  }
});
