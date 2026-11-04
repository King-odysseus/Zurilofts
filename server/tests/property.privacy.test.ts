/**
 * Regression tests for what a public property response may contain.
 *
 * These pin two rules that were both broken:
 *  1. A visitor must never receive the host's arrival guide (directions, entry
 *     method, Wi-Fi, house manual), the iCal feed token, or the internal
 *     listing-review trail. Every public read path used to return the whole row.
 *  2. A host-authored body must never write ownership, the marketing `featured`
 *     flag, the ops audit trail or the aggregate rating.
 *
 * Run from server/:
 *   node --import tsx --test tests/property.privacy.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  PRIVATE_PROPERTY_FIELDS,
  propertyForBookingViewer,
  toPublicProperty,
} from '../src/utils/propertyPrivacy.js';
import { buildUpdateData } from '../src/services/property.service.js';

const fullRow = {
  id: 'prop_1',
  hostId: 'user_host',
  title: 'Kilimani Loft',
  price: 12000,
  address: '12 Ngong Road',
  rating: 4.8,
  reviews: 7,
  directions: 'Gate 3, ask for Joseph',
  checkInMethod: 'Lockbox 4417',
  wifiNetwork: 'Zuri-Guest',
  wifiPassword: 'sunshine-2026',
  houseManual: 'Bin day is Tuesday',
  icalToken: 'ical_secret_token',
  listingReviewNote: 'Photos look staged',
  listingReviewedBy: 'admin_1',
  listingReviewedAt: new Date('2026-10-01T09:00:00Z'),
};

test('a public property keeps the guest-facing fields', () => {
  const publicRow = toPublicProperty(fullRow);

  assert.equal(publicRow.id, 'prop_1');
  assert.equal(publicRow.title, 'Kilimani Loft');
  assert.equal(publicRow.price, 12000);
  assert.equal(publicRow.address, '12 Ngong Road');
  assert.equal(publicRow.rating, 4.8);
  assert.equal(publicRow.reviews, 7);
});

test('a public property never carries the arrival guide or the iCal token', () => {
  const publicRow = toPublicProperty(fullRow) as Record<string, unknown>;

  for (const field of PRIVATE_PROPERTY_FIELDS) {
    assert.equal(field in publicRow, false, `${field} leaked to a visitor`);
  }
});

test('removing private fields does not mutate the caller row', () => {
  const original = { ...fullRow };
  toPublicProperty(fullRow);

  assert.equal(fullRow.wifiPassword, original.wifiPassword);
  assert.equal(fullRow.icalToken, original.icalToken);
});

test('a host body cannot write ownership or the marketing flag', () => {
  const data = buildUpdateData({
    title: 'Renamed stay',
    price: 15000,
    hostId: 'user_victim',
    featured: true,
    status: 'PUBLISHED',
    icalToken: 'attacker-chosen',
    listingReviewNote: 'forged',
    listingReviewedBy: 'admin_1',
    listingReviewedAt: new Date(),
    submittedAt: new Date(),
    rating: 5,
    reviews: 999,
  });

  assert.equal(data.title, 'Renamed stay');
  assert.equal(data.price, 15000);
  for (const field of [
    'hostId',
    'featured',
    'status',
    'icalToken',
    'listingReviewNote',
    'listingReviewedBy',
    'listingReviewedAt',
    'submittedAt',
    'rating',
    'reviews',
  ]) {
    assert.equal(field in data, false, `${field} was writable from a host body`);
  }
});

test('clearing a bed price still works after the deny-list', () => {
  const data = buildUpdateData({ price1Bed: null });

  assert.equal(data.price1Bed, null);
});

test('a guest booking that is not confirmed hides the arrival guide', () => {
  // Creating a PENDING booking on any published listing - then reading it, or
  // cancelling it and reading the response - used to return the door codes, the
  // Wi-Fi password and the host's iCal token without a shilling paid.
  for (const status of ['PENDING', 'CANCELLED', 'CONFLICT']) {
    const view = propertyForBookingViewer(fullRow, { status, isOwner: false });
    assert.equal(view.wifiPassword, undefined, `${status}: wifi password leaked`);
    assert.equal(view.checkInMethod, undefined, `${status}: entry method leaked`);
    assert.equal(view.directions, undefined, `${status}: directions leaked`);
    assert.equal(view.houseManual, undefined, `${status}: house manual leaked`);
    assert.equal(view.icalToken, undefined, `${status}: iCal token leaked`);
    // The guest still needs the listing itself.
    assert.equal(view.title, 'Kilimani Loft');
  }
});

test('a confirmed stay unlocks the arrival guide for the guest', () => {
  const view = propertyForBookingViewer(fullRow, { status: 'CONFIRMED', isOwner: false });

  assert.equal(view.wifiPassword, 'sunshine-2026');
  assert.equal(view.icalToken, 'ical_secret_token');
});

test('the host who owns the listing keeps the whole row whatever the status', () => {
  const view = propertyForBookingViewer(fullRow, { status: 'PENDING', isOwner: true });

  assert.equal(view.wifiPassword, 'sunshine-2026');
  assert.equal(view.checkInMethod, 'Lockbox 4417');
});
