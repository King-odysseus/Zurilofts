import prisma from '../config/prisma.js';
import { NotFoundError } from '../types/index.js';
import { calculateNights } from '../utils/pricing.js';

// ============================================================
// Per-property automated host messages.
//
// A host stores one template per trigger (PropertyMessageTemplate). The engine
// renders a template against a real booking and delivers it into the booking
// conversation as the host (senderId = property.hostId), then notifies the
// guest by web push. AutomatedMessageLog (unique bookingId+trigger) makes each
// message send exactly once, even with several server instances racing.
//
// Triggers:
//   BOOKING_CONFIRMED - immediately after a payment confirms (see hooks in
//     payment.service / booking.service) - not scheduled.
//   PRE_ARRIVAL       - offsetDays days before check-in (default 2), any scan
//                       from that morning until the check-in day.
//   CHECK_IN_DAY      - on the check-in calendar day.
//   CHECK_OUT_DAY     - on the check-out calendar day.
//   POST_STAY_REVIEW  - offsetDays days after check-out (default 2), sent
//                       within a few days of that date.
// ============================================================

export const AUTO_MESSAGE_TRIGGERS = [
  'BOOKING_CONFIRMED',
  'PRE_ARRIVAL',
  'CHECK_IN_DAY',
  'CHECK_OUT_DAY',
  'POST_STAY_REVIEW',
] as const;

export type AutoMessageTrigger = (typeof AUTO_MESSAGE_TRIGGERS)[number];

export const PRE_ARRIVAL_DEFAULT_OFFSET_DAYS = 2;
export const POST_STAY_DEFAULT_OFFSET_DAYS = 2;
export const AUTO_MESSAGE_OFFSET_MAX_DAYS = 60;

// Human-readable UI metadata (labels/descriptions are consumed by the frontend
// to render the per-trigger editors).
export const AUTO_MESSAGE_TRIGGER_META: Record<AutoMessageTrigger, { label: string; description: string; offsetLabel: string | null }> = {
  BOOKING_CONFIRMED: {
    label: 'Booking confirmed',
    description: 'Sent to the guest the moment their booking and payment are confirmed.',
    offsetLabel: null,
  },
  PRE_ARRIVAL: {
    label: 'Pre-arrival reminder',
    description: 'A heads-up before check-in with directions and arrival help.',
    offsetLabel: 'Days before check-in',
  },
  CHECK_IN_DAY: {
    label: 'Check-in day',
    description: 'Welcomes the guest on the morning of their check-in day.',
    offsetLabel: null,
  },
  CHECK_OUT_DAY: {
    label: 'Check-out day',
    description: 'Sends check-out instructions and thanks the guest on their last day.',
    offsetLabel: null,
  },
  POST_STAY_REVIEW: {
    label: 'Post-stay review nudge',
    description: 'A friendly request for feedback and a review after the stay.',
    offsetLabel: 'Days after check-out',
  },
};

// Default per-property bodies. Copy is product-voice; hosts can edit freely.
const DEFAULT_BODY: Record<AutoMessageTrigger, string> = {
  BOOKING_CONFIRMED:
    "Hi {guestFirstName}, welcome to {property} in {location}! Your stay is confirmed from {checkIn} to {checkOut} for {guests} guest(s). We're here if you need directions, an early check-in or any recommendations. Can't wait to host you!",
  PRE_ARRIVAL:
    "Hi {guestFirstName}, your check-in at {property} is on {checkIn}. The apartment is at {address} — open it in Google Maps for directions. Reply here if you'd like an early check-in, airport pickup or any local tips.",
  CHECK_IN_DAY:
    "Hi {guestFirstName}, today's the day — welcome to {property}! Your apartment at {address} is ready for you. If anything isn't perfect, message us right away and we'll make it right.",
  CHECK_OUT_DAY:
    "Hi {guestFirstName}, we hope you've had a lovely stay at {property}! Take your time this morning — check-out is by 10:00 AM and you're welcome to leave the keys with security. Travel safely and do come back soon!",
  POST_STAY_REVIEW:
    "Hi {guestFirstName}, thank you for staying at {property}! Your feedback helps us and future guests. If you enjoyed your stay, a review would mean the world — and if anything fell short, tell us here first so we can make it right.",
};

export function getDefaultBody(trigger: AutoMessageTrigger): string {
  return DEFAULT_BODY[trigger];
}

