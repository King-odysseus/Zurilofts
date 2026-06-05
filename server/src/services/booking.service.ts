import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../types/index.js';
import { calculatePricing, calculateNights } from '../utils/pricing.js';

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

interface CreateBookingInput {
  userId: string;
  propertyId: string;
  checkIn: string;
  checkOut: string;
  guests: number;
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

  const nights = calculateNights(checkInDate, checkOutDate);

  // Handle promo code if provided
  let promoCodeId: string | null = null;
  let discountPercent = 0;
  let maxDiscount: number | null = null;

  if (input.promoCode) {
    const promo = await validateAndGetPromo(input.promoCode, property.price * nights);
    promoCodeId = promo.id;
    discountPercent = promo.discountPercent;
    maxDiscount = promo.maxDiscount ?? null;
  }

  const pricing = calculatePricing(property.price, nights, discountPercent, maxDiscount);

  const booking = await prisma.booking.create({
    data: {
      userId: input.userId,
      propertyId: input.propertyId,
      checkIn: checkInDate,
      checkOut: checkOutDate,
      guests: input.guests,
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
