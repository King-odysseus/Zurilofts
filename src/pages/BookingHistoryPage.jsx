import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ClipboardList } from 'lucide-react';
import { Button } from 'flowbite-react';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import apiClient from '../api/client.js';
import { firstImage } from '../utils/images.js';
import { zuriImages } from '../assets/images.js';
import { generateInvoice } from '../utils/invoice.js';
import { useTranslated } from '../i18n/useTranslated.js';
import { canAddToCalendar, downloadStayCalendar, isUpcomingStay } from '../utils/stayCalendar.js';

// Booking state reads as a tinted pill: one shape, one tone per status, so the
// guest pages match the admin and host surfaces.
const STATUS_PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold';
const STATUS_TONE_IDLE = 'bg-[#F1F5F9] text-[#475569]';

const STATUS_META = {
  PENDING: { label: 'booking.statusPending', className: 'bg-[#FDF3D8] text-[#8A5A00]' },
  CONFIRMED: { label: 'booking.statusConfirmed', className: 'bg-[#E7F6EE] text-[#157347]' },
  CANCELLED: { label: 'booking.statusCancelled', className: 'bg-[#FDECEC] text-[#B42318]' },
};

const FILTERS = [
  { value: 'all', label: 'booking.allBookings' },
  { value: 'upcoming', label: 'booking.upcoming' },
  { value: 'past', label: 'booking.past' },
  { value: 'cancelled', label: 'booking.cancelled' },
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

// The account-travel rules in styles.css are emitted after Tailwind's utility
// layer and pin their own margins and gaps, so a plain spacing utility loses to
// them. The ! prefix on the spacing utilities below is what makes them apply.
// The card is one column on phones, so its 18px column gap becomes the gap
// between the photo and the copy; max-md raises only that stack to 20px and
// leaves the desktop photo-to-copy gap as it was.
function HistoryCard({ booking, index, onMessage, messagePending }) {
  const { t } = useLanguage();
  const property = booking.property || {};
  // A listing's title and area were typed by the host, so they are translated
  // here rather than by the API. The photo link's aria-label keeps the raw title.
  const propertyTitle = useTranslated(property.title);
  const propertyLocation = useTranslated(property.location);
  const status = STATUS_META[booking.status] || { label: t('booking.statusUnknown'), className: STATUS_TONE_IDLE };

  return <article className="opg-history-card max-md:!gap-5 rounded-xl shadow-md">
    <Link to={`/property/${property.id || booking.propertyId}`} className="opg-history-image" aria-label={`View ${property.title || 'stay'}`}>
      <img src={getBookingImage(booking, index)} alt="" />
    </Link>
    <div className="opg-history-copy">
      <div className="opg-history-title-row">
        <div>
          <h2><Link to={`/property/${property.id || booking.propertyId}`}>{propertyTitle || 'Property'}</Link></h2>
          <p>{propertyLocation || 'Nairobi'}</p>
        </div>
        <span className={`${STATUS_PILL} ${status.className}`}>{t(status.label)}</span>
      </div>

      <dl className="opg-history-meta !mt-6">
        <div><dt>{t('booking.checkIn')}</dt><dd>{formatDate(booking.checkIn)}</dd></div>
        <div><dt>{t('booking.checkOut')}</dt><dd>{formatDate(booking.checkOut)}</dd></div>
        <div><dt>{t('booking.guests')}</dt><dd>{booking.guests || 1}</dd></div>
        <div><dt>{t('booking.total')}</dt><dd>{formatCurrency(booking.total)}</dd></div>
      </dl>

      <div className="opg-history-actions !pt-6">
        <Button size="sm" type="button" onClick={() => onMessage(booking.id)} disabled={messagePending}>{messagePending ? 'Opening...' : 'Message host'}</Button>
        <Button color="light" size="sm" type="button" onClick={() => generateInvoice(booking)}>{t('booking.invoice')}</Button>
        {canAddToCalendar(booking) && isUpcomingStay(booking) && (
          <Button color="light" size="sm" type="button" onClick={() => downloadStayCalendar(booking)}>{t('booking.addToCalendar')}</Button>
        )}
        <Button as={Link} to={`/property/${property.id || booking.propertyId}`} color="light" size="sm">{t('booking.viewStay')}</Button>
        <Button as={Link} to={`/bookings/${booking.id}`} color="light" size="sm">{t('booking.bookingDetails')}</Button>
      </div>
    </div>
  </article>;
}

function EmptyHistory() {
  const { t } = useLanguage();
  return <div className="opg-trip-empty">
    <ClipboardList strokeWidth={1.6} aria-hidden="true" />
    <h2>{t('booking.noBookings')}</h2>
    <p>{t('booking.noBookingsHint')}</p>
    <Button as={Link} to="/properties" size="sm">{t('booking.browseStays')}</Button>
  </div>;
}

function BookingHistoryPage() {
  const { t } = useLanguage();
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
    title={t('booking.yourBookings')}
    description={t('booking.historyDescription')}
    action={<Button as={Link} to="/trips" className="w-fit max-md:mt-3.5" size="sm">{t('booking.myTrips')}</Button>}
  >
    <div className="opg-history-tabs" role="tablist" aria-label={t('booking.bookingStatus')}>
      {FILTERS.map((filter) => <button key={filter.value} type="button" role="tab" aria-selected={statusFilter === filter.value} onClick={() => setStatusFilter(filter.value)}>{t(filter.label)}</button>)}
    </div>

    <p className="opg-history-count">{loading ? t('common.loading') : t(filtered.length === 1 ? 'common.booking_one' : 'common.booking_other', { count: filtered.length })}</p>

    {loading ? <div className="opg-trip-loading" aria-label={t('booking.loadingHistoryLabel')}><span /><span /><span /></div> : error ? <div className="opg-trip-error"><p>{error}</p><Button className="mx-auto w-fit" size="sm" type="button" onClick={() => window.location.reload()}>{t('common.retry')}</Button></div> : filtered.length === 0 ? <EmptyHistory /> : <div className="opg-history-list !mt-6 !gap-6">
      {filtered.map((booking, index) => <HistoryCard key={booking.id} booking={booking} index={index} onMessage={openConversation} messagePending={messageBookingId === booking.id} />)}
    </div>}
  </GuestAccountLayout>;
}

export default BookingHistoryPage;
