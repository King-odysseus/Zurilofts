/**
 * Calculate booking financials.
 *
 * Rules (match frontend convention):
 * - cleaningFee: flat KES 1,500
 * - serviceFee: GUEST_SERVICE_FEE_RATE of the subtotal, rounded to nearest KES.
 *   The rate arrives as an argument; the fallback is 0 (no guest fee).
 * - discount: percentage off subtotal, capped at maxDiscount if set
 * - total = subtotal + cleaningFee + serviceFee - discount
 *
 * The guest fee rate arrives as an argument rather than being read from config
 * here, so this module stays pure and testable without environment variables.
 */

/** Flat fees and rates used across all pricing calculations. */

/** Extra-guest surcharge per guest per night in KES. */
export const EXTRA_GUEST_FEE_PER_NIGHT = 800;

/** Flat cleaning fee per stay in KES. */
export const CLEANING_FEE = 1500;

/**
 * Fallback guest service fee used when the caller passes no rate. Zero, because
 * the platform fee is charged to the host (HOST_COMMISSION_RATE) and a guest
 * must never be charged a fee the advertised price did not include. A caller
 * that wants a guest fee has to pass one deliberately.
 */
export const SERVICE_FEE_RATE = 0;

/**
 * Discount amount in KES: discountPercent off the subtotal, capped at maxDiscount
 * when the code defines one. Every pricing path and promo validation share this,
 * so a previewed discount can never disagree with the discount actually charged.
 */
export function computeDiscountAmount(
  subtotal: number,
  discountPercent: number = 0,
  maxDiscount?: number | null,
): number {
  const raw = Math.round(subtotal * (discountPercent / 100));
  if (maxDiscount !== null && maxDiscount !== undefined && raw > maxDiscount) return maxDiscount;
  return raw;
}

export function calculatePricing(
  pricePerNight: number,
  nights: number,
  discountPercent: number = 0,
  maxDiscount?: number | null,
  serviceFeeRate: number = SERVICE_FEE_RATE
): {
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  discountAmount: number;
  total: number;
} {
  const subtotal = pricePerNight * nights;
  const cleaningFee = CLEANING_FEE;
  const serviceFee = Math.round(subtotal * serviceFeeRate);

  const discountAmount = computeDiscountAmount(subtotal, discountPercent, maxDiscount);

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
  maxDiscount?: number | null,
  serviceFeeRate: number = SERVICE_FEE_RATE
): {
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  discountAmount: number;
  total: number;
} {
  const cleaningFee = CLEANING_FEE;
  const serviceFee = Math.round(subtotal * serviceFeeRate);

  const discountAmount = computeDiscountAmount(subtotal, discountPercent, maxDiscount);

  const total = subtotal + cleaningFee + serviceFee - discountAmount;
  return { subtotal, cleaningFee, serviceFee, discountAmount, total };
}

// ---------------------------------------------------------------
// Payment gateway fee (what Paystack charges for collecting the money)
// ---------------------------------------------------------------

/**
 * Paystack's Kenya collection fee as a fraction of the amount charged: 2.9% per
 * local card transaction. The guest pays it, so a stay's advertised price is
 * never quietly reduced by the cost of taking the payment.
 */
export const GATEWAY_FEE_RATE = 0.029;

/** Flat part of the gateway fee per transaction, in KES. Nil on collections. */
export const GATEWAY_FEE_FIXED_KES = 0;

/** Ceiling on the gateway fee in KES. 0 means no ceiling. */
export const GATEWAY_FEE_CAP_KES = 0;

export interface GatewayFeeConfig {
  /** Fraction of the amount charged, e.g. 0.029 for 2.9%. */
  rate: number;
  /** Flat KES added per transaction. */
  fixedKes: number;
  /** Maximum KES the gateway fee may reach. 0 = uncapped. */
  capKes: number;
}

