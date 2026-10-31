import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Badge, Button, TextInput } from 'flowbite-react';
import { AlertCircle, CalendarDays, Search } from 'lucide-react';
import apiClient from '../api/client.js';
import { firstImage } from '../utils/images.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';

// Every reservation across the host's listings. Hosts used to reach this list
// only through the traveller booking history, which mixes in the bookings they
// made as a guest. This one is scoped to their own listings by the API.

const DAY_MS = 86_400_000;

// Badge palette names carry the status instead of a set of hex fills, so the
// same status reads the same here as on the calendar and the overview cards.
const STATUS_COLOR = {
  CONFIRMED: 'success',
  PENDING: 'warning',
  CANCELLED: 'failure',
  CONFLICT: 'failure',
};

const STATUS_LABEL = {
  CONFIRMED: 'Confirmed',
  PENDING: 'Awaiting payment',
  CANCELLED: 'Cancelled',
  CONFLICT: 'Needs review',
};

const FILTERS = [
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'current', label: 'Staying now' },
  { key: 'past', label: 'Past' },
  { key: 'all', label: 'All' },
];

// Filters wrap on a phone rather than clip, so each pill is its own control:
// a wrapping capsule with one shared border would break mid-row. Every pill
// keeps a 44px touch height even though the label is only 12px.
const PILL = 'inline-flex min-h-11 items-center rounded-full border px-3 text-xs font-semibold transition-colors';
const PILL_SELECTED = 'border-transparent bg-navy-bg text-white';
const PILL_IDLE = 'border-border text-muted hover:border-primary hover:text-navy';

function startOfDay(value) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function nightsBetween(checkIn, checkOut) {
  const start = startOfDay(checkIn);
  const end = startOfDay(checkOut);
  if (!start || !end) return 0;
  const nights = Math.round((end - start) / DAY_MS);
  return nights > 0 ? nights : 0;
}

