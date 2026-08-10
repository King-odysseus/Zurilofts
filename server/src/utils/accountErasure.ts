export interface AccountRetentionSummary {
  guestBookings: number;
  properties: number;
  payouts: number;
  hasWallet: boolean;
}

export interface OutstandingHostFundsSummary {
  walletBalance: number;
  payoutStatuses: string[];
}

/** Keep an anonymised user row whenever business records still reference it. */
export function requiresAccountRetention(summary: AccountRetentionSummary): boolean {
  return (
    summary.guestBookings > 0 ||
    summary.properties > 0 ||
    summary.payouts > 0 ||
    summary.hasWallet
  );
}

/** Erasure must wait until money owed to a host is resolved by staff. */
export function hasOutstandingHostFunds(summary: OutstandingHostFundsSummary): boolean {
  return (
    summary.walletBalance > 0 ||
    summary.payoutStatuses.some((status) => status === 'PENDING' || status === 'PROCESSING')
  );
}
