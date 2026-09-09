/**
 * Pure-function tests for firstPropertyImage, used to build the shortlist
 * list page's preview collage from either DB shape. No database is touched.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/property.first-image.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { firstPropertyImage } from '../src/services/property.service.js';

test('reads the first image from a native Postgres array', () => {
  assert.equal(firstPropertyImage({ images: ['a.jpg', 'b.jpg'] }), 'a.jpg');
});

test('reads the first image from a SQLite JSON string column', () => {
  assert.equal(firstPropertyImage({ imagesJson: '["a.jpg","b.jpg"]' }), 'a.jpg');
});

test('returns null for an empty array, not an empty string', () => {
  assert.equal(firstPropertyImage({ images: [] }), null);
  assert.equal(firstPropertyImage({ imagesJson: '[]' }), null);
});

test('returns null rather than throwing on malformed JSON', () => {
  assert.equal(firstPropertyImage({ imagesJson: 'not-json' }), null);
});

test('returns null when neither field is present', () => {
  assert.equal(firstPropertyImage({}), null);
  assert.equal(firstPropertyImage(null), null);
});
