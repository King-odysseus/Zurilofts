/**
 * Paging and counting for the admin queues.
 *
 * These pin the two failures the queues had: a badge that counted the rows on
 * screen instead of the queue, and a page window that a query string could push
 * out of range.
 *
 * Run from server/:
 *   node --import tsx --test tests/admin-queue.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPagination, clampQueueWindow, countByStatus } from '../src/utils/adminQueue.js';

test('a page window is the page requested, with the offset it implies', () => {
  assert.deepEqual(clampQueueWindow(3, 10), { page: 3, limit: 10, skip: 20 });
  assert.deepEqual(clampQueueWindow(1, 10), { page: 1, limit: 10, skip: 0 });
});

test('a missing or nonsense page falls back to the first page', () => {
  for (const page of [undefined, 0, -5, Number.NaN]) {
    assert.equal(clampQueueWindow(page, 10).page, 1, String(page));
    assert.equal(clampQueueWindow(page, 10).skip, 0, String(page));
  }
});

test('a page large enough to overflow memory is capped', () => {
  // Without a cap a caller could ask for the whole table in one response.
  assert.equal(clampQueueWindow(1, 100000).limit, 100);
  assert.equal(clampQueueWindow(1, undefined).limit, 20);
});

test('a limit below one still returns a usable page', () => {
  assert.equal(clampQueueWindow(1, 0).limit, 20);
  assert.equal(clampQueueWindow(1, -3).limit, 1);
});

test('every known status is present, so a badge never renders blank', () => {
  // A status with no rows has no group in the database result.
  const counts = countByStatus(['OPEN', 'UNDER_REVIEW', 'RESOLVED', 'DISMISSED'], [
    { status: 'OPEN', _count: { _all: 7 } },
  ]);

  assert.deepEqual(counts, { OPEN: 7, UNDER_REVIEW: 0, RESOLVED: 0, DISMISSED: 0 });
});

test('counts are queue sizes and may exceed one page', () => {
  const counts = countByStatus(['SUBMITTED'], [{ status: 'SUBMITTED', _count: { _all: 240 } }]);
  assert.equal(counts.SUBMITTED, 240);
});

test('pagination reports the real total and the page count it implies', () => {
  assert.deepEqual(buildPagination(1, 10, 26), { page: 1, limit: 10, total: 26, totalPages: 3 });
  assert.deepEqual(buildPagination(3, 10, 26), { page: 3, limit: 10, total: 26, totalPages: 3 });
});

test('an empty queue reports no pages rather than one empty page', () => {
  assert.deepEqual(buildPagination(1, 10, 0), { page: 1, limit: 10, total: 0, totalPages: 0 });
});

test('an exact multiple does not add a trailing empty page', () => {
  assert.equal(buildPagination(1, 10, 20).totalPages, 2);
});
