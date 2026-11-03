/**
 * Server-side filters and paging for the admin list endpoints.
 *
 * Run from server/:
 *   node --import tsx --test tests/list-paging.test.ts
 *
 * These are the pure decisions behind the four lists (feedback, support
 * messages, bookings, orphaned listings). Each of those endpoints had grown its
 * own idea of paging, and one had none at all, so the point of these tests is
 * that an unbounded query cannot come back one endpoint at a time.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

const {
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  paginationMeta,
  parseBoolean,
  parseDateRange,
  parseEnum,
  parsePaging,
  parseSearch,
} = await import('../src/utils/paging.js');

// ---------------------------------------------------------------------------
// Paging
// ---------------------------------------------------------------------------

test('a missing page and limit fall back to the first page', () => {
  assert.deepEqual(parsePaging({}), { page: 1, limit: DEFAULT_PAGE_SIZE, skip: 0 });
  assert.deepEqual(parsePaging(), { page: 1, limit: DEFAULT_PAGE_SIZE, skip: 0 });
});

test('a requested page produces the right offset', () => {
  assert.deepEqual(parsePaging({ page: 3, limit: 25 }), { page: 3, limit: 25, skip: 50 });
  assert.deepEqual(parsePaging({ page: 1, limit: 100 }), { page: 1, limit: 100, skip: 0 });
});

test('the page size cannot be inflated past the ceiling', () => {
  // The whole point: an endpoint must not be able to return the table.
  assert.equal(parsePaging({ limit: 100000 }).limit, MAX_PAGE_SIZE);
  assert.equal(parsePaging({ limit: 101 }).limit, MAX_PAGE_SIZE);
  assert.equal(parsePaging({ limit: MAX_PAGE_SIZE }).limit, MAX_PAGE_SIZE);
});

test('nonsense input cannot produce a NaN offset', () => {
  // skip: NaN reaches Prisma as a bad offset rather than a readable error.
  for (const bad of ['abc', '', '  ', null, undefined, NaN, Infinity, -1, 0]) {
    const paging = parsePaging({ page: bad as never, limit: bad as never });
    assert.equal(Number.isInteger(paging.page), true);
    assert.equal(Number.isInteger(paging.limit), true);
    assert.equal(Number.isInteger(paging.skip), true);
    assert.ok(paging.page >= 1 && paging.limit >= 1);
  }
});

test('string values from a query string are accepted', () => {
  assert.deepEqual(parsePaging({ page: '4', limit: '10' }), { page: 4, limit: 10, skip: 30 });
  // A fractional value is truncated, not rounded up past the ceiling.
  assert.deepEqual(parsePaging({ page: '2.9', limit: '10.9' }), { page: 2, limit: 10, skip: 10 });
});

test('a per-endpoint default is honoured but still capped', () => {
  assert.equal(parsePaging({}, { defaultLimit: 50 }).limit, 50);
  // A default above the ceiling is clamped, so no endpoint can raise the cap
  // by quietly asking for a huge default.
  assert.equal(parsePaging({}, { defaultLimit: 500 }).limit, MAX_PAGE_SIZE);
});

test('raising the ceiling allows a larger page but does not choose one', () => {
  // A raised cap is permission, not a preference: an endpoint that does not ask
  // for a bigger page still gets the default, so a caller cannot enlarge every
  // response by only widening the limit.
  assert.equal(parsePaging({}, { maxLimit: 5000 }).limit, DEFAULT_PAGE_SIZE);
  assert.equal(parsePaging({ limit: 50 }, { maxLimit: 5000 }).limit, 50);
  // And the ceiling still applies to an explicit request.
  assert.equal(parsePaging({ limit: 5000 }, { maxLimit: 5000 }).limit, MAX_PAGE_SIZE);
});

// ---------------------------------------------------------------------------
// The pagination envelope
// ---------------------------------------------------------------------------

test('the envelope reports total pages and whether more exist', () => {
  assert.deepEqual(paginationMeta(100, { page: 1, limit: 20 }), {
    page: 1,
    limit: 20,
    total: 100,
    totalPages: 5,
    hasMore: true,
  });
  assert.deepEqual(paginationMeta(100, { page: 5, limit: 20 }), {
    page: 5,
    limit: 20,
    total: 100,
    totalPages: 5,
    hasMore: false,
  });
});

test('an empty result still pages as 1 of 1', () => {
  // So a client does not have to special-case "page 1 of 0".
  assert.deepEqual(paginationMeta(0, { page: 1, limit: 20 }), {
    page: 1,
    limit: 20,
    total: 0,
    totalPages: 1,
    hasMore: false,
  });
});

test('a partial last page still counts as a page', () => {
  const meta = paginationMeta(21, { page: 2, limit: 20 });
  assert.equal(meta.totalPages, 2);
  assert.equal(meta.hasMore, false);
});

test('a negative or non-finite total is treated as empty', () => {
  assert.equal(paginationMeta(-5, { page: 1, limit: 20 }).total, 0);
  assert.equal(paginationMeta(NaN, { page: 1, limit: 20 }).total, 0);
});

// ---------------------------------------------------------------------------
// Filters
// ---------------------------------------------------------------------------

test('a blank search is not a filter', () => {
  // "no search" and "search for nothing" must not be the same thing.
  assert.equal(parseSearch(''), undefined);
  assert.equal(parseSearch('   '), undefined);
  assert.equal(parseSearch(undefined), undefined);
  assert.equal(parseSearch(null), undefined);
  assert.equal(parseSearch(42), undefined);
  assert.equal(parseSearch(' Kilimani '), 'Kilimani');
});

test('a very long search is bounded', () => {
  assert.equal(parseSearch('x'.repeat(500)).length, 120);
});

test('a boolean filter distinguishes "not asked" from false', () => {
  // ?hidden=false must filter to visible rows, not mean "no filter".
  assert.equal(parseBoolean('true'), true);
  assert.equal(parseBoolean('1'), true);
  assert.equal(parseBoolean('false'), false);
  assert.equal(parseBoolean('0'), false);
  assert.equal(parseBoolean(undefined), undefined);
  assert.equal(parseBoolean(''), undefined);
  assert.equal(parseBoolean('yes'), undefined);
});

test('an enum filter accepts only a listed value', () => {
  const allowed = ['DRAFT', 'PUBLISHED'] as const;
  assert.equal(parseEnum('DRAFT', allowed), 'DRAFT');
  // A typo must not silently mean "everything".
  assert.equal(parseEnum('draft', allowed), undefined);
  assert.equal(parseEnum('NOPE', allowed), undefined);
  assert.equal(parseEnum(undefined, allowed), undefined);
  assert.equal(parseEnum(7, allowed), undefined);
});

test('a date window keeps whichever bounds are usable', () => {
  const from = parseDateRange('2026-01-01', '2026-02-01');
  assert.equal(from?.gte?.toISOString().startsWith('2026-01-01'), true);
  assert.equal(from?.lte?.toISOString().startsWith('2026-02-01'), true);

  assert.equal(parseDateRange('2026-01-01', undefined)?.lte, undefined);
  assert.equal(parseDateRange(undefined, '2026-02-01')?.gte, undefined);
  // Garbage in either bound is ignored rather than producing an Invalid Date.
  assert.equal(parseDateRange('not-a-date', 'not-a-date'), undefined);
  assert.equal(parseDateRange('', ''), undefined);
  assert.equal(parseDateRange(), undefined);
});

test('a Date instance is accepted as a bound', () => {
  const when = new Date('2026-03-04T05:06:07.000Z');
  assert.equal(parseDateRange(when, undefined)?.gte?.toISOString(), when.toISOString());
});
