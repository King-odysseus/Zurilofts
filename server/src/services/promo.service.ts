import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';
import { calculatePricing } from '../utils/pricing.js';

export async function validatePromoCode(code: string, subtotal: number) {
  const promo = await prisma.promoCode.findUnique({ where: { code: code.toUpperCase() } });

  if (!promo) throw new ValidationError('Invalid promo code');
  if (!promo.active) throw new ValidationError('This promo code is no longer active');

  const now = new Date();
  if (now < promo.validFrom) throw new ValidationError('This promo code is not yet valid');
  if (now > promo.validUntil) throw new ValidationError('This promo code has expired');

  if (promo.maxUses !== null && promo.currentUses >= promo.maxUses) {
    throw new ValidationError('This promo code has been fully redeemed');
  }

  if (promo.minBookingAmount !== null && subtotal < promo.minBookingAmount) {
    throw new ValidationError(
      `Minimum booking of KES ${promo.minBookingAmount.toLocaleString()} required for this code`
    );
  }

  const pricing = calculatePricing(1, subtotal, promo.discountPercent, promo.maxDiscount);
  // calculatePricing expects pricePerNight and nights, so discount calc needs adjustment
  // We passed sub as nights and 1 as price so: subtotal = 1 * subtotal
  // Actually let's just redo: discount is on subtotal
  let discountAmount = Math.round(subtotal * (promo.discountPercent / 100));
  if (promo.maxDiscount !== null && discountAmount > promo.maxDiscount) {
    discountAmount = promo.maxDiscount;
  }

  return {
    valid: true,
    code: promo.code,
    discountPercent: promo.discountPercent,
    discountAmount,
    finalSubtotal: subtotal - discountAmount,
  };
}

export async function createPromoCode(data: any) {
  const existing = await prisma.promoCode.findUnique({ where: { code: data.code } });
  if (existing) throw new ConflictError('A promo code with this code already exists');

  return prisma.promoCode.create({ data });
}

export async function listPromoCodes() {
  return prisma.promoCode.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { bookings: true } },
    },
  });
}

export async function updatePromoCode(id: string, data: any) {
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) throw new NotFoundError('Promo code');
  return prisma.promoCode.update({ where: { id }, data });
}

export async function deletePromoCode(id: string) {
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) throw new NotFoundError('Promo code');
  // Soft delete — just deactivate
  return prisma.promoCode.update({ where: { id }, data: { active: false } });
}
