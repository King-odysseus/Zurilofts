/**
 * Payout state transitions under repeated and out-of-order transfer notices.
 *
 * Payment providers deliver transfer notices at least once and not necessarily
 * in order. These tests pin the money rule that matters: however the notices
 * are shuffled or repeated, a host's balance is restored at most once for a
 * transfer that never arrived.
 *
 * Run from server/:
 *   node --import tsx --test tests/payout.transitions.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  SETTLED_PAYOUT_STATUSES,
  canMarkTransferSucceeded,
  isSettledPayoutStatus,
} from '../src/utils/payoutTransitions.js';

const AMOUNT = 12000;

/**
 * The wallet rule as the webhook applies it, without a database: initiating a
 * transfer already debited the host, so restoring the balance is the only thing
 * that moves money here, and it may happen at most once.
 */
function replayNotices(notices: string[]) {
  let status = 'PROCESSING';
  let balance = 0;

  for (const notice of notices) {
    if (notice === 'success') {
      if (canMarkTransferSucceeded(status)) status = 'SUCCESS';
      continue;
    }
    // failed | reversed
    if (isSettledPayoutStatus(status)) continue;
    status = notice === 'failed' ? 'FAILED' : 'REVERSED';
    balance += AMOUNT;
  }

  return { status, balance };
}

test('a delivered transfer is marked successful and moves no balance', () => {
  assert.deepEqual(replayNotices(['success']), { status: 'SUCCESS', balance: 0 });
});

test('a failed transfer restores the host balance exactly once', () => {
  assert.deepEqual(replayNotices(['failed']), { status: 'FAILED', balance: AMOUNT });
});

test('a replayed success after a reversal cannot reopen the payout', () => {
  // The bug this pins: the payout was settled and the balance restored, then a
  // late success marked it SUCCESS again, so the next reversal restored the
  // balance a second time.
  assert.deepEqual(replayNotices(['success', 'reversed', 'success', 'reversed']), {
    status: 'REVERSED',
    balance: AMOUNT,
  });
});

test('a replayed failure after a failed transfer does not credit twice', () => {
  assert.deepEqual(replayNotices(['failed', 'success', 'failed']), {
    status: 'FAILED',
    balance: AMOUNT,
  });
});

test('the same notice delivered many times still credits once', () => {
  for (const notice of ['failed', 'reversed']) {
    const outcome = replayNotices(Array(5).fill(notice));
    assert.equal(outcome.balance, AMOUNT, `${notice} repeated must credit once`);
    assert.equal(outcome.status, notice === 'failed' ? 'FAILED' : 'REVERSED');
  }
});

test('a success delivered twice is idempotent and moves no balance', () => {
  assert.deepEqual(replayNotices(['success', 'success']), { status: 'SUCCESS', balance: 0 });
});

test('a success arriving after the balance was restored is ignored', () => {
  // Reordering is the realistic shape: the reversal is processed first.
  assert.deepEqual(replayNotices(['reversed', 'success']), {
    status: 'REVERSED',
    balance: AMOUNT,
  });
});

test('every settled status refuses a later success', () => {
  for (const settled of SETTLED_PAYOUT_STATUSES) {
    assert.equal(isSettledPayoutStatus(settled), true);
    assert.equal(canMarkTransferSucceeded(settled), false, `${settled} must stay settled`);
  }
});

test('states that are still in flight may be marked successful', () => {
  for (const live of ['PENDING', 'PROCESSING', 'SUCCESS']) {
    assert.equal(canMarkTransferSucceeded(live), true, `${live} may move to SUCCESS`);
  }
});
