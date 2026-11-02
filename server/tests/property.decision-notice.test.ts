/**
 * What the host is told when an admin decides on one of their listings.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/property.decision-notice.test.ts
 *
 * The point of these assertions is that a decision is never silent: every action
 * produces a title, a sentence naming the listing, and a page to open. The
 * reviewer's note has to survive into the message, because "Update the requested
 * details" tells a host nothing when the reviewer already said which photo is
 * wrong. These are pure: no database, no HTTP, no push send.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { listingDecisionNotice } from '../src/services/property.service.js';

const propertyId = 'prop_123';

test('approval tells the host the listing is live and links to their listings', () => {
  const notice = listingDecisionNotice({
    action: 'approve',
    title: 'Serenity Apartments',
    propertyId,
  });

  assert.equal(notice.title, 'Your listing is live');
  assert.match(notice.body, /Serenity Apartments/);
  assert.match(notice.body, /open for bookings/);
  assert.equal(notice.url, '/host/listings');
});

test('a rejection carries the reason and opens the listing to fix it', () => {
  const notice = listingDecisionNotice({
    action: 'reject',
    title: 'Serenity Apartments',
    note: 'The living room photo is blurry.',
    propertyId,
  });

  assert.equal(notice.title, 'Changes needed on your listing');
  assert.match(notice.body, /Serenity Apartments/);
  assert.match(notice.body, /The living room photo is blurry\./);
  // Straight to the editor: this is the one decision with work attached.
  assert.equal(notice.url, `/host/listings/${propertyId}/edit`);
});

test('a rejection with no note still says what to do next', () => {
  const notice = listingDecisionNotice({
    action: 'reject',
    title: 'Serenity Apartments',
    note: '   ',
    propertyId,
  });

  assert.match(notice.body, /Update the requested details and submit it again\./);
  // Whitespace is not a reason, so it must not be pasted into the message.
  assert.equal(notice.body.includes('   '), false);
});

test('a suspension says the listing is hidden and keeps the reason', () => {
  const notice = listingDecisionNotice({
    action: 'suspend',
    title: 'Serenity Apartments',
    note: 'A guest reported a safety issue.',
    propertyId,
  });

  assert.equal(notice.title, 'Your listing is hidden');
  assert.match(notice.body, /hidden from guests/);
  assert.match(notice.body, /A guest reported a safety issue\./);
});

test('a suspension with no note still says the listing is hidden', () => {
  const notice = listingDecisionNotice({
    action: 'suspend',
    title: 'Serenity Apartments',
    propertyId,
  });
  assert.match(notice.body, /has been hidden from guests\./);
});

test('a restoration says the listing is visible again', () => {
  const notice = listingDecisionNotice({
    action: 'unsuspend',
    title: 'Serenity Apartments',
    propertyId,
  });

  assert.equal(notice.title, 'Your listing is live again');
  assert.match(notice.body, /visible to guests again/);
  assert.equal(notice.url, '/host/listings');
});

// A draft can be saved before the host names it, so the message must still read
// as a sentence instead of starting with " is now visible to guests".
test('an untitled listing is described as "your listing"', () => {
  const notice = listingDecisionNotice({ action: 'approve', title: '', propertyId });
  assert.match(notice.body, /^your listing is now visible to guests/);
});

// The push is best-effort, so nothing here may be empty: an empty notification
// would arrive on the host's phone as a blank line.
test('every decision produces a title, a body and an in-app destination', () => {
  for (const action of ['approve', 'reject', 'suspend', 'unsuspend'] as const) {
    const notice = listingDecisionNotice({ action, title: 'A stay', note: 'See note.', propertyId });
    assert.ok(notice.title.trim().length > 0, `${action} needs a title`);
    assert.ok(notice.body.trim().length > 0, `${action} needs a body`);
    assert.ok(notice.url.startsWith('/host/'), `${action} must link into the host workspace, got ${notice.url}`);
  }
});
