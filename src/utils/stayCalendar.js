// "Add to calendar" for a reservation.
//
// Built entirely in the browser: the booking the guest is already looking at
// carries every field needed, so there is no endpoint and no new dependency.
// The .ics download and the Google Calendar link are generated from one event
// definition so the two can never drift apart.
//
// A stay is one event spanning check-in to check-out rather than two separate
// reminders, which is how a trip is normally kept in a calendar; the clock times
// still appear in the description.

const CHECK_IN_FALLBACK = '15:00';
const CHECK_OUT_FALLBACK = '10:00';

// Only a confirmed stay is worth putting in a calendar. Pending (unpaid) and
// cancelled bookings would leave a trip in the calendar that never happened.
const ADDABLE_STATUS = 'CONFIRMED';

function pad(value) {
  return String(value).padStart(2, '0');
}

// Booking dates come back from the database as ISO strings at UTC midnight.
// Reading the date straight off the string preserves the stated calendar day;
// new Date(iso).getDate() would hand a guest west of UTC the previous day.
function calendarDay(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value ?? ''));
  if (!match) return null;
  return { year: Number(match[1]), month: Number(match[2]), day: Number(match[3]) };
}

function clockParts(value, fallback) {
  const match = /^(\d{1,2}):(\d{2})/.exec(String(value ?? ''))
    ?? /^(\d{1,2}):(\d{2})/.exec(fallback);
  return {
    hour: Math.min(Number(match[1]), 23),
    minute: Math.min(Number(match[2]), 59),
  };
}

// iCalendar timestamp, in the property's local time. Deliberately no trailing Z
// and no timezone: a floating value keeps "3:00 PM" as 3:00 PM on whichever
// calendar imports it, instead of shifting with the guest's own offset.
function localStamp(day, time) {
  return `${day.year}${pad(day.month)}${pad(day.day)}T${pad(time.hour)}${pad(time.minute)}00`;
}

function utcNowStamp() {
  const now = new Date();
  return `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`
    + `T${pad(now.getUTCHours())}${pad(now.getUTCMinutes())}${pad(now.getUTCSeconds())}Z`;
}

// Pinned to UTC on purpose: the day parts are already the guest's calendar day,
// so formatting them through local time would reintroduce the off-by-one.
function humanDate(day) {
  return new Date(Date.UTC(day.year, day.month - 1, day.day))
    .toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' });
}

function humanTime(time) {
  const suffix = time.hour >= 12 ? 'PM' : 'AM';
  return `${time.hour % 12 === 0 ? 12 : time.hour % 12}:${pad(time.minute)} ${suffix}`;
}

function bookingReference(booking) {
  return booking?.id ? booking.id.slice(-8).toUpperCase() : 'booking';
}

function bookingLink(booking) {
  // window is absent outside the browser; the link is a convenience, not a
  // requirement, so a missing origin just drops the line.
  if (!booking?.id || typeof window === 'undefined') return '';
  return `${window.location.origin}/bookings/${booking.id}`;
}

export function canAddToCalendar(booking) {
  return Boolean(booking && booking.status === ADDABLE_STATUS
    && calendarDay(booking.checkIn) && calendarDay(booking.checkOut));
}

// Same check plus "the stay has not already ended", used where a list would
// otherwise offer a calendar entry for a trip from last year.
export function isUpcomingStay(booking) {
  const end = calendarDay(booking?.checkOut);
  if (!end) return false;
  const today = new Date();
  const todayStamp = `${today.getFullYear()}${pad(today.getMonth() + 1)}${pad(today.getDate())}`;
  return `${end.year}${pad(end.month)}${pad(end.day)}` >= todayStamp;
}

function stayEvent(booking) {
  if (!canAddToCalendar(booking)) return null;

  const checkInDay = calendarDay(booking.checkIn);
  const checkOutDay = calendarDay(booking.checkOut);
  const start = localStamp(checkInDay, clockParts(booking.checkInTime, CHECK_IN_FALLBACK));
  const end = localStamp(checkOutDay, clockParts(booking.checkOutTime, CHECK_OUT_FALLBACK));

  // The stamp format is fixed width and big-endian, so a plain string compare is
  // a valid ordering check. This catches reversed dates rather than writing an
  // event that ends before it starts.
  if (end <= start) return null;

  const property = booking.property || {};
  const reference = bookingReference(booking);
  const title = property.title ? `Stay at ${property.title}` : 'ZuriLofts stay';

  const details = [
    `ZuriLofts booking ${reference}`,
    `Check-in: ${humanDate(checkInDay)}, ${humanTime(clockParts(booking.checkInTime, CHECK_IN_FALLBACK))}`,
    `Check-out: ${humanDate(checkOutDay)}, ${humanTime(clockParts(booking.checkOutTime, CHECK_OUT_FALLBACK))}`,
  ];
  if (booking.guests) details.push(`Guests: ${booking.guests}`);
  const link = bookingLink(booking);
  if (link) details.push(link);

  return {
    uid: `${booking.id}@zurilofts.com`,
    reference,
    summary: title,
    location: property.address || property.location || 'Nairobi',
    description: details.join('\n'),
    start,
    end,
    startDay: checkInDay,
  };
}

// RFC 5545 TEXT values need backslash, semicolon, comma and newlines escaped.
function escapeText(value) {
  return String(value ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

// RFC 5545 also caps a content line at 75 octets, continued with a leading
// space. Measured in bytes rather than characters: splitting a multi-byte
// character across the limit would corrupt it for the importing calendar.
function foldLine(line) {
  const encoder = new TextEncoder();
  if (encoder.encode(line).length <= 75) return line;

  const chunks = [];
  let current = '';
  let bytes = 0;
  for (const character of line) {
    const size = encoder.encode(character).length;
    // Continuation lines spend one byte of their budget on the leading space.
    if (bytes + size > (chunks.length === 0 ? 75 : 74)) {
      chunks.push(current);
      current = '';
      bytes = 0;
    }
    current += character;
    bytes += size;
  }
  if (current) chunks.push(current);
  return chunks.join('\r\n ');
}

export function stayCalendarFile(booking) {
  const event = stayEvent(booking);
  if (!event) return null;

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//ZuriLofts//Stay//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.uid}`,
    `DTSTAMP:${utcNowStamp()}`,
    `DTSTART:${event.start}`,
    `DTEND:${event.end}`,
    `SUMMARY:${escapeText(event.summary)}`,
    `LOCATION:${escapeText(event.location)}`,
    `DESCRIPTION:${escapeText(event.description)}`,
    'STATUS:CONFIRMED',
    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',
    `DESCRIPTION:${escapeText(`${event.summary} tomorrow`)}`,
    'END:VALARM',
    'END:VEVENT',
    'END:VCALENDAR',
  ];

  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

/**
 * Downloads the stay as an .ics file, which Apple Calendar, Outlook and Google
 * Calendar all accept. Returns false when the booking cannot be added, so
 * callers can stay silent instead of saving an empty file.
 */
export function downloadStayCalendar(booking) {
  const ics = stayCalendarFile(booking);
  if (!ics) return false;

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `ZuriLofts-${bookingReference(booking)}.ics`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  // Revoking straight away cancels the download in Safari, so let it start first.
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  return true;
}

export function googleCalendarUrl(booking) {
  const event = stayEvent(booking);
  if (!event) return null;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: event.summary,
    dates: `${event.start}/${event.end}`,
    details: event.description,
    location: event.location,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
