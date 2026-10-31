import assert from 'node:assert/strict';
import test from 'node:test';
import { calendarDay } from '../src/services/calendar.service.js';

// Host calendar nights are date-only. Pinning them to UTC midnight is what keeps
// "block these nights" and "open this night" agreeing with each other: a local
// midnight on a summer date is an hour earlier than UTC, which made the unblock
// check reject the very block it was created from.
test('a date-only string stays on the same calendar day', () => {
  assert.equal(calendarDay(new Date('2026-09-29')).toISOString(), '2026-09-29T00:00:00.000Z');
});

test('a timestamp later in the day still resolves to that day', () => {
  assert.equal(calendarDay(new Date('2026-09-29T18:45:00.000Z')).toISOString(), '2026-09-29T00:00:00.000Z');
});

test('single-day increments cross a month and a year without drifting', () => {
  const newYearsEve = calendarDay(new Date('2026-12-31'));
  const next = new Date(newYearsEve.getTime() + 86_400_000);
  assert.equal(next.toISOString(), '2027-01-01T00:00:00.000Z');
});
