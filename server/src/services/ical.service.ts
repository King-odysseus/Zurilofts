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
 * How recent an import must be to count as current at the moment a guest books.
 * Anything older is pulled again before the dates are judged free.
 */
export const FEED_FRESHNESS_MS = 10 * 60 * 1000;

/**
 * A source not checked within this window is reported as stale to its host. The
 * background round runs hourly, so this means at least one round was missed or
 * failed while its blocks went on being trusted.
 */
export const SOURCE_STALE_AFTER_MS = 2 * 60 * 60 * 1000;

/**
 * Pin a parsed event to a UTC calendar day, the same date-only convention the
 * rest of the calendar uses (bookings and manual blocks sit at UTC midnight and
 * range checks compare them directly).
 *
 * node-ical builds all-day DATE values from their own year/month/day in the
 * server's local timezone, so a feed saying 20260101 becomes local midnight.
 * Storing that raw puts every imported block one UTC offset away from the
 * bookings it has to conflict with: in Nairobi (UTC+3) a stay starting 1 January
 * landed at 31 December 21:00Z and blocked the previous night as well. Reading
 * the components back in local time returns exactly the date the feed wrote.
 */
export function toCalendarDay(value: Date): Date {
  return new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate(), 0, 0, 0, 0));
}

/**
 * Whether a source's stored blocks are too old to be trusted without re-checking.
 * Exported and pure so the rule is testable without a database or a network.
 */
export function isSourceStale(
  lastSyncedAt: Date | null,
  lastStatus: string | null,
  now: number = Date.now()
): boolean {
  if (!lastSyncedAt) return true;
  if ((lastStatus ?? '').startsWith('ERROR')) return true;
  return now - lastSyncedAt.getTime() > SOURCE_STALE_AFTER_MS;
}

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

// One sync per source at a time. A background round and a host pressing "sync
// now" used to rewrite the same source concurrently, so one transaction's delete
// could land after the other's inserts and leave its blocks duplicated or half
// written. Callers arriving during a sync share its result instead of starting a
// second fetch.
const inFlightBySource = new Map<string, Promise<{ events: number }>>();

/**
 * Sync a single external calendar source: fetch + parse the feed, then replace
 * that source's blocks with the freshly parsed events.
 */
export function syncSource(sourceId: string): Promise<{ events: number }> {
  const running = inFlightBySource.get(sourceId);
  if (running) return running;

  const run = performSync(sourceId).finally(() => {
    inFlightBySource.delete(sourceId);
  });
  inFlightBySource.set(sourceId, run);
  return run;
}

async function performSync(sourceId: string): Promise<{ events: number }> {
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

    // A cancelled event, and a zero-length or inverted one, parse cleanly but
    // protect nothing: left in place they look like a block while every night
    // they name stays on sale.
    const blocks = events
      .filter((e) => String(e.status ?? '').toUpperCase() !== 'CANCELLED')
      .map((e) => ({
        propertyId: source.propertyId,
        sourceId,
        uid: e.uid ? String(e.uid) : null,
        summary: e.summary ? String(e.summary) : null,
        start: toCalendarDay(new Date(e.start)),
        end: toCalendarDay(new Date(e.end)),
      }))
      .filter(
        (b) => !Number.isNaN(b.start.getTime()) && !Number.isNaN(b.end.getTime()) && b.end > b.start
      );

    // A calendar that really empties says so on two syncs. Holding the existing
    // blocks for one round means a provider answering with a valid but empty
    // calendar cannot free every night at once; the next sync applies it.
    const existingBlocks = await prisma.calendarBlock.count({ where: { sourceId } });
    if (!shouldReplaceBlocks({ parsedEvents: blocks.length, existingBlocks, lastStatus: source.lastStatus })) {
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
      prisma.calendarBlock.createMany({ data: blocks }),
    ]);

    await prisma.calendarSource.update({
      where: { id: sourceId },
      data: { lastSyncedAt: new Date(), lastStatus: `OK (${blocks.length} events)` },
    });

    return { events: blocks.length };
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

/**
 * Pull a property's external feeds when their stored copy is older than `maxAgeMs`.
 *
 * A booking is accepted against stored CalendarBlock rows, and those are only as
 * current as the last import. The background round runs hourly, so a night sold
 * on Airbnb minutes ago could still look free here and be sold a second time.
 * Refreshing at the moment of booking shrinks that window to the length of one
 * feed fetch.
 *
 * Never throws and never holds up checkout: `budgetMs` caps the wait, and a pull
 * that overruns keeps running so its blocks still land moments later. A failing
 * provider is left to the host to see on the calendar, not turned into a booking
 * the guest cannot make.
 */
export async function refreshPropertyFeeds(
  propertyId: string,
  options: { maxAgeMs?: number; budgetMs?: number } = {}
): Promise<{ checked: number; failed: number; timedOut: boolean }> {
  const maxAgeMs = options.maxAgeMs ?? FEED_FRESHNESS_MS;
  const budgetMs = options.budgetMs ?? 6000;

  const sources = await prisma.calendarSource.findMany({
    where: { propertyId },
    select: { id: true, lastSyncedAt: true, lastStatus: true },
  });
  const now = Date.now();
  const due = sources.filter(
    (s) => now - (s.lastSyncedAt?.getTime() ?? 0) > maxAgeMs || s.lastStatus?.startsWith('ERROR')
  );
  if (due.length === 0) return { checked: 0, failed: 0, timedOut: false };

  // mapWithConcurrency captures per-source failures, so this promise never
  // rejects even when the budget below wins the race and it finishes unattended.
  const pull = mapWithConcurrency(due, 2, (s) => syncSource(s.id)).then(
    (results) => results.filter((r) => r.status === 'rejected').length
  );

  let timedOut = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const budget = new Promise<null>((resolve) => {
    timer = setTimeout(() => {
      timedOut = true;
      resolve(null);
    }, budgetMs);
    timer.unref?.();
  });

  try {
    const failed = await Promise.race([pull, budget]);
    if (failed === null) return { checked: due.length, failed: 0, timedOut };
    return { checked: due.length, failed, timedOut };
  } catch {
    // Pulling fresh data is a best-effort improvement on the stored blocks, so a
    // failure here must not cost the guest their booking.
    return { checked: due.length, failed: due.length, timedOut };
  } finally {
    if (timer) clearTimeout(timer);
  }
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
