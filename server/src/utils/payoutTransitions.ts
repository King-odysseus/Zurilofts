/**
 * Which payout states may still move, and to where.
 *
 * Payment providers deliver transfer notices at least once and not necessarily
 * in order, so the same event can arrive twice and a late notice can contradict
 * an earlier one. Money is only moved by a transition that actually happens,
 * so every guard question here is "may this state change at all?" rather than
 * "what does the latest notice claim?".
 *
 * FAILED and REVERSED are terminal: the host's balance has already been
 * restored for those, and reopening one would either credit the same amount
 * twice or quietly hide money the host never received.
 */

/** Payout states from which nothing more can be reversed or reopened. */
export const SETTLED_PAYOUT_STATUSES = ['FAILED', 'REVERSED'] as const;

export type SettledPayoutStatus = (typeof SETTLED_PAYOUT_STATUSES)[number];

export function isSettledPayoutStatus(status: string): boolean {
  return (SETTLED_PAYOUT_STATUSES as readonly string[]).includes(status);
}

/**
 * May a transfer success notice move this payout to SUCCESS?
 *
 * A success notice can still arrive after the balance was restored - the
 * provider retries, or a replayed event lands after a reversal. Reopening the
 * payout there is what allowed a repeat reversal to credit the host a second
 * time, so a settled payout stays settled and the notice is reported instead.
 *
 * A payout already marked SUCCESS may be marked again: that is idempotent and
 * moves no money.
 */
export function canMarkTransferSucceeded(status: string): boolean {
  return !isSettledPayoutStatus(status);
}

/**
 * Source states each failure notice may settle a payout from.
 *
 * FAILED means the provider never delivered the money, so it may only settle a
 * payout that was still in flight. Applying it to a payout the provider already
 * confirmed as delivered would restore a balance for money that has moved, and
 * the next sweep would then pay the same shillings a second time.
 *
 * REVERSED is different: the money genuinely came back from the recipient bank,
 * so it may follow a success. Neither may follow FAILED or REVERSED - the
 * balance was already restored then, and repeating it would credit twice.
 */
export const FAILURE_NOTICE_SOURCE_STATUSES: Record<'FAILED' | 'REVERSED', readonly string[]> = {
  FAILED: ['PENDING', 'PROCESSING'],
  REVERSED: ['PENDING', 'PROCESSING', 'SUCCESS'],
};

/**
 * May a transfer FAILED or REVERSED notice settle this payout?
 *
 * Distinct from isSettledPayoutStatus, which only answers "has this already been
 * settled?". SUCCESS is settled for the failure direction while still being a
 * state a reversal may follow, so the question needs the notice as well.
 */
export function canSettleFailedTransfer(status: string, notice: 'FAILED' | 'REVERSED'): boolean {
  return FAILURE_NOTICE_SOURCE_STATUSES[notice].includes(status);
}
