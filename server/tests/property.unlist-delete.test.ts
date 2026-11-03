/**
 * Pure tests for the host "unlist" transition and the rule that decides whether
 * a listing may be hard-deleted. No database is touched.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/property.unlist-delete.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { planHostUnpublish, listingDeleteVerdict } from '../src/services/property.service.js';

// ---- Unlisting ----

test('a published or pending listing can be unlisted back to a draft', () => {
  assert.equal(planHostUnpublish('PUBLISHED'), 'DRAFT');
  assert.equal(planHostUnpublish('PENDING_REVIEW'), 'DRAFT');
});

test('listings that are not live or in review cannot be unlisted', () => {
  for (const status of ['DRAFT', 'REJECTED', 'SUSPENDED']) {
    assert.throws(() => planHostUnpublish(status), /can be unlisted/, `${status} must be refused`);
  }
});

// ---- Delete eligibility ----

test('a listing with no bookings can be deleted', () => {
  assert.deepEqual(listingDeleteVerdict([]), { canDelete: true, paid: 0, unpaid: 0 });
});

test('unpaid bookings do not block a delete but are counted', () => {
  const verdict = listingDeleteVerdict([{ paidAt: null }, { paidAt: null }]);
  assert.deepEqual(verdict, { canDelete: true, paid: 0, unpaid: 2 });
});

test('a single paid booking blocks the delete', () => {
  const verdict = listingDeleteVerdict([{ paidAt: null }, { paidAt: new Date('2026-10-01') }]);
  assert.deepEqual(verdict, { canDelete: false, paid: 1, unpaid: 1 });
});
