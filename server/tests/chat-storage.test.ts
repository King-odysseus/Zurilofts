/**
 * Which stored files Cloudinary may serve to anyone holding the address.
 *
 * Run from server/:
 *   node --import tsx --test tests/chat-storage.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { cloudinaryDeliveryType } from '../src/utils/imageStorage.js';

test('conversation attachments are stored as authenticated, not public', () => {
  assert.equal(cloudinaryDeliveryType('msg-1730000000000-a1b2c3d4'), 'authenticated');
});

test('listing photos and avatars stay public, because the public site renders them', () => {
  assert.equal(cloudinaryDeliveryType('prop-1730000000000-a1b2c3d4'), 'upload');
  assert.equal(cloudinaryDeliveryType('avatar-1730000000000-a1b2c3d4'), 'upload');
});

test('a name that only contains the chat prefix later on is not treated as private', () => {
  assert.equal(cloudinaryDeliveryType('prop-msg-1730000000000'), 'upload');
});
