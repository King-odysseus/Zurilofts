import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Button } from 'flowbite-react';
import { CalendarDays, Search } from 'lucide-react';
import apiClient from '../api/client.js';
import { firstImage } from '../utils/images.js';

// Every reservation across the host's listings. Hosts used to reach this list
// only through the traveller booking history, which mixes in the bookings they
// made as a guest. This one is scoped to their own listings by the API.

const CARD = 'rounded-xl border border-border bg-elevated shadow-sm';
const PANEL_HEAD = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';
const DAY_MS = 86_400_000;

const STATUS_TONE = {
  CONFIRMED: 'bg-[#E7F6EE] text-[#157347]',
  PENDING: 'bg-[#FDF3D8] text-[#8A5A00]',
  CANCELLED: 'bg-[#FDECEC] text-[#B42318]',
  CONFLICT: 'bg-[#FDECEC] text-[#B42318]',
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

function ReservationRow({ booking }) {
  const property = booking.property || {};
  const image = firstImage(property);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const statusClass = STATUS_TONE[booking.status] || 'bg-[#F1F5F9] text-[#475569]';

  return <Link
    to={`/host/reservations/${booking.id}`}
    className="flex flex-col gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-surface sm:flex-row sm:items-center"
  >
    <span className="h-16 w-full shrink-0 overflow-hidden rounded-lg bg-surface sm:h-14 sm:w-20">
      {image
        ? <img src={image} alt="" className="h-full w-full object-cover" />
        : <span className="grid h-full w-full place-items-center text-muted"><CalendarDays className="h-4 w-4" strokeWidth={1.6} aria-hidden="true" /></span>}
    </span>

    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-2">
        <strong className="truncate text-sm font-semibold text-navy">{guestNameOf(booking)}</strong>
        <span className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}>
          {STATUS_LABEL[booking.status] || booking.status}
        </span>
      </div>
      <p className="mt-0.5 truncate text-xs text-muted">{formatRange(booking.checkIn, booking.checkOut)} <span aria-hidden="true">·</span> {plural(nights, 'night')} <span aria-hidden="true">·</span> {plural(booking.guests || 1, 'guest')}</p>
      <p className="mt-0.5 truncate text-xs text-muted">{property.title || 'Your listing'}</p>
    </div>

    <div className="shrink-0 text-left sm:text-right">
      <p className="text-sm font-semibold tabular-nums text-navy">{money(booking.hostNetAmount)}</p>
      <p className="text-[10px] text-muted">{booking.hostNetAmount != null ? 'your earnings' : 'not paid yet'}</p>
    </div>
  </Link>;
}

ReservationRow.propTypes = { booking: PropTypes.object.isRequired };

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

  return <div className="space-y-4">
    <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className={PANEL_HEAD}>HOST WORKSPACE</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Reservations</h1>
      </div>
      <Button as={Link} to="/host/today" size="sm" color="light" className="w-fit">Today&apos;s schedule</Button>
    </header>

    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button size="xs" color="light" onClick={load}>Try again</Button>
      </div>
    </Alert>}

    <section className={`${CARD} p-3`} aria-label="Reservations">
      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((item) => <button
          key={item.key}
          type="button"
          onClick={() => setFilter(item.key)}
          aria-pressed={filter === item.key}
          className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === item.key ? 'bg-navy-bg text-white' : 'border border-border text-muted hover:text-navy'}`}
        >
          {item.label}{counts[item.key] > 0 && <span className="ml-1.5 opacity-70">{counts[item.key]}</span>}
        </button>)}
      </div>

      <label className="mt-3 flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1.5 text-muted focus-within:border-primary">
        <Search className="h-3.5 w-3.5 shrink-0" strokeWidth={1.9} aria-hidden="true" />
        <input
          type="search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search guests or listings"
          aria-label="Search reservations"
          className="w-full border-0 bg-transparent p-0 text-xs text-navy placeholder:text-muted focus:outline-none focus:ring-0"
        />
      </label>

      <div className="mt-3">
        {loading ? <div className="space-y-2" aria-label="Loading reservations">
          <span className="block h-20 animate-pulse rounded-xl bg-surface" />
          <span className="block h-20 animate-pulse rounded-xl bg-surface" />
          <span className="block h-20 animate-pulse rounded-xl bg-surface" />
        </div> : visible.length === 0 ? <div className="rounded-xl border border-dashed border-border px-4 py-12 text-center">
          <span className="mx-auto grid h-10 w-10 place-items-center rounded-full bg-surface text-muted"><CalendarDays className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></span>
          <strong className="mt-3 block text-sm font-semibold text-navy">
            {bookings.length === 0 ? 'No reservations yet' : 'Nothing in this view'}
          </strong>
          <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-muted">
            {bookings.length === 0
              ? 'When a guest books one of your listings, the reservation appears here with their dates and what you earn.'
              : 'Try another filter, or clear the search to see every reservation.'}
          </p>
        </div> : <div className="space-y-2">
          {visible.map((booking) => <ReservationRow key={booking.id} booking={booking} />)}
        </div>}
      </div>

      {!loading && visible.length > 0 && <p className="mt-3 text-[11px] text-muted">
        Showing {visible.length} of {bookings.length} reservations{bookings.length >= 100 ? ' (the 100 most recent)' : ''}.
      </p>}
    </section>
  </div>;
}
