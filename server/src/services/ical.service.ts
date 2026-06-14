import ical from 'node-ical';
import prisma from '../config/prisma.js';
import { NotFoundError } from '../types/index.js';

/**
 * Two-way iCal calendar sync.
 *
 * Import: fetch external iCal feeds (Airbnb, Booking.com, VRBO, ...) and store
 * the booked/blocked date ranges as CalendarBlock rows so they block new
 * bookings on our site.
 *
 * Export: generate an iCal feed of our own reservations + manual blocks so the
 * same external platforms can subscribe and avoid double-booking.
 */

// ---------------------------------------------------------------------------
// Import
// ---------------------------------------------------------------------------

/**
 * Sync a single external calendar source: fetch + parse the feed, then replace
 * that source's blocks with the freshly parsed events.
 */
export async function syncSource(sourceId: string): Promise<{ events: number }> {
  const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new NotFoundError('Calendar source');

  try {
    const data = await ical.async.fromURL(source.url);

    const events = Object.values(data).filter(
      (e: any) => e && e.type === 'VEVENT' && e.start && e.end
    ) as any[];

    // Replace this source's blocks atomically
    await prisma.$transaction([
      prisma.calendarBlock.deleteMany({ where: { sourceId } }),
      prisma.calendarBlock.createMany({
        data: events.map((e) => ({
          propertyId: source.propertyId,
          sourceId,
          uid: e.uid ? String(e.uid) : null,
          summary: e.summary ? String(e.summary) : null,
          start: new Date(e.start),
          end: new Date(e.end),
        })),
      }),
    ]);

    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: { lastSyncedAt: new Date(), lastStatus: `OK (${events.length} events)` },
    });

    return { events: events.length };
  } catch (err: any) {
    const message = err?.message ? String(err.message).slice(0, 200) : 'Unknown error';
    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: { lastSyncedAt: new Date(), lastStatus: `ERROR: ${message}` },
    });
    throw err;
  }
}

/** Sync every external source attached to a property. */
export async function syncProperty(propertyId: string) {
  const sources = await prisma.calendarSource.findMany({ where: { propertyId } });
  const results = await Promise.allSettled(sources.map((s) => syncSource(s.id)));
  return sources.map((s, i) => ({
    sourceId: s.id,
    name: s.name,
    ok: results[i].status === 'fulfilled',
  }));
}

/** Sync all sources across all properties (used by the periodic background job). */
export async function syncAll() {
  const sources = await prisma.calendarSource.findMany({ select: { id: true } });
  await Promise.allSettled(sources.map((s) => syncSource(s.id)));
  return sources.length;
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

function formatDateAllDay(d: Date): string {
  // iCal DATE value (all-day): YYYYMMDD in UTC
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, '0');
  const day = String(d.getUTCDate()).padStart(2, '0');
  return `${y}${m}${day}`;
}

function formatStamp(d: Date): string {
  return d.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
}

/**
 * Build a VCALENDAR feed for a property from its non-cancelled bookings and
 * manual blocks. Booking checkOut is already exclusive, matching iCal's
 * exclusive DTEND for all-day events.
 */
export async function generatePropertyICS(propertyId: string): Promise<string> {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');

  const [bookings, manualBlocks] = await Promise.all([
    prisma.booking.findMany({
      where: { propertyId, status: { not: 'CANCELLED' } },
      select: { id: true, checkIn: true, checkOut: true, updatedAt: true },
    }),
    prisma.calendarBlock.findMany({
      where: { propertyId, sourceId: null },
      select: { id: true, start: true, end: true, summary: true, createdAt: true },
    }),
  ]);

  const stamp = formatStamp(new Date());
  const lines: string[] = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZuriLofts//Calendar//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeText(property.title)} — ZuriLofts`,
  ];

  for (const b of bookings) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:booking-${b.id}@zurilofts`,
      `DTSTAMP:${formatStamp(b.updatedAt)}`,
      `DTSTART;VALUE=DATE:${formatDateAllDay(b.checkIn)}`,
      `DTEND;VALUE=DATE:${formatDateAllDay(b.checkOut)}`,
      'SUMMARY:Reserved (ZuriLofts)',
      'END:VEVENT'
    );
  }

  for (const blk of manualBlocks) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:block-${blk.id}@zurilofts`,
      `DTSTAMP:${formatStamp(blk.createdAt)}`,
      `DTSTART;VALUE=DATE:${formatDateAllDay(blk.start)}`,
      `DTEND;VALUE=DATE:${formatDateAllDay(blk.end)}`,
      `SUMMARY:${escapeText(blk.summary || 'Blocked (ZuriLofts)')}`,
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  // iCal lines are CRLF-terminated
  return lines.join('\r\n') + '\r\n';
}
