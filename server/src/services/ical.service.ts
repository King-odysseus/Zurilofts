import ical from 'node-ical';
import prisma from '../config/prisma.js';
import { NotFoundError } from '../types/index.js';
import { fetchCalendarFeedText, mapWithConcurrency } from '../utils/safeFetch.js';

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

/** Prefix on lastStatus when a feed came back empty but was not applied yet. */
export const EMPTY_FEED_WARNING_PREFIX = 'WARN: empty feed';

/**
 * True when a fetched body is a calendar at all.
 *
 * Exported and pure so it can be tested without a network or a database.
 */
export function looksLikeCalendar(text: string): boolean {
  return /BEGIN:VCALENDAR/i.test(text);
}

/**
 * Whether a parsed feed may replace the blocks stored for its source.
 *
 * An empty feed only wins once it has been seen twice. A provider answering with
 * a valid but empty calendar is otherwise indistinguishable from every booking
 * being cancelled at once, and believing it frees every night on the first sync.
 * Exported and pure so the rule is testable without a database.
 */
export function shouldReplaceBlocks(params: {
  parsedEvents: number;
  existingBlocks: number;
  lastStatus: string | null;
}): boolean {
  if (params.parsedEvents > 0) return true;
  if (params.existingBlocks === 0) return true;
  return (params.lastStatus ?? '').startsWith(EMPTY_FEED_WARNING_PREFIX);
}

/**
 * Sync a single external calendar source: fetch + parse the feed, then replace
 * that source's blocks with the freshly parsed events.
 */
export async function syncSource(sourceId: string): Promise<{ events: number }> {
  const source = await prisma.calendarSource.findUnique({ where: { id: sourceId } });
  if (!source) throw new NotFoundError('Calendar source');

  try {
    // Fetched through the guarded client rather than ical.async.fromURL, so a
    // host cannot point the server at an internal address.
    const text = await fetchCalendarFeedText(source.url);

    // A dead share link answered with an HTML login or error page still comes
    // back as 200 with a body. Parsing that finds no events, and treating that as
    // the truth deleted every block and resold nights booked elsewhere. A body
    // that is not a calendar is an error, and an error keeps the blocks.
    if (!looksLikeCalendar(text)) {
      throw new Error('The feed did not return a calendar (no BEGIN:VCALENDAR)');
    }

    const data = ical.sync.parseICS(text);

    const events = Object.values(data).filter(
      (e: any) => e && e.type === 'VEVENT' && e.start && e.end
    ) as any[];

    // A calendar that really empties says so on two syncs. Holding the existing
    // blocks for one round means a provider answering with a valid but empty
    // calendar cannot free every night at once; the next sync applies it.
    const existingBlocks = await prisma.calendarBlock.count({ where: { sourceId } });
    if (!shouldReplaceBlocks({ parsedEvents: events.length, existingBlocks, lastStatus: source.lastStatus })) {
      await prisma.calendarSource.update({
        where: { id: sourceId },
        data: {
          lastSyncedAt: new Date(),
          lastStatus:
            `${EMPTY_FEED_WARNING_PREFIX}, kept ${existingBlocks} block(s). Sync again to confirm the calendar is empty.`,
        },
      });
      return { events: 0 };
    }

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
export async function syncProperty(propertyId: string, ownerId?: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...(ownerId ? { hostId: ownerId } : {}) },
    select: { id: true },
  });
  if (!property) throw new NotFoundError('Property');
  const sources = await prisma.calendarSource.findMany({ where: { propertyId } });
  // Bounded: one host with many slow feeds must not open an unlimited number
  // of outbound connections at once.
  const results = await mapWithConcurrency(sources, 4, (s) => syncSource(s.id));
  return sources.map((s, i) => ({
    sourceId: s.id,
    name: s.name,
    ok: results[i].status === 'fulfilled',
  }));
}

let syncAllInFlight = false;

/** Sync all sources across all properties (used by the periodic background job). */
export async function syncAll() {
  // Two rounds must not overlap. Each round rewrites a source's blocks, so an
  // overlapping pair deleted the other's rows and rewrote them from the same
  // feed, and every slow round let the next one queue up behind it.
  if (syncAllInFlight) {
    console.warn('Calendar sync skipped: the previous round has not finished');
    return 0;
  }
  syncAllInFlight = true;
  try {
    const sources = await prisma.calendarSource.findMany({ select: { id: true } });
    await mapWithConcurrency(sources, 4, (s) => syncSource(s.id));
    return sources.length;
  } finally {
    syncAllInFlight = false;
  }
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
    `X-WR-CALNAME:${escapeText(property.title)} - ZuriLofts`,
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
