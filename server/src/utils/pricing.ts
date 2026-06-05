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
 * Calculate number of nights between two dates.
 */
export function calculateNights(checkIn: Date, checkOut: Date): number {
  const diffMs = checkOut.getTime() - checkIn.getTime();
  return Math.max(1, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}
