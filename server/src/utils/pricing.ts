/**
 * Calculate booking financials.
 *
 * Rules (match frontend convention):
 * - cleaningFee: flat KES 1,500
 * - serviceFee: 12% of subtotal, rounded to nearest KES
 * - discount: percentage off subtotal, capped at maxDiscount if set
 * - total = subtotal + cleaningFee + serviceFee - discount
 */
export function calculatePricing(
  pricePerNight: number,
  nights: number,
  discountPercent: number = 0,
  maxDiscount?: number | null
): {
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  discountAmount: number;
  total: number;
} {
  const subtotal = pricePerNight * nights;
  const cleaningFee = 1500;
  const serviceFee = Math.round(subtotal * 0.12);

  let discountAmount = Math.round(subtotal * (discountPercent / 100));
  if (maxDiscount !== null && maxDiscount !== undefined && discountAmount > maxDiscount) {
    discountAmount = maxDiscount;
  }

  const total = subtotal + cleaningFee + serviceFee - discountAmount;

  return { subtotal, cleaningFee, serviceFee, discountAmount, total };
}

/**
 * Same fee rules as calculatePricing, but from an already-computed subtotal
 * (used when the subtotal varies per night due to seasonal pricing).
 */
export function calculateFees(
  subtotal: number,
  discountPercent: number = 0,
  maxDiscount?: number | null
): {
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  discountAmount: number;
  total: number;
} {
  const cleaningFee = 1500;
  const serviceFee = Math.round(subtotal * 0.12);

  let discountAmount = Math.round(subtotal * (discountPercent / 100));
  if (maxDiscount !== null && maxDiscount !== undefined && discountAmount > maxDiscount) {
    discountAmount = maxDiscount;
  }

  const total = subtotal + cleaningFee + serviceFee - discountAmount;
  return { subtotal, cleaningFee, serviceFee, discountAmount, total };
}

/**
 * Standard stay times and the late check-out policy.
 * Check-in from 3:00 PM, check-out by 10:00 AM. A guest may request a later
 * check-out; every hour (rounded up) past 10:00 AM adds a flat KES fee.
 */
export const STANDARD_CHECK_IN_TIME = '15:00'; // 3:00 PM
export const STANDARD_CHECK_OUT_TIME = '10:00'; // 10:00 AM
// At/after this many hours late, the fee equals one full night. Capped at 3h
// so the host still has time to turn the apartment before the next booking.
export const LATE_CHECKOUT_FULL_NIGHT_HOURS = 3;

/**
 * Late check-out fee in KES for a requested check-out time ("HH:MM", 24h).
 *
 * Calibrated doubling: each started hour past the standard 10:00 AM doubles the
 * fee, landing exactly on one night's price at 3 hours late and capping there:
 *   1h = night/4, 2h = night/2, 3h+ = full extra night.
 * Returns 0 for an empty/invalid time or any time at/before 10:00 AM.
 */
export function lateCheckoutFee(checkOutTime: string | null | undefined, nightlyPrice: number): number {
  if (!checkOutTime || !nightlyPrice) return 0;
  const m = /^(\d{1,2}):(\d{2})$/.exec(checkOutTime.trim());
  if (!m) return 0;
  const minutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
  const standardMinutes = 10 * 60; // 10:00 AM
  if (minutes <= standardMinutes) return 0;
  const hoursLate = Math.ceil((minutes - standardMinutes) / 60);
  const capped = Math.min(hoursLate, LATE_CHECKOUT_FULL_NIGHT_HOURS);
  // night * 2^(capped - 5): capped=5 → full night; each earlier hour halves it.
  return Math.round(nightlyPrice * Math.pow(2, capped - LATE_CHECKOUT_FULL_NIGHT_HOURS));
}

/**
 * Calculate number of nights between two dates.
 */
export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

export interface PriceRuleLike {
  start: Date | string;
  end: Date | string;
  price: number;
}

/**
 * Nightly price for a specific date: the matching seasonal PriceRule wins,
 * otherwise the base price. A rule covers a night when start <= date < end.
 */
export function priceForNight(date: Date, basePrice: number, rules: PriceRuleLike[]): number {
  for (const rule of rules) {
    const start = new Date(rule.start);
    const end = new Date(rule.end);
    if (date >= start && date < end) return rule.price;
  }
  return basePrice;
}

/**
 * Sum the nightly prices across a stay, applying any seasonal rules per night.
 * Returns the subtotal in KES.
 */
export function computeSubtotal(
  checkIn: Date,
  nights: number,
  basePrice: number,
  rules: PriceRuleLike[] = []
): number {
  if (!rules.length) return basePrice * nights;
  let subtotal = 0;
  const cursor = new Date(checkIn);
  for (let i = 0; i < nights; i++) {
    subtotal += priceForNight(cursor, basePrice, rules);
    cursor.setDate(cursor.getDate() + 1);
  }
  return subtotal;
}
