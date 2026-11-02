/**
 * The draft-save contract for creating a listing.
 *
 * Run from server/:
 *   node --import tsx --test tests/property.draft.test.ts
 *
 * A host builds a listing over several sittings: the title today, photos
 * tomorrow, pricing once they have checked the market. That only works if the
 * first save is allowed to be empty, so the draft schema is the create schema
 * with every key made optional. Optional is not the same as unvalidated,
 * though: a key the client actually sends is still held to its full rule (an
 * empty title, a zero price, an unknown property type or an empty photo list
 * are all mistakes rather than "not filled in yet"). Publishing is unchanged
 * and still demands the whole listing, which is what stops an empty draft from
 * ever reaching a guest.
 *
 * These tests are pure schema behaviour: no database, no HTTP, no mocks.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { propertyCreateSchema, propertyDraftCreateSchema } from '../src/types/index.js';

type RejectedParse = {
  success: false;
  error: { issues: Array<{ path: Array<string | number> }> };
};

/**
 * Paths of the keys Zod rejected, so an assertion can name the field at fault
 * instead of matching on wording that may be reworded later.
 */
function rejectedPaths(result: { success: true } | RejectedParse): string[] {
  if (!result.success) {
    return result.error.issues.map((issue) => issue.path.join('.'));
  }
  assert.fail('expected the body to be rejected, but it parsed successfully');
}

test('an empty draft body is accepted, so a host can save before filling anything in', () => {
  const result = propertyDraftCreateSchema.safeParse({});
  assert.equal(result.success, true);
});

test('a partial draft body is accepted whatever subset of keys it carries', () => {
  const titleOnly = propertyDraftCreateSchema.safeParse({ title: 'Bright loft' });
  assert.equal(titleOnly.success, true);

  const titleAndPrice = propertyDraftCreateSchema.safeParse({ title: 'Bright loft', price: 5000 });
  assert.equal(titleAndPrice.success, true);
});

// Making every key optional must not turn the schema into a pass-through: a
// value that is present has to satisfy the same rule it would on publish.
test('a key that is present in a draft must still be valid', () => {
  const emptyTitle = propertyDraftCreateSchema.safeParse({ title: '' });
  assert.equal(emptyTitle.success, false);
  assert.deepEqual(rejectedPaths(emptyTitle), ['title']);

  for (const price of [0, -1]) {
    const badPrice = propertyDraftCreateSchema.safeParse({ price });
    assert.equal(badPrice.success, false, `a price of ${price} must be refused`);
    assert.deepEqual(rejectedPaths(badPrice), ['price']);
  }

  const unknownType = propertyDraftCreateSchema.safeParse({ type: 'castle' });
  assert.equal(unknownType.success, false);
  assert.deepEqual(rejectedPaths(unknownType), ['type']);
});

// An absent photo list means "photos not added yet"; an empty one means the
// client sent the key and left it blank, which is a mistake worth catching
// while the host is still on the form rather than at publish time.
test('an explicitly empty photo list is refused even in a draft', () => {
  const result = propertyDraftCreateSchema.safeParse({ images: [] });
  assert.equal(result.success, false);
  assert.deepEqual(rejectedPaths(result), ['images']);
});

test('publishing still requires the whole listing, not a draft', () => {
  const result = propertyCreateSchema.safeParse({});
  assert.equal(result.success, false);

  const missing = rejectedPaths(result);
  for (const field of ['title', 'price', 'images']) {
    assert.ok(missing.includes(field), `an empty publish body must fail on ${field}, got: ${missing.join(', ')}`);
  }
});

// This is the reason submitting a draft for review needs its own completeness
// check. The server fills safe defaults so an empty draft can be stored, but
// those defaults must never add up to something publishable: the row a draft
// save produces from {} is still refused by the create schema, so a submit
// handler that validates the stored listing against propertyCreateSchema
// cannot let an empty listing reach the admin moderation queue.
test('the defaults a draft save fills in are not enough to publish a listing', () => {
  // Exactly the row buildCreateData produces from {}: every required column is
  // present because the schema would reject the body otherwise, and the JSON
  // list columns come back as [] from their "[]" database defaults. Omitted
  // keys are not an option here, so this mirrors what the submit gate would
  // really be handed rather than a body that merely looks empty.
  const rowBuiltFromAnEmptyDraft = {
    title: 'Untitled listing',
    location: '',
    price: 0,
    bedrooms: 0,
    bathrooms: 0,
    area: 0,
    description: '',
    images: [],
    amenities: [],
    nearby: [],
    type: 'apartment',
  };

  const result = propertyCreateSchema.safeParse(rowBuiltFromAnEmptyDraft);
  assert.equal(result.success, false);
  assert.deepEqual(rejectedPaths(result), ['location', 'price', 'area', 'description', 'images']);
});

test('a complete listing body passes the create schema', () => {
  const complete = {
    title: 'Bright loft',
    location: 'Kilimani, Nairobi',
    price: 5000,
    bedrooms: 1,
    bathrooms: 1,
    area: 40,
    description: 'A bright loft',
    images: ['/uploads/a.jpg'],
    amenities: ['WiFi'],
    nearby: ['Airport'],
    type: 'apartment',
  };

  assert.equal(propertyCreateSchema.safeParse(complete).success, true);
  // The same body through the draft schema proves the two never disagree about
  // a listing that is genuinely finished.
  assert.equal(propertyDraftCreateSchema.safeParse(complete).success, true);
});
