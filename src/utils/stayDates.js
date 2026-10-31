// Stay dates for a property card: "5-7 Feb" plus how many nights that is.
//
// Dates arrive as plain YYYY-MM-DD or as an ISO string at UTC midnight, so the
// leading date part is read with a regex rather than `new Date(value)`: parsing
// "2027-02-05" and reading it with local getters moves the day backwards for
// anyone west of UTC and names a date the guest never picked.

const DAY_MONTH = { day: 'numeric', month: 'short', timeZone: 'UTC' };
const DAY_MONTH_YEAR = { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' };
const MS_PER_DAY = 86400000;

// Returns { year, month, day, stamp } or null. Round-tripping the stamp rejects
// impossible dates such as 2027-02-31, which a regex alone would accept and
// Date.UTC would silently roll into March.
function calendarDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return null;

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const stamp = Date.UTC(year, month - 1, day);
  const roundTrip = new Date(stamp);
  if (roundTrip.getUTCFullYear() !== year
    || roundTrip.getUTCMonth() !== month - 1
    || roundTrip.getUTCDate() !== day) return null;

  return { year, month, day, stamp };
}

function label(day, withYear) {
  return new Date(day.stamp).toLocaleDateString('en-GB', withYear ? DAY_MONTH_YEAR : DAY_MONTH);
}

export function nightsBetween(checkIn, checkOut) {
  const start = calendarDay(checkIn);
  const end = calendarDay(checkOut);
  if (!start || !end) return 0;

  // Both stamps are UTC midnights, so the gap is a whole number of days and no
  // daylight-saving hour can shorten a night. Anything at or below zero means
  // the dates are equal or reversed, which is not a stay.
  const nights = Math.round((end.stamp - start.stamp) / MS_PER_DAY);
  return nights > 0 ? nights : 0;
}

export function formatStayDates(checkIn, checkOut) {
  const start = calendarDay(checkIn);
  const end = calendarDay(checkOut);
  if (!start || !end || end.stamp <= start.stamp) return null;

  // Different years: both dates need their year, or the range reads as one year.
  if (start.year !== end.year) return `${label(start, true)} - ${label(end, true)}`;

  // Different months, same year: the year is implied, so only the months show.
  if (start.month !== end.month) return `${label(start, false)} - ${label(end, false)}`;

  // Same month: the month is written once, because "5 Feb - 7 Feb" reads like
  // two separate stays at a glance.
  return `${start.day}-${label(end, false)}`;
}

/**
 * The last day a guest can cancel in and still get their nightly rate back,
 * or null when there is no date or the window has already closed.
 *
 * The 14 days come from the standard policy in the Terms page (section 6.1):
 * more than 14 days before check-in is a full refund of the nightly rate and
 * cleaning fee, with the service fee excluded. Callers pass this straight into
 * the card's policy pill, so the wording and the rule stay in one place.
 */
export function freeCancellationUntil(checkIn) {
  const start = calendarDay(checkIn);
  if (!start) return null;

  const cutoff = start.stamp - 14 * MS_PER_DAY;
  const today = new Date();
  const todayStamp = Date.UTC(today.getFullYear(), today.getMonth(), today.getDate());

  // Inside the 14 days the promise would be false, so the card shows no pill
  // rather than a date that has already passed.
  if (cutoff <= todayStamp) return null;
  return label({ stamp: cutoff }, false);
}