/**
 * The gateway fee to add on top of netAmountKes so the platform still receives
 * netAmountKes after Paystack takes its cut.
 *
 * The fee has to be solved from the grossed-up total, not from the net, because
 * Paystack charges a percentage of what is actually collected:
 *
 *   gross = net + fee   and   fee = rate * gross + fixed
 *   =>  fee = (rate * net + fixed) / (1 - rate)
 *
 * Charging rate * net instead would leave the platform short by the fee that
 * Paystack takes on the fee itself. The result is rounded UP to the whole
 * shilling, so rounding can only favour the platform, never leave a shortfall.
 *
 * A rate of 0 switches the fee off, which makes the platform absorb it.
 */
export function computeGatewayFee(netAmountKes: number, config: GatewayFeeConfig): number {
  if (!Number.isFinite(netAmountKes) || netAmountKes <= 0) return 0;
  const { rate, fixedKes, capKes } = config;
  if (!Number.isFinite(rate) || rate <= 0) return 0;
  // At or above 100% the gross-up has no finite answer, so a bad config must
  // fail here rather than charge an absurd amount.
  if (rate >= 1) {
    throw new Error(`Gateway fee rate must be below 1 (100%), got ${rate}`);
  }

  const raw = (rate * netAmountKes + fixedKes) / (1 - rate);
  let fee = Math.ceil(raw);
  if (capKes > 0 && fee > capKes) fee = Math.round(capKes);
  return Math.max(0, fee);
}

/**
 * The guest-facing total for a charge, and the gateway fee folded into it.
 *
 * chargeableKes is everything the guest owes BEFORE the gateway fee (stay,
 * add-ons and fees, discount already applied). The returned total is what gets
 * sent to Paystack, so total === chargeableKes + gatewayFee by construction and
 * a booking row always reconciles against what was actually collected.
 */
export function totalWithGatewayFee(
  chargeableKes: number,
  config: GatewayFeeConfig,
): { gatewayFee: number; total: number } {
  const chargeable = Math.max(0, Math.round(chargeableKes));
  const gatewayFee = computeGatewayFee(chargeable, config);
  return { gatewayFee, total: chargeable + gatewayFee };
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
  // night * 2^(capped - LATE_CHECKOUT_FULL_NIGHT_HOURS): at the 3h cap this is a full
  // night; each hour earlier halves it (2h = half night, 1h = quarter).
  return Math.round(nightlyPrice * Math.pow(2, capped - LATE_CHECKOUT_FULL_NIGHT_HOURS));
}

/**
 * Extra-guest surcharge: KES EXTRA_GUEST_FEE_PER_NIGHT per guest
 * exceeding the bed-option capacity (2 guests for 1-bed, 4 for 2-bed),
 * per night of the stay. Returns 0 when guests do not exceed capacity.
 */
/**
 * The check-out times a guest may choose, each with the fee it costs at the
 * given nightly rate. Served by the quote endpoint so the checkout dropdown
 * labels come from the same rule that charges the guest.
 */
export function lateCheckoutOptions(nightlyPrice: number): { time: string; fee: number }[] {
  const [standardHour, standardMinute] = STANDARD_CHECK_OUT_TIME.split(':').map(Number);
  const standard = standardHour * 60 + (standardMinute || 0);
  return Array.from({ length: LATE_CHECKOUT_FULL_NIGHT_HOURS + 1 }, (_, hoursLater) => {
    const minutes = standard + hoursLater * 60;
    const h = String(Math.floor(minutes / 60)).padStart(2, '0');
    const m = String(minutes % 60).padStart(2, '0');
    const time = h + ':' + m;
    return { time, fee: lateCheckoutFee(time, nightlyPrice) };
  });
}
export function computeExtraGuestFee(
  guests: number,
  bedOption: string | null | undefined,
  nights: number,
): number {
  const maxForBed = bedOption === '2bed' ? 4 : 2;
  return Math.max(0, guests - maxForBed) * EXTRA_GUEST_FEE_PER_NIGHT * nights;
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
