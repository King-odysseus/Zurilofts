/**
 * Pure-function tests for the list-search availability date parsing used by
 * GET /properties?checkIn=&checkOut=. No database is touched.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/property.availability-filter.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { parseAvailabilityDateRange } from '../src/services/property.service.js';

test('parses a valid checkIn/checkOut pair into Dates', () => {
  const result = parseAvailabilityDateRange('2026-10-01', '2026-10-05');
  assert.ok(result);
  assert.equal(result?.checkIn.toISOString().slice(0, 10), '2026-10-01');
  assert.equal(result?.checkOut.toISOString().slice(0, 10), '2026-10-05');
});

test('rejects a lone checkIn or checkOut', () => {
  assert.equal(parseAvailabilityDateRange('2026-10-01', undefined), null);
  assert.equal(parseAvailabilityDateRange(undefined, '2026-10-05'), null);
  assert.equal(parseAvailabilityDateRange('2026-10-01', ''), null);
});

test('rejects unparseable dates', () => {
  assert.equal(parseAvailabilityDateRange('not-a-date', '2026-10-05'), null);
  assert.equal(parseAvailabilityDateRange('2026-10-01', 'also-not-a-date'), null);
});

test('rejects checkOut on or before checkIn', () => {
  assert.equal(parseAvailabilityDateRange('2026-10-05', '2026-10-01'), null);
  assert.equal(parseAvailabilityDateRange('2026-10-05', '2026-10-05'), null);
});

test('ignores non-string query values (e.g. arrays from repeated params)', () => {
  assert.equal(parseAvailabilityDateRange(['2026-10-01'], '2026-10-05'), null);
});