function formatRange(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Dates unavailable';
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function money(value) {
  return value == null ? '-' : `KES ${Number(value).toLocaleString()}`;
}

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function guestNameOf(booking) {
  const guest = booking.user || {};
  return [guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest';
}

/** Which bucket a reservation falls into. A cancelled booking is past whatever
 *  its dates say, because it will never be stayed in. */
function bucketOf(booking, today) {
  if (booking.status === 'CANCELLED') return 'past';
  const checkIn = startOfDay(booking.checkIn);
  const checkOut = startOfDay(booking.checkOut);
  if (!checkIn || !checkOut) return 'past';
  if (today >= checkIn && today < checkOut) return 'current';
  return today < checkIn ? 'upcoming' : 'past';
}

// One row of the list. It used to be a bordered card inside a bordered panel;
// inside the flush list the divider line does that job, so the row only owns
// its own padding and hover state.
function ReservationRow({ booking }) {
  const property = booking.property || {};
  const image = firstImage(property);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);

  return <Link
    to={`/host/reservations/${booking.id}`}
    className="flex min-w-0 flex-wrap items-start gap-3 px-4 py-3 transition-colors hover:bg-surface"
  >
    <span className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-surface">
      {image
        ? <img src={image} alt="" className="h-full w-full object-cover" />
        : <span className="grid h-full w-full place-items-center text-muted"><CalendarDays className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" /></span>}
    </span>

    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
        <strong className="truncate text-sm font-semibold text-navy">{guestNameOf(booking)}</strong>
        <Badge color={STATUS_COLOR[booking.status] || 'gray'}>
          {STATUS_LABEL[booking.status] || booking.status}
        </Badge>
      </div>
      <p className="mt-1 text-xs leading-relaxed text-muted">
        {formatRange(booking.checkIn, booking.checkOut)} <span aria-hidden="true" className="text-border">|</span> {plural(nights, 'night')} <span aria-hidden="true" className="text-border">|</span> {plural(booking.guests || 1, 'guest')}
      </p>
      <p className="mt-0.5 truncate text-xs text-muted">{property.title || 'Your listing'}</p>
    </div>

    {/* On a phone the amount drops under the thumbnail, indented to the text
        column so the guest name keeps the full width and nothing is clipped. */}
    <div className="w-full pl-[4.25rem] text-left sm:w-auto sm:pl-0 sm:text-right">
      <p className="text-sm font-semibold tabular-nums text-navy">{money(booking.hostNetAmount)}</p>
      <p className="text-[11px] text-muted">{booking.hostNetAmount != null ? 'your earnings' : 'not paid yet'}</p>
    </div>
  </Link>;
}

ReservationRow.propTypes = { booking: PropTypes.object.isRequired };

function LoadingRows() {
  return <div className="flex flex-col gap-2 px-4 py-4" role="status" aria-label="Loading reservations">
    <span className="block h-16 animate-pulse rounded-xl bg-inset" />
    <span className="block h-16 animate-pulse rounded-xl bg-inset [animation-delay:150ms]" />
    <span className="block h-16 animate-pulse rounded-xl bg-inset [animation-delay:300ms]" />
  </div>;
}

export default function HostReservationsPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('upcoming');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/bookings/host', { params: { limit: 100 } });
      setBookings(response.data.data || []);
    } catch {
      setError('Could not load your reservations. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const counts = useMemo(() => {
    const today = startOfDay(new Date());
    const tally = { upcoming: 0, current: 0, past: 0, all: bookings.length };
    for (const booking of bookings) tally[bucketOf(booking, today)] += 1;
    return tally;
  }, [bookings]);

  const visible = useMemo(() => {
    const today = startOfDay(new Date());
    const term = search.trim().toLowerCase();
    return bookings
      .filter((booking) => {
        if (filter !== 'all' && bucketOf(booking, today) !== filter) return false;
        if (!term) return true;
        return guestNameOf(booking).toLowerCase().includes(term)
          || (booking.property?.title || '').toLowerCase().includes(term);
      })
      .sort((a, b) => {
        const left = new Date(a.checkIn).getTime();
        const right = new Date(b.checkIn).getTime();
        // Upcoming reads soonest-first; past reads most-recent-first.
        return filter === 'past' ? right - left : left - right;
      });
  }, [bookings, filter, search]);

  return <div className="flex flex-col gap-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        <p className={HOST_EYEBROW}>Host workspace</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Reservations</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Every booking across your listings, newest first.</p>
      </div>
      <Button as={Link} to="/host/today" color="light" size="sm" className="w-full min-h-11 sm:w-fit sm:min-h-0">
        Today&apos;s schedule
      </Button>
    </header>

    {/* flush: the toolbar, the rows and the footer all run to the card edge and
        supply their own padding, so they line up with the card head above. */}
    <HostCard
      flush
      className="overflow-hidden"
      title="All reservations"
      description="Open a reservation for the guest, the dates and what you earn."
      action={loading ? undefined : <Badge color="gray">{visible.length} shown</Badge>}
    >
      {error && <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
          <p className="min-w-0 text-sm leading-relaxed text-charcoal">{error}</p>
        </div>
        <Button type="button" color="light" size="sm" onClick={load} className="min-h-11 sm:min-h-0">Try again</Button>
      </div>}

      <div className="border-b border-border px-4 py-3">
        <div className="flex flex-wrap items-center gap-2">
          {FILTERS.map((item) => <button
            key={item.key}
            type="button"
            onClick={() => setFilter(item.key)}
            aria-pressed={filter === item.key}
            className={`${PILL} ${filter === item.key ? PILL_SELECTED : PILL_IDLE}`}
          >
            {item.label}{counts[item.key] > 0 && <span className="ml-1.5 opacity-70">{counts[item.key]}</span>}
          </button>)}
        </div>

        {/* The icon sits outside the field so the input keeps the shared theme
            focus ring; [&_input]:pl-9 reserves the room for it. */}
        <div className="relative mt-3 [&_input]:pl-9">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.9} aria-hidden="true" />
          <TextInput
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search guests or listings"
            aria-label="Search reservations"
          />
        </div>
      </div>

      {loading ? <LoadingRows /> : visible.length === 0 ? (
        <div className="flex flex-col items-center gap-1.5 px-4 py-12 text-center">
          <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-muted">
            <CalendarDays className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
          </span>
          <strong className="mt-1 text-sm font-semibold text-navy">
            {bookings.length === 0 ? 'No reservations yet' : 'Nothing in this view'}
          </strong>
          <p className="mx-auto max-w-[320px] text-xs leading-relaxed text-muted">
            {bookings.length === 0
              ? 'When a guest books one of your listings, the reservation appears here with their dates and what you earn.'
              : 'Try another filter, or clear the search to see every reservation.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {visible.map((booking) => <li key={booking.id}><ReservationRow booking={booking} /></li>)}
        </ul>
      )}

      {!loading && visible.length > 0 && <p className="border-t border-border px-4 py-3 text-[11px] text-muted">
        Showing {visible.length} of {bookings.length} reservations{bookings.length >= 100 ? ' (the 100 most recent)' : ''}.
      </p>}
    </HostCard>
  </div>;
}
