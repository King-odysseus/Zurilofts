import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import apiClient from '../api/client.js';
import { firstImage } from '../utils/images.js';
import { zuriImages } from '../assets/images.js';
import { generateInvoice } from '../utils/invoice.js';

const STATUS_META = {
  PENDING: { label: 'Pending', className: 'is-pending' },
  CONFIRMED: { label: 'Confirmed', className: '' },
  CANCELLED: { label: 'Cancelled', className: 'is-cancelled' },
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
  const status = STATUS_META[booking.status] || { label: booking.status || 'Unknown', className: '' };

  return <article className="opg-history-card">
    <Link to={`/property/${property.id || booking.propertyId}`} className="opg-history-image" aria-label={`View ${property.title || 'stay'}`}>
      <img src={getBookingImage(booking, index)} alt="" />
    </Link>
    <div className="opg-history-copy">
      <div className="opg-history-title-row">
        <div>
          <h2><Link to={`/property/${property.id || booking.propertyId}`}>{property.title || 'Property'}</Link></h2>
          <p>{property.location || 'Nairobi'}</p>
        </div>
        <span className={`opg-trip-status ${status.className}`}>{status.label}</span>
      </div>

      <dl className="opg-history-meta">
        <div><dt>Check-in</dt><dd>{formatDate(booking.checkIn)}</dd></div>
        <div><dt>Check-out</dt><dd>{formatDate(booking.checkOut)}</dd></div>
        <div><dt>Guests</dt><dd>{booking.guests || 1}</dd></div>
        <div><dt>Total</dt><dd>{formatCurrency(booking.total)}</dd></div>
      </dl>

      <div className="opg-history-actions">
        <button className="opg-trip-primary" type="button" onClick={() => onMessage(booking.id)} disabled={messagePending}>{messagePending ? 'Opening...' : 'Message host'}</button>
        <button className="opg-trip-secondary" type="button" onClick={() => generateInvoice(booking)}>Invoice</button>
        <Link className="opg-trip-link" to={`/property/${property.id || booking.propertyId}`}>View stay</Link>
        <Link className="opg-trip-link" to={`/booking/${booking.id}`}>Booking details</Link>
      </div>
    </div>
  </article>;
}

function EmptyHistory() {
  return <div className="opg-trip-empty">
    <ClipboardList strokeWidth={1.6} aria-hidden="true" />
    <h2>No bookings found</h2>
    <p>Try another filter, or browse available stays to plan your next trip.</p>
    <Link className="opg-trip-primary" to="/properties">Browse stays</Link>
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
    document.title = 'Booking history | ZuriLofts';
  }, []);

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
    action={<Link className="opg-account-action" to="/trips">Upcoming trips</Link>}
  >
    <div className="opg-history-tabs" role="tablist" aria-label="Booking status">
      {FILTERS.map((filter) => <button key={filter.value} type="button" role="tab" aria-selected={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)}>{filter.label}</button>)}
    </div>

    <p className="opg-history-count">{loading ? 'Loading bookings...' : `${filtered.length} booking${filtered.length === 1 ? '' : 's'}`}</p>

    {loading ? <div className="opg-trip-loading" aria-label="Loading booking history"><span /><span /><span /></div> : error ? <div className="opg-trip-error"><p>{error}</p><button className="opg-trip-primary" type="button" onClick={() => window.location.reload()}>Try again</button></div> : filtered.length === 0 ? <EmptyHistory /> : <div className="opg-history-list">
      {filtered.map((booking, index) => <HistoryCard key={booking.id} booking={booking} index={index} onMessage={openConversation} messagePending={messageBookingId === booking.id} />)}
    </div>}
  </GuestAccountLayout>;
}

export default BookingHistoryPage;
