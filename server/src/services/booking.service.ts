import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';
import { calculateFees, calculateNights, computeSubtotal, lateCheckoutFee } from '../utils/pricing.js';
import { isRangeAvailable } from './calendar.service.js';

// Normalize SQLite JSON fields to JS arrays for API responses
function normalizeBooking(booking: any) {
  const b = { ...booking };
  if (b.property) {
    const p = { ...b.property };
    if (p.imagesJson) {
      p.images = JSON.parse(p.imagesJson);
      delete p.imagesJson;
    }
    b.property = p;
  }
  // Parse the stored extra-guests JSON back into an array
  if ('additionalGuestsJson' in b) {
    try {
      b.additionalGuests = b.additionalGuestsJson ? JSON.parse(b.additionalGuestsJson) : [];
    } catch {
      b.additionalGuests = [];
    }
    delete b.additionalGuestsJson;
  }
  return b;
}

function normalizeBookings(bookings: any[]) {
  return bookings.map(normalizeBooking);
}

function getBedPrice(property: any, bedOption?: string): number {
  if (bedOption === '1bed' && property.price1Bed != null) return property.price1Bed;
  if (bedOption === '2bed' && property.price2Bed != null) return property.price2Bed;
  return property.price;
}

interface CreateBookingInput {
  userId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  bedOption?: string;
  checkInTime?: string;
  checkOutTime?: string;
  specialRequests?: string;
  additionalGuests?: { firstName: string; lastName: string }[];
  paymentMethod: string;
  promoCode?: string;
}

export async function createBooking(input: CreateBookingInput) {
  const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
  if (!property) throw new NotFoundError('Property');

  if (!property.available) {
    throw new ValidationError('This property is not currently available');
  }

  const checkInDate = new Date(input.checkIn);
  const checkOutDate = new Date(input.checkOut);

  if (checkInDate >= checkOutDate) {
    throw new ValidationError('Check-out date must be after check-in date');
  }

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  if (checkInDate < now) {
    throw new ValidationError('Check-in date cannot be in the past');
  }

  // Reject dates already taken by another booking or an imported/manual block
  const available = await isRangeAvailable(input.propertyId, checkInDate, checkOutDate);
  if (!available) {
    throw new ConflictError('Those dates are no longer available for this property');
  }

  // Enforce occupancy limits: 2 per bed, 6 absolute max
  const maxForBed = input.bedOption === '2bed' ? 4 : 2;
  if (input.guests > 6) {
    throw new ValidationError('Maximum 6 guests per property. Exceeding this is grounds for removal.');
  }

  // Determine effective base price based on bed option
  const effectivePrice = getBedPrice(property, input.bedOption);

  const nights = calculateNights(checkInDate, checkOutDate);
  const extraGuestFee = Math.max(0, input.guests - maxForBed) * 800 * nights;

  // Apply seasonal price rules per night (falls back to effectivePrice)
  const priceRules = await prisma.priceRule.findMany({
    where: { propertyId: input.propertyId },
    select: { start: true, end: true, price: true },
  });
  const subtotal = computeSubtotal(checkInDate, nights, effectivePrice, priceRules);

  // Handle promo code if provided
  let promoCodeId: string | null = null;
  let discountPercent = 0;
  let maxDiscount: number | null = null;

  if (input.promoCode) {
    const promo = await validateAndGetPromo(input.promoCode, subtotal);
    promoCodeId = promo.id;
    discountPercent = promo.discountPercent;
    maxDiscount = promo.maxDiscount ?? null;
  }

  const pricing = calculateFees(subtotal, discountPercent, maxDiscount);

  // Late check-out fee: doubles each hour past 10:00 AM, up to a full night.
  const lateFee = lateCheckoutFee(input.checkOutTime, effectivePrice);
  const total = pricing.total + lateFee + extraGuestFee;

  const booking = await prisma.booking.create({
    data: {
      userId: input.userId,
      propertyId: input.propertyId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: input.guests,
      bedOption: input.bedOption,
      checkInTime: input.checkInTime,
      checkOutTime: input.checkOutTime,
      specialRequests: input.specialRequests,
      additionalGuestsJson:
        input.additionalGuests && input.additionalGuests.length
          ? JSON.stringify(
              input.additionalGuests.filter((g) => g.firstName?.trim() || g.lastName?.trim())
            )
          : null,
      paymentMethod: input.paymentMethod,
      promoCodeId,
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      serviceFee: pricing.serviceFee,
      lateCheckoutFee: lateFee,
      discountAmount: pricing.discountAmount,
      total,
    },
    include: {
      property: true,
      promoCode: { select: { code: true, discountPercent: true } },
    },
  });

  // Increment promo code usage if used
  if (promoCodeId) {
    await prisma.promoCode.update({
      where: { id: promoCodeId },
      data: { currentUses: { increment: 1 } },
    });
  }

  return normalizeBooking(booking);
}

