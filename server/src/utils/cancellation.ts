/**
 * The cancellation policy, in one place.
 *
 * The same three tiers are written as words in the Terms (section 6.1) and shown
 * as real dates in the checkout. Kenyan consumer law expects a shopper to be told
 * the terms that bind them before they pay, and a published policy nobody can
 * point at afterwards is hard to rely on, so the numbers live here: the Terms
 * quote them, the checkout renders them, and the version below is stamped on the
 * booking so the terms that applied to a stay stay provable after the policy
 * changes.
 */

/**
 * Bump this whenever a tier boundary or a refund percentage changes. It is
 * stored on every new booking, which is why it must never be edited in place.
 */
export const CANCELLATION_POLICY_VERSION = '2026-11-04';

// Whole days before the check-in day. The Terms read "more than 14 days",
// "7-14 days" and "less than 7 days", so 15 or more is the full refund, 7 to 14
// is half, and 6 or fewer is nothing. Expressed as the two boundaries the Terms
// name, so changing the policy is a change to one number here.
export const FULL_REFUND_DAYS_BEFORE_CHECK_IN = 14;
export const HALF_REFUND_DAYS_BEFORE_CHECK_IN = 7;

const DAY_MS = 86_400_000;
// Kenya is UTC+3 all year with no daylight saving, so a fixed offset is exact
// and the deadline dates a guest reads match the days on their own calendar.
const KENYA_OFFSET_MS = 3 * 60 * 60 * 1000;

export type CancellationTierCode = 'FULL' | 'HALF' | 'NONE';

export interface CancellationTier {
  code: CancellationTierCode;
  /** Share of the nightly rate (the `subtotal`) returned, 0 to 100. */
  nightlyRateRefundPercent: number;
  /** The Terms refund the cleaning fee only in the top tier. */
  cleaningFeeRefundable: boolean;
}

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Turns a check-in value into a moment, refusing anything that is not a real
 * date. `new Date('2026-02-31')` does not fail: it silently becomes 3 March, so
 * a policy deadline computed from a typo would be confidently wrong. The round
 * trip back to a string is what proves the date exists.
 */
function toMoment(checkIn: Date | string): Date {
  if (checkIn instanceof Date) {
    if (Number.isNaN(checkIn.getTime())) throw new RangeError('Check-in date is not a real date');
    return checkIn;
  }
  if (typeof checkIn !== 'string' || !DATE_ONLY.test(checkIn)) {
    throw new RangeError('Check-in date must be a YYYY-MM-DD date or a Date');
  }
  const parsed = new Date(`${checkIn}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== checkIn) {
    throw new RangeError('Check-in date is not a real date');
  }
  return parsed;
}

/** The calendar date it is in Nairobi at `moment`, which is the day a guest counts in. */
function kenyaDate(moment: Date): CalendarDate {
  const shifted = new Date(moment.getTime() + KENYA_OFFSET_MS);
  return { year: shifted.getUTCFullYear(), month: shifted.getUTCMonth(), day: shifted.getUTCDate() };
}

/** Whole days from `from` to `to`, ignoring the time of day. */
function wholeDaysBetween(from: CalendarDate, to: CalendarDate): number {
  const start = Date.UTC(from.year, from.month, from.day);
  const end = Date.UTC(to.year, to.month, to.day);
  return Math.round((end - start) / DAY_MS);
}

/** Moves a calendar date by `days`, returning a YYYY-MM-DD string. */
function shiftDate(date: CalendarDate, days: number): string {
  return new Date(Date.UTC(date.year, date.month, date.day + days)).toISOString().slice(0, 10);
}

/**
 * Whole days from now until the check-in day, in Nairobi time. The check-in day
 * itself is 0, the day before it is 1, and so on. A date that has already passed
 * comes back negative rather than being clamped to zero, because "already gone"
 * and "today" are different answers and both are needed.
 */
export function daysBeforeCheckIn(checkIn: Date | string, now: Date = new Date()): number {
  return wholeDaysBetween(kenyaDate(now), kenyaDate(toMoment(checkIn)));
}

/** The tier that applies a given number of whole days before check-in. */
export function cancellationTierFor(daysBefore: number): CancellationTier {
  // "More than 14 days" is 15 or more: on the 14th day before check-in the guest
  // is exactly 14 days away, which is inside the 7-14 band, not outside it.
  if (daysBefore > FULL_REFUND_DAYS_BEFORE_CHECK_IN) {
    return { code: 'FULL', nightlyRateRefundPercent: 100, cleaningFeeRefundable: true };
  }
  if (daysBefore >= HALF_REFUND_DAYS_BEFORE_CHECK_IN) {
    return { code: 'HALF', nightlyRateRefundPercent: 50, cleaningFeeRefundable: false };
  }
  return { code: 'NONE', nightlyRateRefundPercent: 0, cleaningFeeRefundable: false };
}

export interface CancellationTerms {
  policyVersion: string;
  daysBeforeCheckIn: number;
  tier: CancellationTier;
  /**
   * The last Nairobi calendar day on which a full refund still applies, and the
   * last day on which a half refund still applies. Both are returned whether or
   * not they have passed: the checkout decides what to show, and a past date is
   * still the truthful answer to "when did that window close".
   */
  fullRefundUntil: string;
  halfRefundUntil: string;
}

/**
 * What the policy says about this stay, now. Derived only from the check-in date
 * and the clock, so the quote, the checkout and the tests cannot disagree.
 */
export function cancellationTerms(checkIn: Date | string, now: Date = new Date()): CancellationTerms {
  const checkInMoment = toMoment(checkIn);
  const daysBefore = daysBeforeCheckIn(checkInMoment, now);
  const checkInDay = kenyaDate(checkInMoment);

  return {
    policyVersion: CANCELLATION_POLICY_VERSION,
    daysBeforeCheckIn: daysBefore,
    tier: cancellationTierFor(daysBefore),
    // The last day inside the 7-14 band is the 7th day before check-in, so that
    // window closes on check-in minus 7. Full refund needs 15 or more days, so
    // its last day is check-in minus 15.
    fullRefundUntil: shiftDate(checkInDay, -(FULL_REFUND_DAYS_BEFORE_CHECK_IN + 1)),
    halfRefundUntil: shiftDate(checkInDay, -HALF_REFUND_DAYS_BEFORE_CHECK_IN),
  };
}
