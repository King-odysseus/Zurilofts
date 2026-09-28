import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildPropertySearchWhere } from '../src/services/property.service.js';

test('builds a location and neighborhood search for one area', () => {
  const where = buildPropertySearchWhere('Westlands');
  assert.ok(where);
  assert.equal(where.AND.length, 1);
  assert.deepEqual(where.AND[0].OR, [
    { title: { contains: 'Westlands' } },
    { location: { contains: 'Westlands' } },
    { neighborhood: { contains: 'Westlands' } },
    { address: { contains: 'Westlands' } },
  ]);
});

test('requires every comma-separated area token to match', () => {
  const where = buildPropertySearchWhere('Westlands, Nairobi');
  assert.ok(where);
  assert.equal(where.AND.length, 2);
  assert.equal(where.AND[0].OR[1].location.contains, 'Westlands');
  assert.equal(where.AND[1].OR[1].location.contains, 'Nairobi');
});

test('ignores blank searches', () => {
  assert.equal(buildPropertySearchWhere(''), null);
  assert.equal(buildPropertySearchWhere('   '), null);
  assert.equal(buildPropertySearchWhere(undefined), null);
});
