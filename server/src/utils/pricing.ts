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
