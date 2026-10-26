import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { CLEANING_FEE, EXTRA_GUEST_FEE_PER_NIGHT } from '../utils/pricing.js';

// Landing-page numbers an admin may override. Happy stays is deliberately absent:
// it always comes from real completed guest stays (see review.service.getPublicStats),
// so it cannot be typed here.
const DEFAULTS: Record<string, string> = {
  starRating: '5.0',
  satisfaction: '0',
};

export async function getSetting(key: string): Promise<string> {
  const row = await prisma.appSetting.findUnique({ where: { key } });
  return row?.value ?? DEFAULTS[key] ?? '';
}

export async function getLandingStats(): Promise<{ starRating: number; satisfaction: number }> {
  const [starRating, satisfaction] = await Promise.all([
    getSetting('starRating'),
    getSetting('satisfaction'),
  ]);
  return {
    starRating: Number(starRating) || 5.0,
    satisfaction: Number(satisfaction) || 0,
  };
}

export async function setLandingStats(input: { starRating?: number; satisfaction?: number }) {
  if (input.starRating !== undefined) {
    await prisma.appSetting.upsert({
      where: { key: 'starRating' },
      create: { key: 'starRating', value: String(input.starRating) },
      update: { value: String(input.starRating) },
    });
  }
  if (input.satisfaction !== undefined) {
    await prisma.appSetting.upsert({
      where: { key: 'satisfaction' },
      create: { key: 'satisfaction', value: String(input.satisfaction) },
      update: { value: String(input.satisfaction) },
    });
  }
  return getLandingStats();
}

/**
 * The fee rules quoted to a prospective host on the public "become a host"
 * page, taken from the same config the booking flow charges from. The
 * calculator must never hardcode these: a rate change in config would then
 * silently make the page lie about what a host is paid.
 *
 * Percentages are returned as percentages (10 means 10%), not fractions, so a
 * client multiplying by 100 cannot get the unit wrong. Amounts are whole KES.
 */
export interface PublicFeeSchedule {
  commissionPercent: number;
  guestServiceFeePercent: number;
  withholdingTaxPercent: number;
  cleaningFee: number;
  extraGuestFeePerNight: number;
  fundsHoldHours: number;
  promoFunding: string;
  foundingPlaceLimit: number;
  foundingCommissionPercent: number;
  // Whether the host is paid the cleaning and late check-out fees. The page
  // states where that money goes, so it has to know the answer rather than
  // guess and promise a host income the payout code will not deliver.
  payCleaningFee: boolean;
  payLateCheckoutFee: boolean;
}

// Config is free text, so a typo would otherwise reach the public page as NaN
// and render "KES NaN" to every visitor. Out-of-range values fall back to the
// safe end of the range rather than throwing on a public endpoint.
//
// These two rate settings hold a FRACTION (0.1 is 10%), so the clamp has to
// happen before the multiply: clamping the result instead turns a mistakenly
// entered "15" into 1500% on a public page.
function fractionAsPercent(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return 0;
  return Math.min(n, 1) * 100;
}

// Withholding tax is stored as a percentage already ("5" means 5%), unlike the
// two fractions above, so it is clamped in place.
function percentage(value: string): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return 0;
  return Math.min(n, 100);
}

function hours(value: string): number {
  const n = Number(value);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
}

export function getPublicFeeSchedule(): PublicFeeSchedule {
  return {
    commissionPercent: fractionAsPercent(env.HOST_COMMISSION_RATE),
    guestServiceFeePercent: fractionAsPercent(env.GUEST_SERVICE_FEE_RATE),
    withholdingTaxPercent: percentage(env.WITHHOLDING_TAX_RATE),
    cleaningFee: CLEANING_FEE,
    extraGuestFeePerNight: EXTRA_GUEST_FEE_PER_NIGHT,
    fundsHoldHours: hours(env.HOST_FUNDS_HOLD_HOURS),
    promoFunding: env.PLATFORM_PROMO_FUNDING,
    foundingPlaceLimit: Math.max(0, Math.round(Number(env.FOUNDING_HOST_LIMIT) || 0)),
    foundingCommissionPercent: fractionAsPercent(env.FOUNDING_HOST_COMMISSION_RATE),
    payCleaningFee: env.HOST_PAY_CLEANING_FEE === 'true',
    payLateCheckoutFee: env.HOST_PAY_LATE_CHECKOUT_FEE === 'true',
  };
}