export async function listUserBookings(userId: string, status?: string, page = 1, limit = 10) {
  const where: any = { userId };
  if (status) where.status = status;

  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        property: { select: { id: true, title: true, location: true, imagesJson: true, price: true } },
        promoCode: { select: { code: true, discountPercent: true } },
        review: { select: { id: true, rating: true, privateNote: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: normalizeBookings(bookings),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function getBooking(bookingId: string, userId?: string) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      property: true,
      promoCode: { select: { code: true, discountPercent: true } },
    },
  });

  if (!booking) throw new NotFoundError('Booking');
  if (userId && booking.userId !== userId) throw new NotFoundError('Booking');

  return normalizeBooking(booking);
}

export async function listAllBookings(status?: string, page = 1, limit = 20) {
  const where: any = {};
  if (status) where.status = status;

  const skip = (page - 1) * limit;
  const [bookings, total] = await Promise.all([
    prisma.booking.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, email: true, firstName: true, lastName: true } },
        property: { select: { id: true, title: true, imagesJson: true } },
        promoCode: { select: { code: true } },
      },
    }),
    prisma.booking.count({ where }),
  ]);

  return {
    bookings: normalizeBookings(bookings),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

// Per-property booking counts and recorded earnings, for the admin earnings page.
// "Earnings" = sum of booking totals that are not cancelled (PENDING + CONFIRMED).
// "Confirmed earnings" tracks realized revenue from CONFIRMED bookings only.
export async function getPropertyEarnings(dateFilter?: { from?: Date; to?: Date }) {
  const whereDate = dateFilter?.from || dateFilter?.to
    ? {
        createdAt: {
          ...(dateFilter.from ? { gte: dateFilter.from } : {}),
          ...(dateFilter.to ? { lte: dateFilter.to } : {}),
        },
      }
    : {};

  const [properties, all, confirmed, byBed] = await Promise.all([
    prisma.property.findMany({
      select: { id: true, title: true, location: true, imagesJson: true, price: true },
    }),
    prisma.booking.groupBy({
      by: ['propertyId'],
      where: { status: { not: 'CANCELLED' }, ...whereDate },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.booking.groupBy({
      by: ['propertyId'],
      where: { status: 'CONFIRMED', ...whereDate },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.booking.groupBy({
      by: ['propertyId', 'bedOption'],
      where: { status: { not: 'CANCELLED' }, ...whereDate },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  const allMap = new Map(all.map((r) => [r.propertyId, r]));
  const confirmedMap = new Map(confirmed.map((r) => [r.propertyId, r]));

  // Build a nested map: propertyId -> bedOption -> { bookings, earnings }
  const bedMap = new Map<string, Map<string | null, { bookings: number; earnings: number }>>();
  for (const row of byBed) {
    if (!bedMap.has(row.propertyId)) {
      bedMap.set(row.propertyId, new Map());
    }
    const inner = bedMap.get(row.propertyId)!;
    inner.set(row.bedOption, {
      bookings: row._count._all,
      earnings: row._sum.total ?? 0,
    });
  }

  function getBedStats(propertyId: string, option: string) {
    const inner = bedMap.get(propertyId);
    if (!inner) return { bookings: 0, earnings: 0 };
    // Try exact match first, then fallback to null (legacy bookings)
    const exact = inner.get(option);
    if (exact) return exact;
    const legacy = inner.get(null);
    if (legacy) return legacy;
    return { bookings: 0, earnings: 0 };
  }

  const rows = properties.map((p) => {
    const a = allMap.get(p.id);
    const c = confirmedMap.get(p.id);
    const images = p.imagesJson ? JSON.parse(p.imagesJson) : [];
    const bed1 = getBedStats(p.id, '1bed');
    const bed2 = getBedStats(p.id, '2bed');
    return {
      id: p.id,
      title: p.title,
      location: p.location,
      image: images[0] || null,
      price: p.price,
      bookings: a?._count._all ?? 0,
      confirmedBookings: c?._count._all ?? 0,
      earnings: a?._sum.total ?? 0,
      confirmedEarnings: c?._sum.total ?? 0,
      bed1Bookings: bed1.bookings,
      bed1Earnings: bed1.earnings,
      bed2Bookings: bed2.bookings,
      bed2Earnings: bed2.earnings,
    };
  });

  rows.sort((x, y) => y.earnings - x.earnings);

  const totals = rows.reduce(
    (acc, r) => {
      acc.bookings += r.bookings;
      acc.confirmedBookings += r.confirmedBookings;
      acc.earnings += r.earnings;
      acc.confirmedEarnings += r.confirmedEarnings;
      acc.bed1Bookings += r.bed1Bookings;
      acc.bed1Earnings += r.bed1Earnings;
      acc.bed2Bookings += r.bed2Bookings;
      acc.bed2Earnings += r.bed2Earnings;
      return acc;
    },
    { bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0, bed1Bookings: 0, bed1Earnings: 0, bed2Bookings: 0, bed2Earnings: 0 }
  );

  return { properties: rows, totals };
}

export async function updateBookingStatus(bookingId: string, status: 'CONFIRMED' | 'CANCELLED') {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError('Booking');

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data: { status },
  });
  return updated;
}

// Internal: validate a promo code and return it
async function validateAndGetPromo(code: string, subtotal: number) {
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
    throw new ValidationError(`Minimum booking of KES ${promo.minBookingAmount.toLocaleString()} required for this code`);
  }

  return promo;
}
