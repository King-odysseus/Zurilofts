/**
 * When a host's earnings become theirs to withdraw.
 *
 * A booking's host share used to be credited the moment payment cleared, so a
 * host could be paid for a night that had not happened yet. If the guest then
 * cancelled or disputed, the money had already left and had to be clawed back.
 * Holding it until check-in plus a short buffer keeps that risk with the
 * platform's own accounting instead of the host's bank account.
 *
 * Pure on purpose: the whole rule is testable without a database or a clock.
 */

/** Default hold after check-in before a host's share unlocks. */
export const DEFAULT_HOST_FUNDS_HOLD_HOURS = 24;

/**
 * When a booking's host share unlocks: check-in plus the hold window.
 * A missing or nonsensical hold falls back to the default rather than paying
 * out early.
 */
export function computeHostPayableAt(
  checkIn: Date,
  holdHours: number = DEFAULT_HOST_FUNDS_HOLD_HOURS,
): Date {
  const hours = Number.isFinite(holdHours) && holdHours >= 0 ? holdHours : DEFAULT_HOST_FUNDS_HOLD_HOURS;
  return new Date(checkIn.getTime() + hours * 60 * 60 * 1000);
}

/** The fields the release decision needs from a booking. */
export interface HostFundsState {
  status: string;
  hostNetAmount?: number | null;
  hostPayableAt?: Date | null;
  hostFundsReleasedAt?: Date | null;
}

/**
 * True when a booking's host share should now be moved into the withdrawable
 * balance: paid for, still confirmed, carries a payout, hold expired, and not
 * released already.
 *
 * A null hostPayableAt means the row predates the hold rule and was backfilled
 * as already released, so it is never due - that keeps the wallet from being
 * credited a second time.
 */
export function isHostFundsDue(booking: HostFundsState, now: Date): boolean {
  if (booking.status !== 'CONFIRMED') return false;
  if (!booking.hostNetAmount || booking.hostNetAmount <= 0) return false;
  if (booking.hostFundsReleasedAt) return false;
  if (!booking.hostPayableAt) return false;
  return booking.hostPayableAt.getTime() <= now.getTime();
}
