import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../types/index.js';

/** Ensure a property has an outbound iCal feed token; create one if missing. */
export async function ensureIcalToken(propertyId: string): Promise<string> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');
  if (property.icalToken) return property.icalToken;

  const token = crypto.randomBytes(24).toString('hex');
  await prisma.property.update({ where: { id: propertyId }, data: { icalToken: token } });
  return token;
}

/** Full calendar view for the admin: sources, blocks, and the feed token. */
export async function getPropertyCalendar(propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');

  const token = await ensureIcalToken(propertyId);

  const [sources, blocks] = await Promise.all([
    prisma.calendarSource.findMany({
      where: { propertyId },
      orderBy: { createdAt: 'asc' },
    }),
    prisma.calendarBlock.findMany({
      where: { propertyId },
      orderBy: { start: 'asc' },
      include: { source: { select: { name: true } } },
    }),
  ]);

  return {
    property: { id: property.id, title: property.title },
    icalToken: token,
    sources,
    blocks: blocks.map((b) => ({
      id: b.id,
      start: b.start,
      end: b.end,
      summary: b.summary,
      sourceId: b.sourceId,
      sourceName: b.source?.name ?? null,
      manual: b.sourceId === null,
    })),
  };
}

export async function addSource(propertyId: string, name: string, url: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');
  return prisma.calendarSource.create({ data: { propertyId, name, url } });
}

export async function deleteSource(id: string) {
  const source = await prisma.calendarSource.findUnique({ where: { id } });
  if (!source) throw new NotFoundError('Calendar source');
  // Cascade removes that source's imported blocks
  return prisma.calendarSource.delete({ where: { id } });
}

export async function addManualBlock(
  propertyId: string,
  start: Date,
  end: Date,
  summary?: string
) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');
  if (end <= start) throw new ValidationError('Block end date must be after the start date');
  return prisma.calendarBlock.create({
    data: { propertyId, sourceId: null, start, end, summary: summary || 'Blocked' },
  });
}

export async function deleteBlock(id: string) {
  const block = await prisma.calendarBlock.findUnique({ where: { id } });
  if (!block) throw new NotFoundError('Calendar block');
  if (block.sourceId !== null) {
    throw new ValidationError('Imported blocks cannot be deleted manually; remove the source instead');
  }
  return prisma.calendarBlock.delete({ where: { id } });
}

/**
 * Public availability: the unavailable date ranges for a property (imported +
 * manual calendar blocks and existing non-cancelled bookings), from today
 * onward. `end` is exclusive — the check-out day itself is free to book.
 * Used by the guest booking calendar to disable taken dates.
 */
export async function getUnavailableRanges(propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [blocks, bookings] = await Promise.all([
    prisma.calendarBlock.findMany({
      where: { propertyId, end: { gt: today } },
      select: { start: true, end: true },
    }),
    prisma.booking.findMany({
      where: { propertyId, status: { not: 'CANCELLED' }, checkOut: { gt: today } },
      select: { checkIn: true, checkOut: true },
    }),
  ]);

  return [
    ...blocks.map((b) => ({ start: b.start, end: b.end })),
    ...bookings.map((b) => ({ start: b.checkIn, end: b.checkOut })),
  ];
}

/**
 * Whether [checkIn, checkOut) is free of any calendar block or existing
 * (non-cancelled) booking. Ranges overlap when start < otherEnd && end > otherStart.
 */
export async function isRangeAvailable(
  propertyId: string,
  checkIn: Date,
  checkOut: Date,
  excludeBookingId?: string
): Promise<boolean> {
  const [blockOverlap, bookingOverlap] = await Promise.all([
    prisma.calendarBlock.count({
      where: { propertyId, start: { lt: checkOut }, end: { gt: checkIn } },
    }),
    prisma.booking.count({
      where: {
        propertyId,
        status: { not: 'CANCELLED' },
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
        ...(excludeBookingId ? { id: { not: excludeBookingId } } : {}),
      },
    }),
  ]);
  return blockOverlap === 0 && bookingOverlap === 0;
}