export function getDefaultOffsetDays(trigger: AutoMessageTrigger): number | null {
  if (trigger === 'PRE_ARRIVAL') return PRE_ARRIVAL_DEFAULT_OFFSET_DAYS;
  if (trigger === 'POST_STAY_REVIEW') return POST_STAY_DEFAULT_OFFSET_DAYS;
  return null;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'];

function fmtDate(date: Date): string {
  if (!(date instanceof Date) || Number.isNaN(date.getTime())) return '';
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

// Approximate the booking's Nairobi calendar day as a UTC-day epoch, so day
// windows are compared in integer days. Check-in/out dates are stored at UTC
// midnight, which is the same Nairobi date; `now` is shifted +3h to land on the
// Nairobi calendar date.
const DAY_MS = 24 * 60 * 60 * 1000;

function nairobiDayMs(date: Date): number {
  const shifted = new Date(date.getTime() + 3 * 60 * 60 * 1000);
  return Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate());
}

function isDue(trigger: AutoMessageTrigger, bodyOffsetDays: number | null, booking: { checkIn: Date; checkOut: Date }, todayMs: number): boolean {
  switch (trigger) {
    case 'PRE_ARRIVAL': {
      const offset = bodyOffsetDays ?? PRE_ARRIVAL_DEFAULT_OFFSET_DAYS;
      const checkInMs = nairobiDayMs(booking.checkIn);
      const targetMs = checkInMs - offset * DAY_MS;
      return todayMs >= targetMs && todayMs < checkInMs;
    }
    case 'CHECK_IN_DAY':
      return todayMs === nairobiDayMs(booking.checkIn);
    case 'CHECK_OUT_DAY':
      return todayMs === nairobiDayMs(booking.checkOut);
    case 'POST_STAY_REVIEW': {
      const offset = bodyOffsetDays ?? POST_STAY_DEFAULT_OFFSET_DAYS;
      const sinceDays = Math.round((todayMs - nairobiDayMs(booking.checkOut)) / DAY_MS);
      return sinceDays >= offset && sinceDays <= offset + 2;
    }
    default:
      return false;
  }
}

/** Renders a template body against a booking context. Unknown placeholders are
 *  left untouched so hosts may reuse text with their own wording. */
export function renderBody(body: string, ctx: Record<string, string>): string {
  let out = body;
  for (const [key, value] of Object.entries(ctx)) {
    out = out.split(`{${key}}`).join(value ?? '');
  }
  return out.trim();
}

// ============================================================
// Access / settings (host + admin UI)
// ============================================================

export interface AutoMessageActor {
  sub: string;
  role: string;
}

/** The caller must be the property's host or an admin. Returns the property.
 *  Throws NotFound for everyone else so existence is never leaked. */
export async function assertAccessibleProperty(propertyId: string, actor: AutoMessageActor) {
  const property = await prisma.property.findUnique({ where: { id: propertyId }, select: { id: true, hostId: true } });
  if (!property) throw new NotFoundError('Property');
  if (actor.role !== 'ADMIN' && property.hostId !== actor.sub) {
    throw new NotFoundError('Property');
  }
  return property;
}

export interface AutoMessageTemplateView {
  trigger: AutoMessageTrigger;
  enabled: boolean;
  offsetDays: number | null;
  body: string;
  saved: boolean;
}

/** Full trigger set in canonical order, defaults merged in for anything not
 *  persisted yet - the UI always edits a complete, predictable shape. */
export async function listAutoMessageTemplates(propertyId: string): Promise<AutoMessageTemplateView[]> {
  const rows = await prisma.propertyMessageTemplate.findMany({
    where: { propertyId },
    orderBy: { createdAt: 'asc' },
  });
  const byTrigger = new Map(rows.map((r) => [r.trigger, r]));
  // Unsaved triggers present OFF: the engine only delivers persisted rows, so a
  // fresh property has nothing active until the host turns triggers on and saves.
  return AUTO_MESSAGE_TRIGGERS.map((trigger) => {
    const row = byTrigger.get(trigger);
    return {
      trigger,
      enabled: row ? row.enabled : false,
      offsetDays: row ? row.offsetDays : getDefaultOffsetDays(trigger),
      body: row ? row.body : getDefaultBody(trigger),
      saved: Boolean(row),
    };
  });
}

/** Upserts the given template rows and returns the fresh full set. */
export async function saveAutoMessageTemplates(
  propertyId: string,
  templates: { trigger: string; enabled: boolean; offsetDays?: number | null; body: string }[],
): Promise<AutoMessageTemplateView[]> {
  await prisma.$transaction(
    templates.map((t) =>
      prisma.propertyMessageTemplate.upsert({
        where: { propertyId_trigger: { propertyId, trigger: t.trigger as AutoMessageTrigger } },
        update: { enabled: t.enabled, offsetDays: t.offsetDays ?? null, body: t.body },
        create: { propertyId, trigger: t.trigger as AutoMessageTrigger, enabled: t.enabled, offsetDays: t.offsetDays ?? null, body: t.body },
      })
    )
  );
  return listAutoMessageTemplates(propertyId);
}

// ============================================================
// Delivery engine
// ============================================================

interface DeliverOutcome {
  trigger: AutoMessageTrigger;
  sent: boolean;
  reason: 'sent' | 'not_confirmed' | 'not_enabled' | 'already_sent' | 'no_host' | 'error';
  conversationId?: string;
}

/**
 * Deliver one template for one booking. Runs inside a transaction so the
 * conversation message and the dedupe log commit atomically: a concurrent
 * instance that races here and loses the unique log row rolls the whole send
 * back instead of double-posting. Push happens after commit, best-effort.
 */
export async function deliverTrigger(bookingId: string, trigger: AutoMessageTrigger): Promise<DeliverOutcome> {
  try {
    const result = await prisma.$transaction(async (tx) => {
      const booking = await tx.booking.findUnique({
        where: { id: bookingId },
        include: {
          property: { include: { host: { select: { firstName: true, lastName: true } } } },
          user: { select: { firstName: true, lastName: true } },
          conversation: { select: { id: true } },
        },
      });

      if (!booking || booking.status !== 'CONFIRMED') {
        return { trigger, sent: false, reason: 'not_confirmed' as const };
      }

      const template = await tx.propertyMessageTemplate.findUnique({
        where: { propertyId_trigger: { propertyId: booking.propertyId, trigger } },
      });
      if (!template || !template.enabled) {
        return { trigger, sent: false, reason: 'not_enabled' as const };
      }

      const existing = await tx.automatedMessageLog.findUnique({
        where: { bookingId_trigger: { bookingId, trigger } },
      });
      if (existing) {
        return { trigger, sent: false, reason: 'already_sent' as const };
      }

      const hostId = booking.property.hostId;
      if (!hostId) {
        return { trigger, sent: false, reason: 'no_host' as const };
      }

      // Ensure the booking conversation exists (the guest/host chat may not
      // have been opened yet). Upsert is atomic on the unique bookingId, so a
      // concurrent first-open can't abort this transaction - one side creates,
      // both sides get the row back.
      const conversation =
        booking.conversation ??
        (await tx.conversation.upsert({
          where: { bookingId },
          update: {},
          create: { bookingId },
        }));
      if (!conversation) {
        return { trigger, sent: false, reason: 'error' as const };
      }

      const content = renderBody(template.body, buildContext(booking as any));
      const message = await tx.conversationMessage.create({
        data: { conversationId: conversation.id, senderId: hostId, content },
      });
      await tx.conversation.update({ where: { id: conversation.id }, data: { updatedAt: new Date() } });
      await tx.automatedMessageLog.create({
        data: { bookingId, trigger, messageId: message.id },
      });

      return { trigger, sent: true, reason: 'sent' as const, conversationId: conversation.id };
    });

    if (result.sent && result.conversationId) {
      notifyGuestOfNewMessage(bookingId, result.conversationId).catch(() => {});
    }
    return result;
  } catch (err: any) {
    // A unique-log conflict means another instance delivered it first.
    if (err?.code === 'P2002') {
      return { trigger, sent: false, reason: 'already_sent' };
    }
    console.error(`AUTO-MESSAGE delivery failed booking=${bookingId} trigger=${trigger}:`, err?.message || err);
    return { trigger, sent: false, reason: 'error' };
  }
}

interface ContextBooking {
  checkIn: Date;
  checkOut: Date;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  guests: number;
  total: number;
  user: { firstName?: string | null; lastName?: string | null } | null;
  property: {
    host?: { firstName?: string | null; lastName?: string | null } | null;
    title: string;
    location: string;
    neighborhood?: string | null;
    address?: string | null;
  };
}

function buildContext(booking: ContextBooking): Record<string, string> {
  const p = booking.property;
  const guest = booking.user;
  const host = p.host;
  const guestName = [guest?.firstName, guest?.lastName].filter(Boolean).join(' ').trim();
  const hostName = [host?.firstName, host?.lastName].filter(Boolean).join(' ').trim();
  const checkInMs = nairobiDayMs(booking.checkIn);
  const daysUntil = Math.max(0, Math.round((checkInMs - nairobiDayMs(new Date())) / DAY_MS));

  return {
    guestFirstName: guest?.firstName || 'there',
    guestName: guestName || 'there',
    guest: guestName || 'there',
    hostFirstName: host?.firstName || 'your host',
    hostName: hostName || 'your host',
    host: hostName || 'your host',
    property: p.title || 'your stay',
    location: p.location || '',
    neighborhood: p.neighborhood || p.location || '',
    address: p.address || p.location || '',
    checkIn: fmtDate(booking.checkIn),
    checkOut: fmtDate(booking.checkOut),
    checkInTime: booking.checkInTime || '',
    checkOutTime: booking.checkOutTime || '',
    guests: String(booking.guests ?? 1),
    nights: String(calculateNights(booking.checkIn, booking.checkOut)),
    totalKes: `KES ${(booking.total ?? 0).toLocaleString('en-US')}`,
    daysUntilCheckIn: String(daysUntil),
  };
}

async function notifyGuestOfNewMessage(bookingId: string, conversationId: string): Promise<void> {
  try {
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      select: { userId: true },
    });
    if (!booking) return;
    const { sendPushToUser } = await import('./push.service.js');
    await sendPushToUser(
      booking.userId,
      'New message from your host',
      'Your host sent you a message about your stay.',
      `/inbox/${conversationId}`,
    );
  } catch {
    // Push is best-effort; never fail a delivered message.
  }
}

