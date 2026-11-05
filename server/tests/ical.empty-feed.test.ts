/**
 * Behaviour tests for an external calendar feed that answers with rubbish.
 *
 * Both cases here end with nights that are already sold elsewhere being offered
 * again, so these pin the rule rather than the implementation.
 *
 * Run from server/:
 *   node --import tsx --test tests/ical.empty-feed.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  EMPTY_FEED_WARNING_PREFIX,
  looksLikeCalendar,
  shouldReplaceBlocks,
} from '../src/services/ical.service.js';

test('a body without VCALENDAR is not treated as a calendar', () => {
  // What a dead share link actually returns: a login page or a provider error
  // page, with a 200 status and no events in it.
  assert.equal(looksLikeCalendar('<html><body>Sign in to continue</body></html>'), false);
  assert.equal(looksLikeCalendar(''), false);
  assert.equal(looksLikeCalendar('{"error":"invalid token"}'), false);
});

test('a real calendar is recognised whatever its shape or case', () => {
  const standard = 'BEGIN:VCALENDAR\r\nVERSION:2.0\r\nEND:VCALENDAR\r\n';
  assert.equal(looksLikeCalendar(standard), true);
  assert.equal(looksLikeCalendar('begin:vcalendar\nversion:2.0\n'), true);
});

test('a feed with events always replaces the stored blocks', () => {
  assert.equal(
    shouldReplaceBlocks({ parsedEvents: 3, existingBlocks: 12, lastStatus: 'OK (12 events)' }),
    true,
  );
  // Even when it contradicts an earlier empty warning, real events win.
  assert.equal(
    shouldReplaceBlocks({
      parsedEvents: 1,
      existingBlocks: 12,
      lastStatus: `${EMPTY_FEED_WARNING_PREFIX}, kept 12 block(s).`,
    }),
    true,
  );
});

test('the first empty feed keeps the existing blocks and warns', () => {
  // The night this protects: a provider hiccups, the calendar parses as valid
  // but empty, and the stored blocks are the only record that those nights are
  // sold. Applying the empty feed would put them back on sale.
  assert.equal(
    shouldReplaceBlocks({ parsedEvents: 0, existingBlocks: 4, lastStatus: 'OK (4 events)' }),
    false,
  );
});

test('a second empty feed is believed and clears the blocks', () => {
  // The calendar really was emptied. Holding it forever would block nights that
  // are now genuinely free, which costs the host bookings.
  assert.equal(
    shouldReplaceBlocks({
      parsedEvents: 0,
      existingBlocks: 4,
      lastStatus: `${EMPTY_FEED_WARNING_PREFIX}, kept 4 block(s). Sync again to confirm the calendar is empty.`,
    }),
    true,
  );
});

test('an empty feed replaces an already empty source without a warning', () => {
  assert.equal(shouldReplaceBlocks({ parsedEvents: 0, existingBlocks: 0, lastStatus: null }), true);
});

test('a missing status is treated as no previous warning', () => {
  assert.equal(shouldReplaceBlocks({ parsedEvents: 0, existingBlocks: 2, lastStatus: null }), false);
});
