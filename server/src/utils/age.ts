/**
 * Age rules for the 18+ condition in the Terms. A contract with a minor cannot
 * be enforced against them, so the check lives in one place that sign-up,
 * booking and payment all call.
 */

export const ADULT_AGE_YEARS = 18;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Parses a YYYY-MM-DD date of birth as a UTC date, or null when it is not a real
 * calendar date. `new Date('2001-02-31')` rolls over to March instead of failing,
 * so the round trip back to a string is what proves the date exists.
 */
export function parseDateOfBirth(value: unknown): Date | null {
  if (typeof value !== 'string' || !DATE_ONLY.test(value)) return null;
  const parsed = new Date(`${value}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10) === value ? parsed : null;
}

/**
 * True when the person is at least 18 on `now`. Someone born on 2008-06-15 is
 * not an adult until 2026-06-15 itself, so the comparison is on the whole date.
 * A missing or malformed date is never an adult: unknown must not pass an age gate.
 */
export function isAdultOn(dateOfBirth: unknown, now: Date = new Date()): boolean {
  const born = parseDateOfBirth(dateOfBirth);
  if (!born) return false;
  const adultFrom = new Date(Date.UTC(
    born.getUTCFullYear() + ADULT_AGE_YEARS,
    born.getUTCMonth(),
    born.getUTCDate(),
  ));
  // Feb 29 births: Date.UTC rolls 2025-02-29 to 2025-03-01, which is the
  // conventional "legal birthday" in non-leap years.
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  return adultFrom <= today;
}
