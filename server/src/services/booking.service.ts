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

  // Late check-out capped at 3 hours past 10:00 AM (13:00).
  if (input.checkOutTime) {
    const m = /^(\d{1,2}):(\d{2})$/.exec(input.checkOutTime);
    if (m) {
      const minutes = parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
      const maxMinutes = 13 * 60; // 1:00 PM
      if (minutes > maxMinutes) {
        throw new ValidationError('Late check-out cannot extend past 1:00 PM (3 hours max)');
      }
    }
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
      user: { select: { email: true } },
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

// Lists bookings across properties. When `hostId` is provided, results are
// scoped to bookings on that host's listings — the data-layer isolation that
// guarantees a host can never read another host's (or guest's) bookings,
// independent of which route called this.
export async function listAllBookings(status?: string, page = 1, limit = 20, hostId?: string) {
  const where: any = {};
  if (status) where.status = status;
  if (hostId) where.property = { hostId };

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

// Per-property booking counts and recorded earnings, for the admin/host earnings page.
// "Earnings" = sum of booking totals that are not cancelled (PENDING + CONFIRMED).
// "Confirmed earnings" tracks realized revenue from CONFIRMED bookings only.
// Also returns fee breakdown: gross rent (subtotal), cleaning fees, service fees,
// discounts, host net amount, and withholding tax (WHT).
export async function getPropertyEarnings(dateFilter?: { from?: Date; to?: Date }, hostId?: string) {
  const whereDate = dateFilter?.from || dateFilter?.to
    ? {
        createdAt: {
          ...(dateFilter.from ? { gte: dateFilter.from } : {}),
          ...(dateFilter.to ? { lte: dateFilter.to } : {}),
        },
      }
    : {};

  // When scoped to a host, only their properties and bookings on them are counted.
  const propertyWhere = hostId ? { hostId } : {};
  const bookingHost = hostId ? { property: { hostId } } : {};

  // Admin mode: also fetch host info per property so we can build per-host rankings.
  const isAdminView = !hostId;

  const [properties, all, confirmed, byBed] = await Promise.all([
    prisma.property.findMany({
      where: propertyWhere,
      select: {
        id: true, title: true, location: true, imagesJson: true, price: true,
        ...(isAdminView ? { hostId: true, host: { select: { id: true, firstName: true, lastName: true, email: true } } } : {}),
      },
    }),
    prisma.booking.groupBy({
      by: ['propertyId'],
      where: { status: { not: 'CANCELLED' }, ...whereDate, ...bookingHost },
      _count: { _all: true },
      _sum: {
        subtotal: true,
        cleaningFee: true,
        serviceFee: true,
        discountAmount: true,
        total: true,
        hostNetAmount: true,
        withholdingTax: true,
      },
    }),
    prisma.booking.groupBy({
      by: ['propertyId'],
      where: { status: 'CONFIRMED', ...whereDate, ...bookingHost },
      _count: { _all: true },
      _sum: {
        subtotal: true,
        cleaningFee: true,
        serviceFee: true,
        discountAmount: true,
        total: true,
        hostNetAmount: true,
        withholdingTax: true,
      },
    }),
    prisma.booking.groupBy({
      by: ['propertyId', 'bedOption'],
      where: { status: { not: 'CANCELLED' }, ...whereDate, ...bookingHost },
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

  // Extract fee breakdown helper
  function extractFees(sums: any) {
    return {
      grossRent: sums?._sum?.subtotal ?? 0,
      cleaningFees: sums?._sum?.cleaningFee ?? 0,
      serviceFees: sums?._sum?.serviceFee ?? 0,
      discounts: sums?._sum?.discountAmount ?? 0,
      hostNet: sums?._sum?.hostNetAmount ?? 0,
      wht: sums?._sum?.withholdingTax ?? 0,
    };
  }

  const rows = properties.map((p) => {
    const a = allMap.get(p.id);
    const c = confirmedMap.get(p.id);
    const images = p.imagesJson ? JSON.parse(p.imagesJson) : [];
    const bed1 = getBedStats(p.id, '1bed');
    const bed2 = getBedStats(p.id, '2bed');
    const activeFees = extractFees(a);
    const confirmedFees = extractFees(c);
    return {
      id: p.id,
      title: p.title,
      location: p.location,
      image: images[0] || null,
      price: p.price,
      bookings: a?._count._all ?? 0,
      confirmedBookings: c?._count._all ?? 0,
      earnings: a?._sum?.total ?? 0,
      confirmedEarnings: c?._sum?.total ?? 0,
      bed1Bookings: bed1.bookings,
      bed1Earnings: bed1.earnings,
      bed2Bookings: bed2.bookings,
      bed2Earnings: bed2.earnings,
      // Fee breakdown for active (non-cancelled) bookings
      grossRent: activeFees.grossRent,
      cleaningFees: activeFees.cleaningFees,
      serviceFees: activeFees.serviceFees,
      discounts: activeFees.discounts,
      hostNet: activeFees.hostNet,
      wht: activeFees.wht,
      // Confirmed fee breakdown
      confirmedGrossRent: confirmedFees.grossRent,
      confirmedCleaningFees: confirmedFees.cleaningFees,
      confirmedServiceFees: confirmedFees.serviceFees,
      confirmedDiscounts: confirmedFees.discounts,
      confirmedHostNet: confirmedFees.hostNet,
      confirmedWht: confirmedFees.wht,
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
      // Fee breakdown totals
      acc.grossRent += r.grossRent;
      acc.cleaningFees += r.cleaningFees;
      acc.serviceFees += r.serviceFees;
      acc.discounts += r.discounts;
      acc.hostNet += r.hostNet;
      acc.wht += r.wht;
      return acc;
    },
    {
      bookings: 0, confirmedBookings: 0,
      earnings: 0, confirmedEarnings: 0,
      bed1Bookings: 0, bed1Earnings: 0, bed2Bookings: 0, bed2Earnings: 0,
      grossRent: 0, cleaningFees: 0, serviceFees: 0, discounts: 0,
      hostNet: 0, wht: 0,
    }
  );

  // Admin-only: per-host rankings aggregated from per-property data
  let hosts: any[] = [];
  if (isAdminView) {
    const hostMap = new Map<string, {
      hostId: string;
      name: string;
      email: string;
      propertyCount: number;
      bookings: number;
      grossRent: number;
      serviceFees: number;
      cleaningFees: number;
      discounts: number;
      hostNet: number;
      wht: number;
      earnings: number;
    }>();
    for (const row of rows) {
      const prop = properties.find((p: any) => p.id === row.id);
      const hostId = prop?.hostId;
      const hostUser = prop?.host;
      if (!hostId) continue;
      if (!hostMap.has(hostId)) {
        hostMap.set(hostId, {
          hostId,
          name: hostUser ? `${hostUser.firstName} ${hostUser.lastName}` : 'Unknown Host',
          email: hostUser?.email || '',
          propertyCount: 0,
          bookings: 0,
          grossRent: 0,
          serviceFees: 0,
          cleaningFees: 0,
          discounts: 0,
          hostNet: 0,
          wht: 0,
          earnings: 0,
        });
      }
      const h = hostMap.get(hostId)!;
      h.propertyCount++;
      h.bookings += row.bookings;
      h.grossRent += (row.grossRent || 0);
      h.serviceFees += (row.serviceFees || 0);
      h.cleaningFees += (row.cleaningFees || 0);
      h.discounts += (row.discounts || 0);
      h.hostNet += (row.hostNet || 0);
      h.wht += (row.wht || 0);
      h.earnings += (row.earnings || 0);
    }
    hosts = Array.from(hostMap.values()).sort((a, b) => b.earnings - a.earnings);
  }

  return { properties: rows, totals, ...(isAdminView ? { hosts } : {}) };
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

interface UpdateBookingInput {
  checkIn?: string;
  checkOut?: string;
  guests?: number;
  bedOption?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  specialRequests?: string | null;
  additionalGuests?: { firstName: string; lastName: string }[];
}

export async function updateBooking(bookingId: string, input: UpdateBookingInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: true },
  });
  if (!booking) throw new NotFoundError('Booking');

  const property = booking.property;

  const checkIn = input.checkIn ? new Date(input.checkIn) : booking.checkIn;
  const checkOut = input.checkOut ? new Date(input.checkOut) : booking.checkOut;

  if (checkIn >= checkOut) {
    throw new ValidationError('Check-out date must be after check-in date');
  }

  // Late check-out capped at 3 hours past 10:00 AM (13:00).
  const effectiveCheckOutTimeRaw = input.checkOutTime !== undefined ? input.checkOutTime : booking.checkOutTime;
  if (effectiveCheckOutTimeRaw) {
    const tm = /^(\d{1,2}):(\d{2})$/.exec(effectiveCheckOutTimeRaw);
    if (tm) {
      const tMinutes = parseInt(tm[1], 10) * 60 + parseInt(tm[2], 10);
      if (tMinutes > 13 * 60) {
        throw new ValidationError('Late check-out cannot extend past 1:00 PM (3 hours max)');
      }
    }
  }

  // Check availability for new dates (exclude current booking from conflict check)
  if (input.checkIn || input.checkOut) {
    const available = await isRangeAvailable(booking.propertyId, checkIn, checkOut, bookingId);
    if (!available) {
      throw new ConflictError('Those dates are no longer available for this property');
    }
  }

  const guests = input.guests ?? booking.guests;
  // null means "clear", undefined means "don't change"
  const bedOption = input.bedOption !== undefined ? (input.bedOption || null) : booking.bedOption;

  // Enforce occupancy limits
  const maxForBed = bedOption === '2bed' ? 4 : 2;
  if (guests > 6) {
    throw new ValidationError('Maximum 6 guests per property');
  }

  // Recalculate pricing
  const effectivePrice = getBedPrice(property, bedOption ?? undefined);
  const nights = calculateNights(checkIn, checkOut);
  const extraGuestFee = Math.max(0, guests - maxForBed) * 800 * nights;

  const priceRules = await prisma.priceRule.findMany({
    where: { propertyId: booking.propertyId },
    select: { start: true, end: true, price: true },
  });
  const subtotal = computeSubtotal(checkIn, nights, effectivePrice, priceRules);

  // Re-apply promo discount if present
  let discountAmount = 0;
  if (booking.promoCodeId) {
    const promo = await prisma.promoCode.findUnique({ where: { id: booking.promoCodeId } });
    if (promo && promo.active) {
      const discountPercent = promo.discountPercent;
      const maxDiscount = promo.maxDiscount ?? null;
      const rawDiscount = Math.round(subtotal * (discountPercent / 100));
      discountAmount = maxDiscount !== null ? Math.min(rawDiscount, maxDiscount) : rawDiscount;
    }
  }

  const pricing = calculateFees(subtotal, 0, null); // discount already applied above
  // checkOutTime: null means clear, undefined means keep existing
  const effectiveCheckOutTime = input.checkOutTime !== undefined ? (input.checkOutTime || null) : booking.checkOutTime;
  const lateFee = lateCheckoutFee(effectiveCheckOutTime ?? undefined, effectivePrice);
  const total = pricing.subtotal - discountAmount + pricing.cleaningFee + pricing.serviceFee + lateFee + extraGuestFee;

  const data: any = {
    checkIn,
    checkOut,
    guests,
    bedOption,
    subtotal,
    cleaningFee: pricing.cleaningFee,
    serviceFee: pricing.serviceFee,
    lateCheckoutFee: lateFee,
    discountAmount,
    total,
  };

  // Optional fields: undefined = don't change, null = clear, string = set
  if (input.checkInTime !== undefined) data.checkInTime = input.checkInTime || null;
  if (input.checkOutTime !== undefined) data.checkOutTime = input.checkOutTime || null;
  if (input.specialRequests !== undefined) data.specialRequests = input.specialRequests || null;
  if (input.additionalGuests !== undefined) {
    data.additionalGuestsJson = input.additionalGuests.length
      ? JSON.stringify(input.additionalGuests.filter((g) => g.firstName?.trim() || g.lastName?.trim()))
      : null;
  }

  const updated = await prisma.booking.update({
    where: { id: bookingId },
    data,
    include: {
      user: { select: { id: true, email: true, firstName: true, lastName: true } },
      property: { select: { id: true, title: true, imagesJson: true } },
      promoCode: { select: { code: true } },
    },
  });

  return normalizeBooking(updated);
}

export async function deleteBooking(bookingId: string) {
  const booking = await prisma.booking.findUnique({ where: { id: bookingId } });
  if (!booking) throw new NotFoundError('Booking');

  await prisma.booking.delete({ where: { id: bookingId } });
  return { deleted: true };
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
