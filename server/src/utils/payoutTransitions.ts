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
