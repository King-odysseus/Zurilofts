import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Badge, Button } from 'flowbite-react';
import { CalendarDays } from 'lucide-react';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { firstImage } from '../utils/images.js';
import { zuriImages } from '../assets/images.js';

const STATUS_META = {
  PENDING: { label: 'Awaiting confirmation', color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'failure' },
};

const TAB_BASE = 'inline-flex items-center gap-2 whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors';
const TAB_ACTIVE = 'bg-navy-bg text-white';
const TAB_IDLE = 'text-muted hover:text-navy';
const ROW_ACTION = 'text-xs font-semibold text-primary-600 hover:text-primary-700';
const SUBTLE_LINK = 'inline-flex min-h-[36px] items-center text-xs font-semibold text-muted hover:text-navy';

function tabClass(isActive) {
  return `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_IDLE}`;
}

function countClass(isActive) {
  return `rounded-full px-1.5 text-[11px] font-semibold ${isActive ? 'bg-white/20 text-white' : 'bg-surface text-navy'}`;
}

function getNights(checkIn, checkOut) {
  const nights = Math.round((new Date(checkOut) - new Date(checkIn)) / 86400000);
  return Number.isFinite(nights) && nights > 0 ? nights : 0;
}

function formatDateRange(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 'Dates unavailable';
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear();
  const startLabel = start.toLocaleDateString('en-GB', { day: 'numeric', month: sameMonth ? undefined : 'short' });
  const endLabel = end.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
  return `${startLabel} - ${endLabel}`;
}

function getBookingImage(booking, index = 0) {
  return firstImage(booking.property) || zuriImages[index % zuriImages.length];
}

function getMapUrl(property) {
  const query = [property?.title, property?.location, 'Nairobi'].filter(Boolean).join(' ');
  const mapsBase = ['https', '://www.google.com/maps/search/?api=1&query='].join('');
  return `${mapsBase}${encodeURIComponent(query)}`;
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status || 'Status unavailable', color: 'gray' };
  return <Badge color={meta.color}>{meta.label}</Badge>;
}

StatusPill.propTypes = {
  status: PropTypes.string.isRequired,
};

function UpcomingTripCard({ booking, index, onMessage, messagePending }) {
  const property = booking.property || {};
  const nights = getNights(booking.checkIn, booking.checkOut);
  const stayLink = `/property/${property.id || booking.propertyId}`;

  return <article className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
    <div className="grid grid-cols-1 sm:grid-cols-[240px_minmax(0,1fr)]">
      <Link to={stayLink} className="block h-40 w-full overflow-hidden sm:h-full" aria-label={`View ${property.title || 'stay'}`}>
        <img className="h-full w-full object-cover" src={getBookingImage(booking, index)} alt="" />
      </Link>
      <div className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-center gap-3">
          <StatusPill status={booking.status} />
          <time dateTime={booking.checkIn} className="text-xs font-medium text-muted">{formatDateRange(booking.checkIn, booking.checkOut)}</time>
        </div>
        <h2 className="mt-2 text-lg font-bold text-navy"><Link to={stayLink} className="hover:text-primary-600">{property.title || 'Your upcoming stay'}</Link></h2>
        <p className="mt-1 text-sm text-muted">{[property.location || 'Nairobi', `${booking.guests || 1} guest${booking.guests === 1 ? '' : 's'}`, `${nights} night${nights === 1 ? '' : 's'}`].join(' / ')}</p>
        {booking.total != null && <p className="mt-2 text-sm text-muted"><strong className="text-base font-bold tabular-nums text-navy">KES {Number(booking.total).toLocaleString()}</strong> total</p>}
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button as={Link} to={`/bookings/${booking.id}`} size="sm">View check-in details</Button>
          <Button color="light" size="sm" type="button" onClick={() => onMessage(booking.id)} disabled={messagePending}>{messagePending ? 'Opening...' : 'Message host'}</Button>
          <a className={SUBTLE_LINK} href={getMapUrl(property)} target="_blank" rel="noreferrer">Directions</a>
          <Link className={SUBTLE_LINK} to={`/bookings/${booking.id}`}>Receipt</Link>
        </div>
      </div>
    </div>
  </article>;
}

UpcomingTripCard.propTypes = {
  booking: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  onMessage: PropTypes.func.isRequired,
  messagePending: PropTypes.bool.isRequired,
};

function TripRow({ booking, index, isPast }) {
  const property = booking.property || {};
  const reviewed = Boolean(booking.review?.id);
  const status = STATUS_META[booking.status]?.label || booking.status;
  const stayLink = `/property/${property.id || booking.propertyId}`;

  return <article className="flex flex-col gap-3 border-b border-border py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex min-w-0 items-center gap-3">
      <img className="h-[52px] w-16 shrink-0 rounded-lg object-cover" src={getBookingImage(booking, index + 1)} alt="" />
      <div className="min-w-0">
        <strong className="block truncate text-sm font-semibold text-navy">{property.title || 'Your stay'}</strong>
        <span className="mt-0.5 block truncate text-xs text-muted">{formatDateRange(booking.checkIn, booking.checkOut)} / {status}</span>
      </div>
    </div>
    <div className="flex flex-wrap items-center gap-3 sm:justify-end">
      {isPast && !reviewed
        ? <Link className={ROW_ACTION} to={`${stayLink}?review=true`}>Leave a review</Link>
        : <Link className={ROW_ACTION} to={isPast ? stayLink : `/bookings/${booking.id}`}>{isPast ? 'View stay' : 'View trip'}</Link>}
      {isPast && booking.status !== 'CANCELLED' && <Link className={ROW_ACTION} to={stayLink}>Book again</Link>}
    </div>
  </article>;
}

