import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError, ForbiddenError } from '../types/index.js';
import { computeDiscountAmount } from '../utils/pricing.js';

/** A promo as far as scoping is concerned. Pure, so it is unit-testable. */
export interface PromoScope {
  hostId: string | null;
  propertyId: string | null;
}

/** The listing a guest is trying to book. */
export interface BookingTarget {
  propertyId: string;
  hostId: string | null;
}

/**
 * Whether a code may be applied to this listing.
 *
 * A platform code (hostId null) works everywhere. A host's own code only works
 * on that host's listings, and when it names a single property, only on that
 * one. This is what stops host A's discount from being spent against host B's
 * payout - the discount is always deducted from the listing owner's earnings.
 */
export function isPromoUsableForProperty(promo: PromoScope, target: BookingTarget): boolean {
  if (!promo.hostId) return true;
  if (promo.hostId !== target.hostId) return false;
  if (promo.propertyId && promo.propertyId !== target.propertyId) return false;
  return true;
}

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

// ── Host-owned discounts ───────────────────────────────────────────────
// A host funds their own discounts out of their payout, so they create and
// manage them here. Every function below is scoped to the calling host: an
// admin's platform-wide codes are never visible or editable through these.

/** Load a host's own code, refusing anything they do not own. */
async function loadOwnPromo(hostId: string, id: string) {
  const promo = await prisma.promoCode.findUnique({ where: { id } });
  if (!promo) throw new NotFoundError('Discount');
  // Not-found rather than forbidden for a code owned by someone else, so this
  // endpoint cannot be used to confirm that a given code id exists.
  if (promo.hostId !== hostId) throw new NotFoundError('Discount');
  return promo;
}

/** Confirm a named listing belongs to this host before scoping a code to it. */
async function assertOwnsProperty(hostId: string, propertyId: string) {
  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    select: { hostId: true },
  });
  if (!property || property.hostId !== hostId) {
    throw new ForbiddenError('You can only create a discount for your own listing');
  }
}

export async function listHostPromoCodes(hostId: string) {
  return prisma.promoCode.findMany({
    where: { hostId },
    orderBy: { createdAt: 'desc' },
    include: { _count: { select: { bookings: true } } },
  });
}

/** Shape validated by hostPromoCreateSchema before it reaches this service. */
export interface HostPromoInput {
  code: string;
  discountPercent: number;
  validFrom: string;
  validUntil: string;
  maxDiscount?: number;
  minBookingAmount?: number;
  maxUses?: number;
  propertyId?: string;
}

export async function createHostPromoCode(hostId: string, data: HostPromoInput) {
  const code = data.code.toUpperCase();
  const existing = await prisma.promoCode.findUnique({ where: { code } });
  if (existing) throw new ConflictError('A discount with this code already exists');

  if (data.propertyId) await assertOwnsProperty(hostId, data.propertyId);

  // hostId and createdBy come from the authenticated caller, never the body,
  // so a host cannot create a code that spends another host's earnings.
  return prisma.promoCode.create({
    data: {
      code,
      discountPercent: data.discountPercent,
      validFrom: new Date(data.validFrom),
      validUntil: new Date(data.validUntil),
      maxDiscount: data.maxDiscount ?? null,
      minBookingAmount: data.minBookingAmount ?? null,
      maxUses: data.maxUses ?? null,
      propertyId: data.propertyId ?? null,
      hostId,
      createdBy: hostId,
    },
  });
}

export async function updateHostPromoCode(
  hostId: string,
  id: string,
  data: Partial<HostPromoInput> & { active?: boolean },
) {
  await loadOwnPromo(hostId, id);
  if (data.propertyId) await assertOwnsProperty(hostId, data.propertyId);

  // Only these fields are patchable. Ownership (hostId/createdBy) is omitted on
  // purpose: re-pointing a code at another host is exactly the abuse the scope
  // check exists to prevent, so it must not be reachable through an update.
  return prisma.promoCode.update({
    where: { id },
    data: {
      ...(data.code !== undefined && { code: data.code.toUpperCase() }),
      ...(data.discountPercent !== undefined && { discountPercent: data.discountPercent }),
      ...(data.validFrom !== undefined && { validFrom: new Date(data.validFrom) }),
      ...(data.validUntil !== undefined && { validUntil: new Date(data.validUntil) }),
      ...(data.maxDiscount !== undefined && { maxDiscount: data.maxDiscount }),
      ...(data.minBookingAmount !== undefined && { minBookingAmount: data.minBookingAmount }),
      ...(data.maxUses !== undefined && { maxUses: data.maxUses }),
      ...(data.propertyId !== undefined && { propertyId: data.propertyId }),
      ...(data.active !== undefined && { active: data.active }),
    },
  });
}

export async function deactivateHostPromoCode(hostId: string, id: string) {
  await loadOwnPromo(hostId, id);
  // Deactivate rather than delete: bookings reference the code they used.
  return prisma.promoCode.update({ where: { id }, data: { active: false } });
}
