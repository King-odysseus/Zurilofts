/**
 * Platform revenue reporting.
 *
 * The platform's cut used to exist only as a difference between what the guest
 * paid and what the host was owed, so it could not be reported or audited. Each
 * booking now stores hostCommission and platformRevenue, and this service totals
 * them.
 *
 * Bookings paid before those columns existed carry nulls, so their revenue is
 * derived from the amounts actually charged on the row. That derivation reads no
 * pricing config: it reconstructs what happened, not what today's rates would
 * have produced.
 */
import prisma from '../config/prisma.js';
import { calculateNights, computeExtraGuestFee } from '../utils/pricing.js';

export interface RevenueRow {
  id: string;
  checkIn: Date;
  paidAt: Date | null;
  grossPaid: number;
  hostNet: number;
  withholdingTax: number;
  commission: number;
  platformRevenue: number;
  hostId: string | null;
  hostName: string;
  hostEmail: string;
  propertyTitle: string;
  /** False when the row predates the stored split, so its numbers are unknown. */
  settled: boolean;
}

/** Amount the guest was charged for the stay, add-ons excluded. */
function guestPaidFor(booking: {
  subtotal: number;
  cleaningFee: number;
  serviceFee: number;
  lateCheckoutFee: number;
  discountAmount: number;
  guests: number;
  bedOption: string | null;
  checkIn: Date;
  checkOut: Date;
}): number {
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const extraGuestFee = computeExtraGuestFee(booking.guests, booking.bedOption, nights);
  return (
    booking.subtotal +
    booking.cleaningFee +
    booking.serviceFee +
    booking.lateCheckoutFee +
    extraGuestFee -
    booking.discountAmount
  );
}

export async function getPlatformRevenue(filter?: { from?: Date; to?: Date }) {
  const where: any = { status: 'CONFIRMED' };
  if (filter?.from || filter?.to) {
    where.paidAt = {
      ...(filter.from ? { gte: filter.from } : {}),
      ...(filter.to ? { lte: filter.to } : {}),
    };
  }

  const bookings = await prisma.booking.findMany({
    where,
    orderBy: { paidAt: 'desc' },
    select: {
      id: true,
      checkIn: true,
      checkOut: true,
      paidAt: true,
      subtotal: true,
      cleaningFee: true,
      serviceFee: true,
      lateCheckoutFee: true,
      discountAmount: true,
      guests: true,
      bedOption: true,
      hostNetAmount: true,
      withholdingTax: true,
      hostCommission: true,
      platformRevenue: true,
      property: {
        select: {
          title: true,
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
  });

  const rows: RevenueRow[] = bookings.map((b) => {
    const grossPaid = guestPaidFor(b);
    const settled = b.hostNetAmount != null;
    const hostNet = b.hostNetAmount ?? 0;
    const withholdingTax = b.withholdingTax ?? 0;
    // Stored value when present; otherwise what was actually left over. A row
    // with no recorded host share cannot be split at all: assuming the platform
    // kept everything would report a payment as pure profit.
    const platformRevenue = settled ? b.platformRevenue ?? grossPaid - hostNet - withholdingTax : 0;
    const host = b.property?.host;
    return {
      id: b.id,
      checkIn: b.checkIn,
      paidAt: b.paidAt,
      grossPaid,
      hostNet,
      withholdingTax,
      commission: b.hostCommission ?? 0,
      platformRevenue,
      hostId: host?.id ?? null,
      hostName: host ? `${host.firstName} ${host.lastName}`.trim() : 'Unknown host',
      hostEmail: host?.email ?? '',
      propertyTitle: b.property?.title ?? '',
      settled,
    };
  });

  // Money is only summed over rows whose split is known.
  const settledRows = rows.filter((r) => r.settled);
  const unsettledRows = rows.filter((r) => !r.settled);

  const totals = settledRows.reduce(
    (acc, r) => {
      acc.bookings += 1;
      acc.grossPaid += r.grossPaid;
      acc.hostNet += r.hostNet;
      acc.withholdingTax += r.withholdingTax;
      acc.commission += r.commission;
      acc.platformRevenue += r.platformRevenue;
      return acc;
    },
    {
      bookings: 0, grossPaid: 0, hostNet: 0, withholdingTax: 0, commission: 0, platformRevenue: 0,
    },
  );

  // Twelve months ending with the filter's end date (or now), so a month with no
  // revenue still appears as a zero rather than vanishing from the chart.
  const trendEnd = filter?.to ?? new Date();
  const monthly = Array.from({ length: 12 }, (_, index) => {
    const month = new Date(trendEnd.getFullYear(), trendEnd.getMonth() - 11 + index, 1);
    return {
      key: `${month.getFullYear()}-${month.getMonth()}`,
      label: month.toLocaleString('en-GB', { month: 'short' }),
      platformRevenue: 0,
      grossPaid: 0,
      hostNet: 0,
      bookings: 0,
    };
  });
  const byMonth = new Map(monthly.map((m) => [m.key, m]));
  for (const row of settledRows) {
    if (!row.paidAt) continue;
    const month = byMonth.get(`${row.paidAt.getFullYear()}-${row.paidAt.getMonth()}`);
    if (!month) continue;
    month.platformRevenue += row.platformRevenue;
    month.grossPaid += row.grossPaid;
    month.hostNet += row.hostNet;
    month.bookings += 1;
  }

  const hostMap = new Map<string, {
    hostId: string; name: string; email: string; bookings: number;
    grossPaid: number; hostNet: number; platformRevenue: number;
  }>();
  for (const row of settledRows) {
    if (!row.hostId) continue;
    if (!hostMap.has(row.hostId)) {
      hostMap.set(row.hostId, {
        hostId: row.hostId, name: row.hostName, email: row.hostEmail,
        bookings: 0, grossPaid: 0, hostNet: 0, platformRevenue: 0,
      });
    }
    const h = hostMap.get(row.hostId)!;
    h.bookings += 1;
    h.grossPaid += row.grossPaid;
    h.hostNet += row.hostNet;
    h.platformRevenue += row.platformRevenue;
  }
  const byHost = Array.from(hostMap.values()).sort((a, b) => b.platformRevenue - a.platformRevenue);

  // Money earned but not yet withdrawable: reported so the host's pending
  // balance and the platform's obligation are one and the same number.
  const held = await prisma.booking.aggregate({
    where: { status: 'CONFIRMED', hostFundsReleasedAt: null, hostNetAmount: { gt: 0 } },
    _sum: { hostNetAmount: true },
    _count: true,
  });

  return {
    totals,
    monthly,
    byHost,
    recent: rows.slice(0, 50),
    // Paid stays from before the split was recorded. Reported so the numbers
    // are visibly incomplete rather than quietly rounded in the platform's favour.
    unsettled: {
      bookings: unsettledRows.length,
      grossPaid: unsettledRows.reduce((sum, r) => sum + r.grossPaid, 0),
    },
    held: { amount: held._sum?.hostNetAmount ?? 0, bookings: held._count ?? 0 },
  };
}
