import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Button } from 'flowbite-react';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import apiClient from '../api/client.js';
import { firstImage } from '../utils/images.js';
import { zuriImages } from '../assets/images.js';
import { generateInvoice } from '../utils/invoice.js';
import { canAddToCalendar, downloadStayCalendar, isUpcomingStay } from '../utils/stayCalendar.js';

// Booking state reads as a tinted pill: one shape, one tone per status, so the
// guest pages match the admin and host surfaces.
const STATUS_PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold';
const STATUS_TONE_IDLE = 'bg-[#F1F5F9] text-[#475569]';

const STATUS_META = {
  PENDING: { label: 'Pending', className: 'bg-[#FDF3D8] text-[#8A5A00]' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-[#E7F6EE] text-[#157347]' },
  CANCELLED: { label: 'Cancelled', className: 'bg-[#FDECEC] text-[#B42318]' },
};

const FILTERS = [
  { value: 'all', label: 'All bookings' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatDate(iso) {
  if (!iso) return '-';
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatCurrency(value) {
  return value == null ? '-' : `KES ${Number(value).toLocaleString()}`;
}

function getBookingImage(booking, index = 0) {
  return firstImage(booking.property) || zuriImages[index % zuriImages.length];
}

function HistoryCard({ booking, index, onMessage, messagePending }) {
  const property = booking.property || {};
  const status = STATUS_META[booking.status] || { label: booking.status || 'Unknown', className: STATUS_TONE_IDLE };

  return <article className="opg-history-card rounded-xl border border-border">
    <Link to={`/property/${property.id || booking.propertyId}`} className="opg-history-image" aria-label={`View ${property.title || 'stay'}`}>
      <img src={getBookingImage(booking, index)} alt="" />
    </Link>
    <div className="opg-history-copy">
      <div className="opg-history-title-row">
        <div>
          <h2><Link to={`/property/${property.id || booking.propertyId}`}>{property.title || 'Property'}</Link></h2>
          <p>{property.location || 'Nairobi'}</p>
        </div>
        <span className={`${STATUS_PILL} ${status.className}`}>{status.label}</span>
      </div>

      <dl className="opg-history-meta">
        <div><dt>Check-in</dt><dd>{formatDate(booking.checkIn)}</dd></div>
        <div><dt>Check-out</dt><dd>{formatDate(booking.checkOut)}</dd></div>
        <div><dt>Guests</dt><dd>{booking.guests || 1}</dd></div>
        <div><dt>Total</dt><dd>{formatCurrency(booking.total)}</dd></div>
      </dl>

      <div className="opg-history-actions">
        <Button size="sm" type="button" onClick={() => onMessage(booking.id)} disabled={messagePending}>{messagePending ? 'Opening...' : 'Message host'}</Button>
        <Button color="light" size="sm" type="button" onClick={() => generateInvoice(booking)}>Invoice</Button>
        {canAddToCalendar(booking) && isUpcomingStay(booking) && (
          <Button color="light" size="sm" type="button" onClick={() => downloadStayCalendar(booking)}>Add to calendar</Button>
        )}
        <Button as={Link} to={`/property/${property.id || booking.propertyId}`} color="light" size="sm">View stay</Button>
        <Button as={Link} to={`/bookings/${booking.id}`} color="light" size="sm">Booking details</Button>
      </div>
    </div>
  </article>;
}

function EmptyHistory() {
  return <div className="opg-trip-empty">
    <ClipboardList strokeWidth={1.6} aria-hidden="true" />
    <h2>No bookings found</h2>
    <p>Try another filter, or browse available stays to plan your next trip.</p>
    <Button as={Link} to="/properties" size="sm">Browse stays</Button>
  </div>;
}

function BookingHistoryPage() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [statusFilter, setStatusFilter] = useState('all');
  const [messageBookingId, setMessageBookingId] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    const params = { limit: 100 };
    if (statusFilter === 'cancelled') params.status = 'CANCELLED';
    apiClient.get('/bookings', { params })
      .then((response) => { if (!cancelled) setBookings(response.data.data || []); })
      .catch(() => { if (!cancelled) setError('Could not load your booking history. Please try again.'); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [statusFilter]);

  const filtered = useMemo(() => {
    const now = new Date();
    if (statusFilter === 'upcoming') return bookings.filter((booking) => booking.status === 'CONFIRMED' && new Date(booking.checkIn) >= now);
    if (statusFilter === 'past') return bookings.filter((booking) => booking.status === 'CONFIRMED' && new Date(booking.checkOut) < now);
    if (statusFilter === 'cancelled') return bookings.filter((booking) => booking.status === 'CANCELLED');
    return bookings;
  }, [bookings, statusFilter]);

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

  return <GuestAccountLayout
    active="bookings"
    eyebrow="Travel"
    title="Booking history"
    description="Every reservation, receipt, and conversation in one place."
    action={<Button as={Link} to="/trips" className="w-fit max-md:mt-3.5" size="sm">Upcoming trips</Button>}
  >
    <div className="opg-history-tabs" role="tablist" aria-label="Booking status">
      {FILTERS.map((filter) => <button key={filter.value} type="button" role="tab" aria-selected={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)}>{filter.label}</button>)}
    </div>

    <p className="opg-history-count">{loading ? 'Loading bookings...' : `${filtered.length} booking${filtered.length === 1 ? '' : 's'}`}</p>

    {loading ? <div className="opg-trip-loading" aria-label="Loading booking history"><span /><span /><span /></div> : error ? <div className="opg-trip-error"><p>{error}</p><Button className="mx-auto w-fit" size="sm" type="button" onClick={() => window.location.reload()}>Try again</Button></div> : filtered.length === 0 ? <EmptyHistory /> : <div className="opg-history-list">
      {filtered.map((booking, index) => <HistoryCard key={booking.id} booking={booking} index={index} onMessage={openConversation} messagePending={messageBookingId === booking.id} />)}
    </div>}
  </GuestAccountLayout>;
}

export default BookingHistoryPage;
