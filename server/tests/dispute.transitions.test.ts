/**
 * Pure state-machine tests for booking-linked dispute status transitions. No
 * database is touched - these exercise the exported helper that
 * dispute.service.updateStatus (and the evidence/message closed-dispute
 * guards) delegate to.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/dispute.transitions.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { isClosed, assertValidStatusTransition } from '../src/services/dispute.service.js';

test('RESOLVED and DISMISSED are closed; OPEN and UNDER_REVIEW are not', () => {
  assert.equal(isClosed('RESOLVED'), true);
  assert.equal(isClosed('DISMISSED'), true);
  assert.equal(isClosed('OPEN'), false);
  assert.equal(isClosed('UNDER_REVIEW'), false);
});

test('a closed dispute rejects any further status transition', () => {
  for (const current of ['RESOLVED', 'DISMISSED']) {
    assert.throws(
      () => assertValidStatusTransition(current, 'UNDER_REVIEW'),
      /already closed/i,
    );
  }
});

test('resolving requires a non-blank resolution summary', () => {
  assert.throws(() => assertValidStatusTransition('OPEN', 'RESOLVED'), /resolution summary is required/i);
  assert.throws(() => assertValidStatusTransition('OPEN', 'RESOLVED', '   '), /resolution summary is required/i);
  assert.doesNotThrow(() => assertValidStatusTransition('OPEN', 'RESOLVED', 'Refunded the guest in full'));
});

test('dismissing and marking under review from an open dispute need no resolution', () => {
  assert.doesNotThrow(() => assertValidStatusTransition('OPEN', 'DISMISSED'));
  assert.doesNotThrow(() => assertValidStatusTransition('OPEN', 'UNDER_REVIEW'));
  assert.doesNotThrow(() => assertValidStatusTransition('UNDER_REVIEW', 'RESOLVED', 'Partial refund issued'));
});
