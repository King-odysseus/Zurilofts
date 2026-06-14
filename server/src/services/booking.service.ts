import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';
import { calculateFees, calculateNights, computeSubtotal } from '../utils/pricing.js';
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
  return b;
}

function normalizeBookings(bookings: any[]) {
  return bookings.map(normalizeBooking);
}

const BED_PRICES: Record<string, number> = {
  '1bed': 5100,
  '2bed': 5500,
};

interface CreateBookingInput {
  userId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  bedOption?: string;
  checkInTime?: string;
  specialRequests?: string;
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

  // Determine effective base price based on bed option
  const effectivePrice = input.bedOption && BED_PRICES[input.bedOption]
    ? BED_PRICES[input.bedOption]
    : property.price;

  const nights = calculateNights(checkInDate, checkOutDate);

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

  const booking = await prisma.booking.create({
    data: {
      userId: input.userId,
      propertyId: input.propertyId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: input.guests,
      bedOption: input.bedOption,
      checkInTime: input.checkInTime,
      specialRequests: input.specialRequests,
      paymentMethod: input.paymentMethod,
      promoCodeId,
      subtotal: pricing.subtotal,
      cleaningFee: pricing.cleaningFee,
      serviceFee: pricing.serviceFee,
      discountAmount: pricing.discountAmount,
      total: pricing.total,
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
export async function getPropertyEarnings() {
  const [properties, all, confirmed] = await Promise.all([
    prisma.property.findMany({
      select: { id: true, title: true, location: true, imagesJson: true, price: true },
    }),
    prisma.booking.groupBy({
      by: ['propertyId'],
      where: { status: { not: 'CANCELLED' } },
      _count: { _all: true },
      _sum: { total: true },
    }),
    prisma.booking.groupBy({
      by: ['propertyId'],
      where: { status: 'CONFIRMED' },
      _count: { _all: true },
      _sum: { total: true },
    }),
  ]);

  const allMap = new Map(all.map((r) => [r.propertyId, r]));
  const confirmedMap = new Map(confirmed.map((r) => [r.propertyId, r]));

  const rows = properties.map((p) => {
    const a = allMap.get(p.id);
    const c = confirmedMap.get(p.id);
    const images = p.imagesJson ? JSON.parse(p.imagesJson) : [];
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
    };
  });

  rows.sort((x, y) => y.earnings - x.earnings);

  const totals = rows.reduce(
    (acc, r) => {
      acc.bookings += r.bookings;
      acc.confirmedBookings += r.confirmedBookings;
      acc.earnings += r.earnings;
      acc.confirmedEarnings += r.confirmedEarnings;
      return acc;
    },
    { bookings: 0, confirmedBookings: 0, earnings: 0, confirmedEarnings: 0 }
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
