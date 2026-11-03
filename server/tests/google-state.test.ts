/**
 * Google sign-in state check.
 *
 * The point of the state value is that a callback completed in one browser
 * cannot sign a different person in, so the comparison has to reject a missing,
 * empty or different value rather than treating it as a wildcard.
 *
 * Run from server/:
 *   node --import tsx --test tests/google-state.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { googleStateMatches } from '../src/controllers/auth.controller.js';

const ISSUED = 'kZ8r2QpLw3nH7tYvB1cX4mN6aS9dF0gJ5hK2lM8pQ3r';

test('the value we issued is accepted', () => {
  assert.equal(googleStateMatches(ISSUED, ISSUED), true);
});

test('a different value is refused', () => {
  assert.equal(googleStateMatches(ISSUED, `${ISSUED.slice(0, -1)}x`), false);
});

test('a missing or empty value is refused, not treated as a wildcard', () => {
  assert.equal(googleStateMatches(undefined, ISSUED), false);
  assert.equal(googleStateMatches(ISSUED, undefined), false);
  assert.equal(googleStateMatches('', ''), false);
  assert.equal(googleStateMatches(null, ISSUED), false);
});

test('non-string values from the query are refused', () => {
  assert.equal(googleStateMatches(ISSUED, [ISSUED]), false);
  assert.equal(googleStateMatches({ toString: () => ISSUED }, ISSUED), false);
});

test('a truncated value is refused even though it is a prefix', () => {
  assert.equal(googleStateMatches(ISSUED, ISSUED.slice(0, 8)), false);
});
