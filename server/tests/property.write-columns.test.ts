/**
 * Guards the listing write path against the failure that answered every save on
 * the live site with "Internal server error".
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/property.write-columns.test.ts
 *
 * The API speaks in plural names (images, amenities, nearby, houseRules), while
 * both Prisma schemas store them as JSON strings in ...Json columns. Only the
 * local SQLite branch used to translate between the two, so production handed
 * `images` to a client generated without such a field and Prisma rejected the
 * insert before anything reached the database.
 *
 * These tests are pure: no database, no HTTP. They hold the output to the
 * deployed schema rather than to either provider's opinion of it - whatever the
 * builders emit must be a real Property field in schema.postgresql.prisma.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { buildCreateData, buildUpdateData } from '../src/services/property.service.js';

const prismaDir = join(dirname(fileURLToPath(import.meta.url)), '..', 'prisma');

/** The field names of the Property model as the deployed client defines them. */
function postgresPropertyFields(): Set<string> {
  const text = readFileSync(join(prismaDir, 'schema.postgresql.prisma'), 'utf8');
  const model = text.match(/^model\s+Property\s*\{([\s\S]*?)^\}/m);
  assert.ok(model, 'Property model not found in schema.postgresql.prisma');

  const fields = new Set<string>();
  for (const rawLine of model[1].split('\n')) {
    // Drop trailing comments, block attributes (@@index) and blank lines.
    const line = (rawLine.split('//')[0] ?? '').trim();
    if (!line || line.startsWith('@@')) continue;
    const [field] = line.split(/\s+/);
    if (field) fields.add(field);
  }
  return fields;
}

const fields = postgresPropertyFields();
const LIST_COLUMNS = ['imagesJson', 'amenitiesJson', 'nearbyJson', 'houseRulesJson'];

// The builders branch on DATABASE_URL, and both branches have to agree with the
// deployed schema, so every assertion runs under each one.
const PROVIDERS = [
  { label: 'postgres (deployed)', url: 'postgresql://user:pass@localhost:5432/zurilofts' },
  { label: 'sqlite (local)', url: 'file:./dev.db' },
];

function asProvider(url: string, build: () => Record<string, unknown>): Record<string, unknown> {
  const previous = process.env.DATABASE_URL;
  process.env.DATABASE_URL = url;
  try {
    return build();
  } finally {
    process.env.DATABASE_URL = previous;
  }
}

/** A body shaped like a validated create request: plural names, lists as arrays. */
const fullBody = {
  title: 'Bright loft',
  location: 'Kilimani, Nairobi',
  neighborhood: 'Kilimani',
  price: 5000,
  price1Bed: 4500,
  price2Bed: 7000,
  bedrooms: 1,
  bathrooms: 1,
  area: 40,
  description: 'A bright loft with a balcony',
  images: ['/uploads/a.jpg', '/uploads/b.jpg'],
  amenities: ['High-Speed WiFi', 'Gym'],
  nearby: ['Airport'],
  type: 'apartment',
  available: true,
  featured: false,
  lat: -1.2921,
  lng: 36.8219,
  address: 'Wood Avenue',
  directions: 'Turn left at the Shell station',
  checkInMethod: 'Lockbox',
  checkInWindowStart: '15:00',
  checkOutTime: '10:00',
  wifiNetwork: 'Zuri Guest',
  wifiPassword: 'welcome123',
  houseManual: 'Bins on Tuesday',
  houseRules: ['No smoking', 'Quiet after 10pm'],
};

for (const provider of PROVIDERS) {
  test(`${provider.label}: every column the create builder writes exists on Property`, () => {
    const data = asProvider(provider.url, () => buildCreateData(fullBody));
    const unknown = Object.keys(data).filter((key) => !fields.has(key));
    assert.deepEqual(unknown, [], `these keys would be rejected by the deployed client: ${unknown.join(', ')}`);
  });

  test(`${provider.label}: photos and the other lists are stored in their Json columns`, () => {
    const data = asProvider(provider.url, () => buildCreateData(fullBody));

    // The plural names must not survive: they are API field names, not columns.
    for (const apiName of ['images', 'amenities', 'nearby', 'houseRules']) {
      assert.equal(apiName in data, false, `${apiName} must be translated before Prisma sees it`);
    }

    assert.deepEqual(JSON.parse(String(data.imagesJson)), fullBody.images);
    assert.deepEqual(JSON.parse(String(data.amenitiesJson)), fullBody.amenities);
    assert.deepEqual(JSON.parse(String(data.nearbyJson)), fullBody.nearby);
    assert.deepEqual(JSON.parse(String(data.houseRulesJson)), fullBody.houseRules);
  });

  test(`${provider.label}: creating always stores a private draft`, () => {
    const data = asProvider(provider.url, () => buildCreateData({ ...fullBody, status: 'PUBLISHED' }));
    assert.equal(data.status, 'DRAFT');
  });

  test(`${provider.label}: a nearly empty draft still fills every required column`, () => {
    const data = asProvider(provider.url, () => buildCreateData({}));

    const unknown = Object.keys(data).filter((key) => !fields.has(key));
    assert.deepEqual(unknown, [], `defaults must name real columns, not: ${unknown.join(', ')}`);

    // Each of these is NOT NULL in the schema, so an empty value here is what
    // lets a host save before filling anything in without losing the listing.
    for (const [column, expected] of Object.entries({
      title: '',
      location: '',
      price: 0,
      area: 0,
      description: '',
      type: 'apartment',
      status: 'DRAFT',
    })) {
      assert.equal(data[column], expected, `${column} must still be stored when the draft is empty`);
    }
    assert.equal(typeof data.bedrooms, 'number');
    assert.equal(typeof data.bathrooms, 'number');
  });

  test(`${provider.label}: an update translates the lists and leaves untouched fields out`, () => {
    const data = asProvider(provider.url, () => buildUpdateData({ images: ['/uploads/new.jpg'] }));

    const unknown = Object.keys(data).filter((key) => !fields.has(key));
    assert.deepEqual(unknown, [], `these keys would be rejected by the deployed client: ${unknown.join(', ')}`);

    assert.deepEqual(JSON.parse(String(data.imagesJson)), ['/uploads/new.jpg']);
    assert.equal('images' in data, false);
    // A field the host did not send must stay absent so Prisma leaves the stored
    // value alone instead of clearing it.
    assert.equal('amenitiesJson' in data, false);
    assert.equal('houseRulesJson' in data, false);
    // Status only moves through submit/review, never through a plain save.
    assert.equal('status' in data, false);
  });

  test(`${provider.label}: an already-encoded list is not encoded twice`, () => {
    const data = asProvider(provider.url, () => buildUpdateData({ imagesJson: '["/uploads/a.jpg"]' }));
    assert.equal(data.imagesJson, '["/uploads/a.jpg"]');
  });
}

test('the Json columns every builder writes are real fields of Property', () => {
  for (const column of LIST_COLUMNS) {
    assert.ok(fields.has(column), `${column} is missing from schema.postgresql.prisma`);
  }
});

// The half that made this fail silently for so long: the deployed model has no
// plural list field at all, so "write images as an array" is not a valid move
// under either provider and never was.
test('Property has no plural list field on the deployed schema', () => {
  for (const apiName of ['images', 'amenities', 'nearby', 'houseRules']) {
    assert.equal(fields.has(apiName), false, `Property.${apiName} must not exist - it is an API name, not a column`);
  }
});
