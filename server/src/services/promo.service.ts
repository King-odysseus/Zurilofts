import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';
import { computeDiscountAmount } from '../utils/pricing.js';

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

  const discountAmount = computeDiscountAmount(subtotal, promo.discountPercent, promo.maxDiscount);

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

  const promo = await prisma.promoCode.create({ data });

  // Announce active promo codes to every subscribed browser (best-effort)
  if (promo.active) {
    try {
      const { getAllSubscriptions, sendPush } = await import('./push.service.js');
      const subs = await getAllSubscriptions();
      sendPush(
        subs.map((s: { endpoint: string; keys: string }) => ({ endpoint: s.endpoint, keys: s.keys })),
        'New Promo Code!',
        `Use code ${promo.code} for ${promo.discountPercent}% off your next stay.`,
        '/properties',
      );
    } catch (err) { console.error('Push notification failed:', err); }
  }

  return promo;
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
  // Soft delete - just deactivate
  return prisma.promoCode.update({ where: { id }, data: { active: false } });
}
