import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ClipboardList, MapPin } from 'lucide-react';
import { Button } from 'flowbite-react';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import { firstImage } from '../utils/images.js';
import { zuriImages } from '../assets/images.js';
import { generateInvoice } from '../utils/invoice.js';
import { useTranslated } from '../i18n/useTranslated.js';
import { canAddToCalendar, downloadStayCalendar, googleCalendarUrl } from '../utils/stayCalendar.js';

/**
 * Booking details for one reservation, addressed by BOOKING id.
 *
 * Checkout is keyed by PROPERTY id (/booking/:propertyId), so a booking id sent
 * there 404s and reads as "this listing is no longer available". Every "view
 * booking / receipt / check-in details" link points here instead.
 *
 * The server scopes GET /bookings/:id to the guest who booked it or the host who
 * owns the listing, so this page serves both sides of the same reservation; a
 * booking the caller has no claim to comes back as a 404.
 */
// Booking state reads as a tinted pill: one shape, one tone per status, so the
// guest pages match the admin and host surfaces.
const STATUS_PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold';
const STATUS_TONE_IDLE = 'bg-[#F1F5F9] text-[#475569]';

const STATUS_META = {
  PENDING: { label: 'Pending payment', className: 'bg-[#FDF3D8] text-[#8A5A00]' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-[#E7F6EE] text-[#157347]' },
  CANCELLED: { label: 'Cancelled', className: 'bg-[#FDECEC] text-[#B42318]' },
  CONFLICT: { label: 'Needs review', className: 'bg-[#FDECEC] text-[#B42318]' },
};

function formatDate(iso) {
  if (!iso) return '-';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return '-';
  const [hour, minute] = value.split(':').map(Number);
  if (Number.isNaN(hour)) return value;
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute || 0).padStart(2, '0')} ${suffix}`;
}

function formatCurrency(value) {
  return value == null ? '-' : `KES ${Number(value).toLocaleString()}`;
}

// The account-travel and detail rules in styles.css are emitted after Tailwind's
// utility layer and pin their own margins and padding, so a plain spacing
// utility loses to them. The ! prefix on the spacing utilities below is what
// makes them apply.
function MoneyRow({ label, value }) {
  return (
    <div className="opg-detail-money-row !py-3">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
}

MoneyRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
};

function BookingDetailPage() {
  const { t } = useLanguage();
  const { bookingId: routeId } = useParams();
  const { pathname } = useLocation();
  // The app switches on pathname instead of declaring <Route>s, so useParams is
  // empty on a direct visit and every request went to /bookings/undefined. Same
  // pathname fallback the other detail pages use.
  const bookingId = routeId || pathname.split('/')[2];
  const { user } = useAuth();
  const navigate = useNavigate();

  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [messagePending, setMessagePending] = useState(false);
  const [paymentPending, setPaymentPending] = useState(false);

  useEffect(() => {
    let cancelled = false;
    // Reset first: the route param can change without remounting this page, and
    // a stale booking would briefly render against the new id.
    setBooking(null);
    setLoading(true);
    setError('');
    setNotFound(false);
    setActionError('');

    apiClient.get(`/bookings/${bookingId}`)
      .then((response) => { if (!cancelled) setBooking(response.data.data); })
      .catch((err) => {
        if (cancelled) return;
        if (err.response?.status === 404) setNotFound(true);
        else setError('Could not load this booking. Please try again.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [bookingId]);

  async function openConversation() {
    try {
      setActionError('');
      setMessagePending(true);
      const response = await apiClient.post('/conversations', { bookingId });
      navigate(`/inbox/${response.data.data.id}`);
    } catch {
      setActionError('Could not open the conversation. Please try again.');
    } finally {
      setMessagePending(false);
    }
  }

  async function resumePayment() {
    try {
      setActionError('');
      setPaymentPending(true);
      const response = await apiClient.post(`/bookings/${bookingId}/payment`, {
        paymentMethod: booking.paymentMethod,
      });
      const url = response.data.data.authorizationUrl;
      if (!url) {
        setActionError('Could not start the payment. Please try again.');
        return;
      }
      window.location.href = url;
    } catch (err) {
      // The server refuses to open payment for an unverified guest; send them to
      // the verification step rather than showing a dead end.
      if (err.response?.data?.error === 'IDENTITY_VERIFICATION_REQUIRED') {
        navigate('/verify-identity');
        return;
      }
      setActionError(err.response?.data?.error || 'Could not start the payment. Please try again.');
    } finally {
      setPaymentPending(false);
    }
  }

  const property = booking?.property || {};
  const status = STATUS_META[booking?.status] || { label: booking?.status || 'Unknown', className: STATUS_TONE_IDLE };
  const isGuestOwner = Boolean(user?.id && booking?.userId && user.id === booking.userId);
  const canResumePayment = isGuestOwner && booking?.status === 'PENDING' && !booking?.paidAt;
  // Hosts get the same two controls: a reservation is just as useful in the
  // calendar of the person preparing the apartment as in the guest's.
  const calendarReady = canAddToCalendar(booking);
  const calendarLink = calendarReady ? googleCalendarUrl(booking) : null;
  // The listing's own words came from the database, so they follow the reader's
  // language like the rest of the page. The photo link's aria-label keeps the raw
  // title: it names a control, it is not page copy.
  const propertyTitle = useTranslated(property.title);
  const propertyLocation = useTranslated(property.location);

  if (loading) {
    return (
      <GuestAccountLayout active="bookings" eyebrow={t('booking.reservation')} title={t('booking.bookingDetails')} description={t('booking.loadingReservation')}>
        <div className="opg-trip-loading" aria-label={t('a11y2.loadingBooking')}><span /><span /><span /></div>
      </GuestAccountLayout>
    );
  }

  if (notFound) {
    return (
      <GuestAccountLayout active="bookings" eyebrow={t('booking.reservation')} title={t('booking.bookingDetails')} description={t('booking.bookingNotFoundHint')}>
        <div className="opg-trip-empty">
          <ClipboardList strokeWidth={1.6} aria-hidden="true" />
          <h2>{t('booking.bookingNotFound')}</h2>
          <p>It may have been removed, or it does not belong to this account.</p>
          <Button as={Link} to="/bookings" size="sm">{t('booking.backToBookings')}</Button>
        </div>
      </GuestAccountLayout>
    );
  }

  if (error || !booking) {
    return (
      <GuestAccountLayout active="bookings" eyebrow={t('booking.reservation')} title={t('booking.bookingDetails')} description={t('common.somethingWentWrong')}>
        <div className="opg-trip-error">
          <p>{error || 'Could not load this booking. Please try again.'}</p>
          <Button className="mx-auto w-fit" size="sm" type="button" onClick={() => window.location.reload()}>Try again</Button>
        </div>
      </GuestAccountLayout>
    );
  }

  const image = firstImage(property) || zuriImages[0];
  const additionalGuests = Array.isArray(booking.additionalGuests) ? booking.additionalGuests : [];

  return (
    <GuestAccountLayout
      active="bookings"
      eyebrow={t('booking.reservation')}
      title={propertyTitle || t('booking.bookingDetails')}
      description={t('booking.bookedOn', { date: formatDate(booking.createdAt) })}
      action={<Button as={Link} to="/bookings" className="w-fit max-md:mt-3.5" size="sm">{t('booking.allBookings')}</Button>}
    >
      <article className="opg-history-card rounded-xl shadow-md">
        <Link to={`/property/${property.id || booking.propertyId}`} className="opg-history-image" aria-label={t('a11y2.viewStay', { name: property.title || t('a11y2.stay') })}>
          <img src={image} alt="" />
        </Link>
        <div className="opg-history-copy">
          <div className="opg-history-title-row">
            <div>
              <h2><Link to={`/property/${property.id || booking.propertyId}`}>{propertyTitle || t('booking.propertyUnavailable')}</Link></h2>
              <p><MapPin size={13} aria-hidden="true" /> {propertyLocation || 'Nairobi'}</p>
            </div>
            <span className={`${STATUS_PILL} ${status.className}`}>{status.label}</span>
          </div>

          <dl className="opg-history-meta !mt-6">
            <div><dt>{t('booking.checkIn')}</dt><dd>{formatDate(booking.checkIn)}</dd></div>
            <div><dt>{t('booking.checkOut')}</dt><dd>{formatDate(booking.checkOut)}</dd></div>
            <div><dt>{t('booking.guests')}</dt><dd>{booking.guests || 1}</dd></div>
            <div><dt>{t('booking.total')}</dt><dd>{formatCurrency(booking.total)}</dd></div>
          </dl>

          <dl className="opg-history-meta !mt-6">
            <div><dt>{t('booking.arrivalTime')}</dt><dd>{formatTime(booking.checkInTime)}</dd></div>
            <div><dt>{t('booking.departureTime')}</dt><dd>{formatTime(booking.checkOutTime)}</dd></div>
            <div><dt>{t('booking.payment')}</dt><dd>{booking.paidAt ? `Paid ${formatDate(booking.paidAt)}` : (booking.paymentMethod || '-')}</dd></div>
            <div><dt>{t('booking.reference')}</dt><dd>{booking.id.slice(-8).toUpperCase()}</dd></div>
          </dl>
        </div>
      </article>

      <section className="opg-detail-panel !mt-6 rounded-xl shadow-md" aria-labelledby="detail-payment">
        <h2 id="detail-payment" className="!mb-5">{t('booking.paymentSummary')}</h2>
        <dl className="opg-detail-money">
          <MoneyRow label={t('booking.accommodation', { bed: booking.bedOption === '2bed' ? '2-bed' : '1-bed' })} value={formatCurrency(booking.subtotal)} />
          {booking.lateCheckoutFee > 0 && <MoneyRow label={t('booking.lateCheckout')} value={formatCurrency(booking.lateCheckoutFee)} />}
          <MoneyRow label={t('booking.cleaningFee')} value={formatCurrency(booking.cleaningFee)} />
          <MoneyRow label={t('booking.serviceFee')} value={formatCurrency(booking.serviceFee)} />
          {booking.addonsSubtotal > 0 && <MoneyRow label={t('booking.addOns')} value={formatCurrency(booking.addonsSubtotal)} />}
          {booking.discountAmount > 0 && (
            <MoneyRow
              label={`Promo${booking.promoCode?.code ? ` (${booking.promoCode.code})` : ''}`}
              value={`- ${formatCurrency(booking.discountAmount)}`}
            />
          )}
          {/* The total sits 32px below the last money row (16px margin plus 16px
              padding above the rule) instead of the previous 22px. */}
          <div className="opg-detail-money-total !mt-4 !pt-4">
            <dt>{t('booking.total')}</dt>
            <dd>{formatCurrency(booking.total)}</dd>
          </div>
        </dl>

        {actionError && <p className="opg-detail-error" role="alert">{actionError}</p>}

        <div className="opg-history-actions">
          {canResumePayment && (
            <Button size="sm" type="button" onClick={resumePayment} disabled={paymentPending}>
              {paymentPending ? t('booking.openingPayment') : t('booking.completePayment')}
            </Button>
          )}
          {!isGuestOwner && <Button size="sm" type="button" onClick={openConversation} disabled={messagePending}>{messagePending ? t('booking.opening') : t('booking.messageGuest')}</Button>}
          {isGuestOwner && <Button size="sm" type="button" onClick={openConversation} disabled={messagePending}>{messagePending ? t('booking.opening') : t('booking.messageHost')}</Button>}
          <Button color="light" size="sm" type="button" onClick={() => generateInvoice(booking)}>{t('booking.invoice')}</Button>
          {calendarReady && (
            <Button color="light" size="sm" type="button" onClick={() => downloadStayCalendar(booking)}>{t('booking.addToCalendar')}</Button>
          )}
          {calendarLink && (
            <Button as="a" href={calendarLink} target="_blank" rel="noopener noreferrer" color="light" size="sm">{t('booking.googleCalendar')}</Button>
          )}
          <Button as={Link} to={`/property/${property.id || booking.propertyId}`} color="light" size="sm">View stay</Button>
          <Button as={Link} to={isGuestOwner ? '/trips' : '/host/today'} color="light" size="sm">{isGuestOwner ? 'My trips' : 'Today'}</Button>
        </div>
      </section>

      {(additionalGuests.length > 0 || booking.specialRequests) && (
        <section className="opg-detail-panel !mt-6 rounded-xl border border-border" aria-labelledby="detail-stay">
          <h2 id="detail-stay" className="!mb-5">Guest details</h2>
          {additionalGuests.length > 0 && (
            <>
              <h3 className="!mb-3">Additional guests</h3>
              <ul className="opg-detail-list">
                {additionalGuests.map((guest, index) => (
                  <li key={`guest-${index}-${guest.lastName || ''}`}>{[guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest'}</li>
                ))}
              </ul>
            </>
          )}
          {booking.specialRequests && (
            <>
              <h3 className="!mb-3">Special requests</h3>
              <p className="opg-detail-note">{booking.specialRequests}</p>
            </>
          )}
        </section>
      )}
    </GuestAccountLayout>
  );
}

export default BookingDetailPage;
