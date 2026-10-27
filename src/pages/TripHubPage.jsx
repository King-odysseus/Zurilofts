import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { CalendarDays } from 'lucide-react';
import { Button } from 'flowbite-react';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { firstImage } from '../utils/images.js';
import { zuriImages } from '../assets/images.js';

// Booking state reads as a tinted pill: one shape, one tone per status, so the
// guest pages match the admin and host surfaces.
const STATUS_PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold';
const STATUS_TONE_IDLE = 'bg-[#F1F5F9] text-[#475569]';

const STATUS_META = {
  PENDING: { label: 'Awaiting confirmation', className: 'bg-[#FDF3D8] text-[#8A5A00]' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-[#E7F6EE] text-[#157347]' },
  CANCELLED: { label: 'Cancelled', className: 'bg-[#FDECEC] text-[#B42318]' },
};

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

function getCalendarUrl(booking) {
  const property = booking.property || {};
  const toDay = (value) => new Date(value).toISOString().slice(0, 10).replace(/-/g, '');
  if (Number.isNaN(new Date(booking.checkIn).getTime()) || Number.isNaN(new Date(booking.checkOut).getTime())) return null;
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: `Stay at ${property.title || 'ZuriLofts'}`,
    dates: `${toDay(booking.checkIn)}/${toDay(booking.checkOut)}`,
    location: property.location || '',
    details: `ZuriLofts booking ${booking.id}`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status || 'Status unavailable', className: STATUS_TONE_IDLE };
  return <span className={`${STATUS_PILL} ${meta.className}`}>{meta.label}</span>;
}

StatusPill.propTypes = {
  status: PropTypes.string.isRequired,
};

function UpcomingTripCard({ booking, index, onMessage, messagePending }) {
  const property = booking.property || {};
  const nights = getNights(booking.checkIn, booking.checkOut);

  return <article className="opg-trip-feature rounded-xl border border-border">
    <Link to={`/property/${property.id || booking.propertyId}`} className="opg-trip-feature-image" aria-label={`View ${property.title || 'stay'}`}>
      <img src={getBookingImage(booking, index)} alt="" />
    </Link>
    <div className="opg-trip-feature-copy">
      <div className="opg-trip-meta">
        <StatusPill status={booking.status} />
        <time dateTime={booking.checkIn}>{formatDateRange(booking.checkIn, booking.checkOut)}</time>
      </div>
      <h2><Link to={`/property/${property.id || booking.propertyId}`}>{property.title || 'Your upcoming stay'}</Link></h2>
      <p className="opg-trip-subtitle">{[property.location || 'Nairobi', `${booking.guests || 1} guest${booking.guests === 1 ? '' : 's'}`, `${nights} night${nights === 1 ? '' : 's'}`].join(' / ')}</p>
      {booking.total != null && <p className="opg-trip-price"><strong>KES {Number(booking.total).toLocaleString()}</strong> total</p>}
      <div className="opg-trip-actions">
        <Button as={Link} to={`/bookings/${booking.id}`} size="sm">View check-in details</Button>
        <Button color="light" size="sm" type="button" onClick={() => onMessage(booking.id)} disabled={messagePending}>{messagePending ? 'Opening...' : 'Message host'}</Button>
        <Button as="a" href={getMapUrl(property)} target="_blank" rel="noreferrer" color="light" size="sm">Directions</Button>
        <Button as={Link} to={`/bookings/${booking.id}`} color="light" size="sm">Receipt</Button>
        {getCalendarUrl(booking) && <Button as="a" href={getCalendarUrl(booking)} target="_blank" rel="noreferrer" color="light" size="sm">Add to calendar</Button>}
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

  return <article className="opg-trip-row">
    <img src={getBookingImage(booking, index + 1)} alt="" />
    <div className="opg-trip-row-copy">
      <strong>{property.title || 'Your stay'}</strong>
      <span>{formatDateRange(booking.checkIn, booking.checkOut)} / {status}</span>
    </div>
    {/* The grid has three columns, so the row actions share one cell; two
        separate buttons would wrap into a squeezed implicit row. */}
    <div className="flex flex-wrap items-center gap-2 max-md:col-start-2">
      {isPast && !reviewed
        ? <Button as={Link} to={`/property/${property.id || booking.propertyId}?review=true`} size="sm">Leave a review</Button>
        : <Button as={Link} to={isPast ? `/property/${property.id || booking.propertyId}` : `/bookings/${booking.id}`} color="light" size="sm">{isPast ? 'View stay' : 'View trip'}</Button>}
      {isPast && booking.status !== 'CANCELLED' && <Button as={Link} to={`/property/${property.id || booking.propertyId}`} color="light" size="sm">Book again</Button>}
    </div>
  </article>;
}

TripRow.propTypes = {
  booking: PropTypes.object.isRequired,
  index: PropTypes.number.isRequired,
  isPast: PropTypes.bool.isRequired,
};

function EmptyTrips({ isPast }) {
  return <div className="opg-trip-empty">
    <CalendarDays strokeWidth={1.6} aria-hidden="true" />
    <h2>{isPast ? 'No past trips' : 'No upcoming trips'}</h2>
    <p>{isPast ? 'Completed stays will appear here with review and rebooking options.' : 'When you book a stay, your check-in details and host messages will appear here.'}</p>
    {!isPast && <Button as={Link} to="/properties" size="sm">Browse stays</Button>}
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
    action={<Button as={Link} to="/booking-history" className="w-fit max-md:mt-3.5" size="sm">Booking history</Button>}
  >
    <div className="opg-trip-tabs" role="tablist" aria-label="Trip status">
      <button type="button" role="tab" aria-selected={activeTab === 'upcoming'} onClick={() => setActiveTab('upcoming')}>Upcoming{upcoming.length > 0 && <span>{upcoming.length}</span>}</button>
      <button type="button" role="tab" aria-selected={activeTab === 'past'} onClick={() => setActiveTab('past')}>Past{past.length > 0 && <span>{past.length}</span>}</button>
    </div>

    {loading ? <div className="opg-trip-loading" aria-label="Loading trips"><span /><span /><span /></div> : error ? <div className="opg-trip-error"><p>{error}</p><Button className="mx-auto w-fit" size="sm" type="button" onClick={() => window.location.reload()}>Try again</Button></div> : displayed.length === 0 ? <EmptyTrips isPast={activeTab === 'past'} /> : <div className="opg-trips-list">
      {featured && <UpcomingTripCard booking={featured} index={0} onMessage={openConversation} messagePending={messageBookingId === featured.id} />}
      {rows.map((booking, index) => <TripRow key={booking.id} booking={booking} index={index} isPast={activeTab === 'past'} />)}
    </div>}
  </GuestAccountLayout>;
}

export default TripHubPage;
