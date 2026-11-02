/**
 * The host-name privacy rule: a host is shown to anyone outside their own
 * workspace by first name only.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/host-name.privacy.test.ts
 *
 * Pure helpers only - no database is touched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { hideHostSurname } from '../src/services/conversation.service.js';
import { toPublicGuestReview } from '../src/services/guest-review.service.js';

const HOST_ID = 'host-1';
const GUEST_ID = 'guest-1';
const PAST = new Date('2026-08-01T00:00:00Z');

// ---- Message senders ----

test("a host's surname is dropped from a message they sent", () => {
  const message = {
    id: 'm-1',
    content: 'The gate code is 4412.',
    sender: { id: HOST_ID, firstName: 'Jane', lastName: 'Doe', avatar: null },
  };

  const trimmed = hideHostSurname(message, HOST_ID);

  assert.deepEqual(trimmed.sender, { id: HOST_ID, firstName: 'Jane', avatar: null });
  // The message itself is untouched: only the name is narrowed.
  assert.equal(trimmed.content, 'The gate code is 4412.');
});

test("a guest's surname stays visible to the host", () => {
  const message = {
    id: 'm-2',
    sender: { id: GUEST_ID, firstName: 'Ada', lastName: 'Lovelace', avatar: null },
  };

  const result = hideHostSurname(message, HOST_ID);

  assert.deepEqual(result.sender, { id: GUEST_ID, firstName: 'Ada', lastName: 'Lovelace', avatar: null });
});

test('a message with no sender, or no known host, is passed through untouched', () => {
  const noSender = { id: 'm-3', sender: null };
  assert.deepEqual(hideHostSurname(noSender, HOST_ID), noSender);

  const sender = { id: HOST_ID, firstName: 'Jane', lastName: 'Doe' };
  const unknownHost = { id: 'm-4', sender };
  assert.deepEqual(hideHostSurname(unknownHost, undefined), unknownHost);
});

test('trimming does not mutate the original message', () => {
  const sender = { id: HOST_ID, firstName: 'Jane', lastName: 'Doe' };
  const message = { id: 'm-5', sender };

  hideHostSurname(message, HOST_ID);

  assert.equal(sender.lastName, 'Doe');
});

// ---- Guest reviews ----

test('a public guest review names its host author by first name only', () => {
  const pub = toPublicGuestReview({
    id: 'gr-1',
    rating: 5,
    publicComment: 'Left the place spotless.',
    createdAt: PAST,
    host: { firstName: 'Jane', lastName: 'Doe' },
    property: { id: 'p-1', title: 'Kilimani Loft' },
  });

  assert.deepEqual(pub.host, { firstName: 'Jane' });
  assert.ok(!JSON.stringify(pub).includes('Doe'), 'the surname must not be serialized');
});