TripRow.propTypes = {
  booking: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isPast: PropTypes.bool.isRequired,
};

function EmptyTrips({ isPast }) {
  return <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
    <CalendarDays className="h-8 w-8 text-primary-600" strokeWidth={1.6} aria-hidden="true" />
    <h2 className="text-lg font-bold text-navy">{isPast ? 'No past trips' : 'No upcoming trips'}</h2>
    <p className="max-w-md text-sm leading-relaxed text-muted">{isPast ? 'Completed stays will appear here with review and rebooking options.' : 'When you book a stay, your check-in details and host messages will appear here.'}</p>
    {!isPast && <Button as={Link} to="/properties">Browse stays</Button>}
  </div>;
}

EmptyTrips.propTypes = {
  isPast: PropTypes.bool.isRequired,
};

function TripHubPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('upcoming');
  const [messageBookingId, setMessageBookingId] = useState(null);

  useEffect(() => {
    document.title = 'Trips | ZuriLofts';
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    async function fetchBookings() {
      try {
        setLoading(true);
        setError(null);
        const response = await apiClient.get('/bookings?limit=50');
        if (!cancelled) setBookings(response.data.data || []);
      } catch {
        if (!cancelled) setError('Could not load your trips. Please try again.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    fetchBookings();
    return () => { cancelled = true; };
  }, [isAuthenticated]);

  const { upcoming, past } = useMemo(() => {
    const now = new Date();
    const next = [];
    const previous = [];
    for (const booking of bookings) {
      if (booking.status === 'CANCELLED' || new Date(booking.checkOut) < now) previous.push(booking);
      else next.push(booking);
    }
    next.sort((a, b) => new Date(a.checkIn) - new Date(b.checkIn));
    previous.sort((a, b) => new Date(b.checkOut) - new Date(a.checkOut));
    return { upcoming: next, past: previous };
  }, [bookings]);

  async function openConversation(bookingId) {
    try {
      setMessageBookingId(bookingId);
      const response = await apiClient.post('/conversations', { bookingId });
      navigate(`/inbox/${response.data.data.id}`);
    } catch {
      setError('Could not open the conversation. Please try again.');
    } finally {
      setMessageBookingId(null);
    }
  }

  const displayed = activeTab === 'upcoming' ? upcoming : past;
  const featured = activeTab === 'upcoming' ? displayed[0] : null;
  const rows = featured ? displayed.slice(1) : displayed;

  return <GuestAccountLayout
    active="trips"
    eyebrow="Travel"
    title="Your trips"
    description="The stays you have coming up, plus the places you have already visited."
    action={<Button as={Link} to="/booking-history" color="light">Booking history</Button>}
  >
    <div className="mb-5 inline-flex flex-wrap gap-1 rounded-full border border-border bg-white p-1" role="tablist" aria-label="Trip status">
      <button className={tabClass(activeTab === 'upcoming')} type="button" role="tab" aria-selected={activeTab === 'upcoming'} onClick={() => setActiveTab('upcoming')}>Upcoming{upcoming.length > 0 && <span className={countClass(activeTab === 'upcoming')}>{upcoming.length}</span>}</button>
      <button className={tabClass(activeTab === 'past')} type="button" role="tab" aria-selected={activeTab === 'past'} onClick={() => setActiveTab('past')}>Past{past.length > 0 && <span className={countClass(activeTab === 'past')}>{past.length}</span>}</button>
    </div>

    {loading ? <div className="flex flex-col gap-3" aria-label="Loading trips"><span className="block h-28 animate-pulse rounded-xl bg-white" /><span className="block h-28 animate-pulse rounded-xl bg-white" /><span className="block h-28 animate-pulse rounded-xl bg-white" /></div> : error ? <Alert color="failure">
      <p>{error}</p>
      <Button color="light" size="sm" type="button" onClick={() => window.location.reload()} className="mt-2">Try again</Button>
    </Alert> : displayed.length === 0 ? <EmptyTrips isPast={activeTab === 'past'} /> : <div className="flex flex-col gap-3">
      {featured && <UpcomingTripCard booking={featured} index={0} onMessage={openConversation} messagePending={messageBookingId === featured.id} />}
      {rows.map((booking, index) => <TripRow key={booking.id} booking={booking} index={index} isPast={activeTab === 'past'} />)}
    </div>}
  </GuestAccountLayout>;
}

export default TripHubPage;
