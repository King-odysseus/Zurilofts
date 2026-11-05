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
  canSettleFailedTransfer,
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
    // failed | reversed - the current state decides, not the order the notices
    // arrived in. A notice that may not apply to this state is ignored.
    const settlement = notice === 'failed' ? 'FAILED' : 'REVERSED';
    if (!canSettleFailedTransfer(status, settlement)) continue;
    status = settlement;
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

test('a failure notice cannot refund a transfer the provider already delivered', () => {
  // The bug this pins: SUCCESS was not in the settled set, so a delayed or
  // replayed `transfer.failed` flipped a delivered payout to FAILED and restored
  // the host balance for money that had already been sent.
  assert.equal(canSettleFailedTransfer('SUCCESS', 'FAILED'), false);
  assert.deepEqual(replayNotices(['success', 'failed']), { status: 'SUCCESS', balance: 0 });
  assert.deepEqual(replayNotices(['success', 'failed', 'failed']), { status: 'SUCCESS', balance: 0 });
});

test('a reversal after a success restores the balance, exactly once', () => {
  // Different event, different meaning: the money genuinely came back from the
  // recipient bank, so the host is owed it again - but only once.
  assert.equal(canSettleFailedTransfer('SUCCESS', 'REVERSED'), true);
  assert.deepEqual(replayNotices(['success', 'reversed', 'reversed', 'success']), {
    status: 'REVERSED',
    balance: AMOUNT,
  });
});

test('no ordering of contradicting notices ever credits the host twice', () => {
  const notices = ['success', 'failed', 'reversed'];
  const permutations = (items: string[]): string[][] =>
    items.length <= 1
      ? [items]
      : items.flatMap((item, i) =>
          permutations([...items.slice(0, i), ...items.slice(i + 1)]).map((rest) => [item, ...rest]),
        );

  for (const order of permutations(notices)) {
    for (const repeat of [1, 2]) {
      const outcome = replayNotices(order.flatMap((n) => Array(repeat).fill(n)));
      assert.ok(
        outcome.balance <= AMOUNT,
        `${order.join(',')} x${repeat} credited ${outcome.balance}, more than ${AMOUNT}`,
      );
    }
  }
});
