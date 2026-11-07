/**
 * Behaviour tests for the rules that keep a night from being sold twice across
 * two platforms.
 *
 * The nights these protect are real money: a block whose dates drift by a
 * timezone offset, or a feed everybody believes is current because nothing ever
 * says otherwise, both end with the same room booked by two guests.
 *
 * Run from server/:
 *   node --import tsx --test tests/ical.double-booking.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isSourceStale, toCalendarDay, SOURCE_STALE_AFTER_MS } from '../src/services/ical.service.js';

/** A booking's dates arrive as "YYYY-MM-DD" and are stored at UTC midnight. */
function bookingDay(y: number, m: number, d: number): Date {
  return new Date(Date.UTC(y, m - 1, d));
}

test('an imported date lands on the calendar day the feed wrote, whatever the timezone', () => {
  // node-ical returns an all-day DATE value as midnight in the server's own
  // timezone, which is what this Date is. Reading it back must not move it: a
  // stay starting 1 January has to be stored as 1 January, not 31 December.
  const parsedAllDay = new Date(2026, 0, 1, 0, 0, 0, 0); // local midnight, 1 Jan 2026

  const stored = toCalendarDay(parsedAllDay);

  assert.equal(stored.toISOString(), '2026-01-01T00:00:00.000Z');
  assert.equal(stored.getUTCFullYear(), 2026);
  assert.equal(stored.getUTCMonth(), 0);
  assert.equal(stored.getUTCDate(), 1);
});

test('an imported block conflicts with exactly the nights a booking would take', () => {
  // The Airbnb stay is 1 to 4 January, so nights 1, 2 and 3 are sold and the
  // guest checking out on the 4th may still book that night.
  const blockStart = toCalendarDay(new Date(2026, 0, 1));
  const blockEnd = toCalendarDay(new Date(2026, 0, 4));

  const overlaps = (inDate: Date, outDate: Date) => blockStart < outDate && blockEnd > inDate;

  assert.equal(overlaps(bookingDay(2025, 12, 31), bookingDay(2026, 1, 1)), false);
  assert.equal(overlaps(bookingDay(2026, 1, 1), bookingDay(2026, 1, 2)), true);
  assert.equal(overlaps(bookingDay(2026, 1, 3), bookingDay(2026, 1, 4)), true);
  assert.equal(overlaps(bookingDay(2026, 1, 4), bookingDay(2026, 1, 6)), false);
});

test('a feed never checked is stale', () => {
  assert.equal(isSourceStale(null, null), true);
});

test('a feed checked within the window is trusted', () => {
  const now = Date.now();
  assert.equal(isSourceStale(new Date(now - 5 * 60 * 1000), 'OK (2 events)', now), false);
});

test('a feed that has missed a full background round is stale', () => {
  const now = Date.now();
  const justOver = new Date(now - SOURCE_STALE_AFTER_MS - 1000);
  assert.equal(isSourceStale(justOver, 'OK (2 events)', now), true);
});

test('a feed whose last check failed is stale even when it just ran', () => {
  // Its blocks are the ones from before the failure, so a fresh timestamp on an
  // error says nothing about whether they are still true.
  const now = Date.now();
  assert.equal(isSourceStale(new Date(now - 1000), 'ERROR: timeout', now), true);
});
