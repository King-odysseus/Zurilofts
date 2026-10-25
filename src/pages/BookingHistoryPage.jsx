import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Alert, Badge, Button } from 'flowbite-react';
import { ClipboardList } from 'lucide-react';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import apiClient from '../api/client.js';
import { firstImage } from '../utils/images.js';
import { zuriImages } from '../assets/images.js';
import { generateInvoice } from '../utils/invoice.js';
import { canAddToCalendar, downloadStayCalendar, isUpcomingStay } from '../utils/stayCalendar.js';

const STATUS_META = {
  PENDING: { label: 'Pending', color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'failure' },
};

const FILTERS = [
  { value: 'all', label: 'All bookings' },
  { value: 'upcoming', label: 'Upcoming' },
  { value: 'past', label: 'Past' },
  { value: 'cancelled', label: 'Cancelled' },
];

const TAB_BASE = 'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors';
const TAB_ACTIVE = 'bg-navy-bg text-white';
const TAB_IDLE = 'text-muted hover:text-navy';
const ROW_LINK = 'inline-flex min-h-[36px] items-center text-xs font-semibold text-muted hover:text-navy';

function tabClass(isActive) {
  return `${TAB_BASE} ${isActive ? TAB_ACTIVE : TAB_IDLE}`;
}

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
  const status = STATUS_META[booking.status] || { label: booking.status || 'Unknown', color: 'gray' };
  const stayLink = `/property/${property.id || booking.propertyId}`;

  return <article className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
    <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)]">
      <Link to={stayLink} className="block h-40 w-full overflow-hidden sm:h-full" aria-label={`View ${property.title || 'stay'}`}>
        <img className="h-full w-full object-cover" src={getBookingImage(booking, index)} alt="" />
      </Link>
      <div className="min-w-0 p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0">
            <h2 className="text-lg font-bold text-navy"><Link to={stayLink} className="hover:text-primary-600">{property.title || 'Property'}</Link></h2>
            <p className="mt-0.5 text-sm text-muted">{property.location || 'Nairobi'}</p>
          </div>
          <Badge color={status.color}>{status.label}</Badge>
        </div>

        <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Check-in</dt><dd className="mt-1 text-sm font-medium text-navy">{formatDate(booking.checkIn)}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Check-out</dt><dd className="mt-1 text-sm font-medium text-navy">{formatDate(booking.checkOut)}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Guests</dt><dd className="mt-1 text-sm font-medium text-navy">{booking.guests || 1}</dd></div>
          <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Total</dt><dd className="mt-1 text-sm font-bold tabular-nums text-navy">{formatCurrency(booking.total)}</dd></div>
        </dl>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button size="sm" type="button" onClick={() => onMessage(booking.id)} disabled={messagePending}>{messagePending ? 'Opening...' : 'Message host'}</Button>
          <Button color="light" size="sm" type="button" onClick={() => generateInvoice(booking)}>Invoice</Button>
          {canAddToCalendar(booking) && isUpcomingStay(booking) && (
            <Button color="light" size="sm" type="button" onClick={() => downloadStayCalendar(booking)}>Add to calendar</Button>
          )}
          <Link className={ROW_LINK} to={stayLink}>View stay</Link>
          <Link className={ROW_LINK} to={`/bookings/${booking.id}`}>Booking details</Link>
        </div>
      </div>
    </div>
  </article>;
}

function EmptyHistory() {
  return <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
    <ClipboardList className="h-8 w-8 text-primary-600" strokeWidth={1.6} aria-hidden="true" />
    <h2 className="text-lg font-bold text-navy">No bookings found</h2>
    <p className="max-w-md text-sm leading-relaxed text-muted">Try another filter, or browse available stays to plan your next trip.</p>
    <Button as={Link} to="/properties">Browse stays</Button>
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
    action={<Button as={Link} to="/trips" color="light">Upcoming trips</Button>}
  >
    <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-white p-1" role="tablist" aria-label="Booking status">
      {FILTERS.map((filter) => <button key={filter.value} className={tabClass(statusFilter === filter.value)} type="button" role="tab" aria-selected={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)}>{filter.label}</button>)}
    </div>

    <p className="mt-3 mb-4 text-sm text-muted">{loading ? 'Loading bookings...' : `${filtered.length} booking${filtered.length === 1 ? '' : 's'}`}</p>

    {loading ? <div className="flex flex-col gap-3" aria-label="Loading booking history"><span className="block h-28 animate-pulse rounded-xl bg-white" /><span className="block h-28 animate-pulse rounded-xl bg-white" /><span className="block h-28 animate-pulse rounded-xl bg-white" /></div> : error ? <Alert color="failure">
      <p>{error}</p>
      <Button color="light" size="sm" type="button" onClick={() => window.location.reload()} className="mt-2">Try again</Button>
    </Alert> : filtered.length === 0 ? <EmptyHistory /> : <div className="flex flex-col gap-3">
      {filtered.map((booking, index) => <HistoryCard key={booking.id} booking={booking} index={index} onMessage={openConversation} messagePending={messageBookingId === booking.id} />)}
    </div>}
  </GuestAccountLayout>;
}

export default BookingHistoryPage;