/** Booking just became CONFIRMED - send the confirmation message immediately.
 *  Fire-and-forget from the money paths; a failure must never roll back a
 *  payment/status write. Also safe on duplicate confirmations (dedupe log). */
export function fireBookingConfirmed(bookingId: string): Promise<DeliverOutcome> {
  return deliverTrigger(bookingId, 'BOOKING_CONFIRMED');
}

/**
 * Periodic scan: send every time-based trigger that has come due since the last
 * run. Safe to run on many instances - dedupe logs make each booking+trigger
 * send exactly once. Returns a summary for logging.
 */
export async function runDueAutoMessages(now: Date = new Date()): Promise<{ scanned: number; sent: number }> {
  const templates = await prisma.propertyMessageTemplate.findMany({ where: { enabled: true } });
  if (templates.length === 0) return { scanned: 0, sent: 0 };

  // propertyId|trigger -> persisted offsetDays. `undefined` marks a template
  // that doesn't exist for a property; null is a legitimate stored value.
  const byPropertyTrigger = new Map<string, number | null>();
  const propertyIds = new Set<string>();
  for (const t of templates) {
    byPropertyTrigger.set(`${t.propertyId}|${t.trigger}`, t.offsetDays);
    propertyIds.add(t.propertyId);
  }

  const todayMs = nairobiDayMs(now);
  // Bounded scan window. Future bound covers the largest PRE_ARRIVAL offset
  // (60d before check-in) with slack; past bound covers POST_STAY_REVIEW, whose
  // largest offset (60d after check-out) is due 60-62 days back, plus slack.
  const farFuture = new Date(now.getTime() + 120 * DAY_MS);
  const farPast = new Date(now.getTime() - 75 * DAY_MS);

  const bookings = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      propertyId: { in: [...propertyIds] },
      checkIn: { lte: farFuture },
      checkOut: { gte: farPast },
    },
    select: { id: true, checkIn: true, checkOut: true, propertyId: true },
  });

  let sent = 0;
  for (const booking of bookings) {
    for (const trigger of AUTO_MESSAGE_TRIGGERS) {
      if (trigger === 'BOOKING_CONFIRMED') continue; // handled on confirmation
      const offsetDays = byPropertyTrigger.get(`${booking.propertyId}|${trigger}`);
      if (offsetDays === undefined) continue;
      if (!isDue(trigger, offsetDays, booking, todayMs)) continue;
      const outcome = await deliverTrigger(booking.id, trigger);
      if (outcome.sent) sent += 1;
    }
  }

  return { scanned: bookings.length, sent };
}
