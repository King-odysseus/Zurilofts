import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { ClipboardList, MapPin } from 'lucide-react';
import { Button } from 'flowbite-react';
import GuestAccountLayout from '../components/GuestAccountLayout.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { firstImage } from '../utils/images.js';
import { zuriImages } from '../assets/images.js';
import { generateInvoice } from '../utils/invoice.js';
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

function MoneyRow({ label, value }) {
  return (
    <div className="opg-detail-money-row">
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

  if (loading) {
    return (
      <GuestAccountLayout active="bookings" eyebrow="Reservation" title="Booking details" description="Loading your reservation.">
        <div className="opg-trip-loading" aria-label="Loading booking"><span /><span /><span /></div>
      </GuestAccountLayout>
    );
  }

  if (notFound) {
    return (
      <GuestAccountLayout active="bookings" eyebrow="Reservation" title="Booking details" description="We could not find that reservation.">
        <div className="opg-trip-empty">
          <ClipboardList strokeWidth={1.6} aria-hidden="true" />
          <h2>Booking not found</h2>
          <p>It may have been removed, or it does not belong to this account.</p>
          <Button as={Link} to="/bookings" size="sm">Back to bookings</Button>
        </div>
      </GuestAccountLayout>
    );
  }

  if (error || !booking) {
    return (
      <GuestAccountLayout active="bookings" eyebrow="Reservation" title="Booking details" description="Something went wrong.">
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
      eyebrow="Reservation"
      title={property.title || 'Booking details'}
      description={`Booked ${formatDate(booking.createdAt)}`}
      action={<Button as={Link} to="/bookings" className="w-fit max-md:mt-3.5" size="sm">All bookings</Button>}
    >
      <article className="opg-history-card rounded-xl border border-border">
        <Link to={`/property/${property.id || booking.propertyId}`} className="opg-history-image" aria-label={`View ${property.title || 'stay'}`}>
          <img src={image} alt="" />
        </Link>
        <div className="opg-history-copy">
          <div className="opg-history-title-row">
            <div>
              <h2><Link to={`/property/${property.id || booking.propertyId}`}>{property.title || 'Property'}</Link></h2>
              <p><MapPin size={13} aria-hidden="true" /> {property.location || 'Nairobi'}</p>
            </div>
            <span className={`${STATUS_PILL} ${status.className}`}>{status.label}</span>
          </div>

          <dl className="opg-history-meta">
            <div><dt>Check-in</dt><dd>{formatDate(booking.checkIn)}</dd></div>
            <div><dt>Check-out</dt><dd>{formatDate(booking.checkOut)}</dd></div>
            <div><dt>Guests</dt><dd>{booking.guests || 1}</dd></div>
            <div><dt>Total</dt><dd>{formatCurrency(booking.total)}</dd></div>
          </dl>

          <dl className="opg-history-meta">
            <div><dt>Arrival time</dt><dd>{formatTime(booking.checkInTime)}</dd></div>
            <div><dt>Departure time</dt><dd>{formatTime(booking.checkOutTime)}</dd></div>
            <div><dt>Payment</dt><dd>{booking.paidAt ? `Paid ${formatDate(booking.paidAt)}` : (booking.paymentMethod || '-')}</dd></div>
            <div><dt>Reference</dt><dd>{booking.id.slice(-8).toUpperCase()}</dd></div>
          </dl>
        </div>
      </article>

      <section className="opg-detail-panel rounded-xl border border-border" aria-labelledby="detail-payment">
        <h2 id="detail-payment">Payment summary</h2>
        <dl className="opg-detail-money">
          <MoneyRow label={`Accommodation (${booking.bedOption === '2bed' ? '2-bed' : '1-bed'})`} value={formatCurrency(booking.subtotal)} />
          {booking.lateCheckoutFee > 0 && <MoneyRow label="Late check-out" value={formatCurrency(booking.lateCheckoutFee)} />}
          <MoneyRow label="Cleaning fee" value={formatCurrency(booking.cleaningFee)} />
          <MoneyRow label="Service fee" value={formatCurrency(booking.serviceFee)} />
          {booking.addonsSubtotal > 0 && <MoneyRow label="Add-ons" value={formatCurrency(booking.addonsSubtotal)} />}
          {booking.discountAmount > 0 && (
            <MoneyRow
              label={`Promo${booking.promoCode?.code ? ` (${booking.promoCode.code})` : ''}`}
              value={`- ${formatCurrency(booking.discountAmount)}`}
            />
          )}
          <div className="opg-detail-money-total">
            <dt>Total</dt>
            <dd>{formatCurrency(booking.total)}</dd>
          </div>
        </dl>

        {actionError && <p className="opg-detail-error" role="alert">{actionError}</p>}

        <div className="opg-history-actions">
          {canResumePayment && (
            <Button size="sm" type="button" onClick={resumePayment} disabled={paymentPending}>
              {paymentPending ? 'Opening payment...' : 'Complete payment'}
            </Button>
          )}
          {!isGuestOwner && <Button size="sm" type="button" onClick={openConversation} disabled={messagePending}>{messagePending ? 'Opening...' : 'Message guest'}</Button>}
          {isGuestOwner && <Button size="sm" type="button" onClick={openConversation} disabled={messagePending}>{messagePending ? 'Opening...' : 'Message host'}</Button>}
          <Button color="light" size="sm" type="button" onClick={() => generateInvoice(booking)}>Invoice</Button>
          {calendarReady && (
            <Button color="light" size="sm" type="button" onClick={() => downloadStayCalendar(booking)}>Add to calendar</Button>
          )}
          {calendarLink && (
            <Button as="a" href={calendarLink} target="_blank" rel="noopener noreferrer" color="light" size="sm">Google Calendar</Button>
          )}
          <Button as={Link} to={`/property/${property.id || booking.propertyId}`} color="light" size="sm">View stay</Button>
          <Button as={Link} to={isGuestOwner ? '/trips' : '/host/today'} color="light" size="sm">{isGuestOwner ? 'My trips' : 'Today'}</Button>
        </div>
      </section>

      {(additionalGuests.length > 0 || booking.specialRequests) && (
        <section className="opg-detail-panel rounded-xl border border-border" aria-labelledby="detail-stay">
          <h2 id="detail-stay">Guest details</h2>
          {additionalGuests.length > 0 && (
            <>
              <h3>Additional guests</h3>
              <ul className="opg-detail-list">
                {additionalGuests.map((guest, index) => (
                  <li key={`guest-${index}-${guest.lastName || ''}`}>{[guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest'}</li>
                ))}
              </ul>
            </>
          )}
          {booking.specialRequests && (
            <>
              <h3>Special requests</h3>
              <p className="opg-detail-note">{booking.specialRequests}</p>
            </>
          )}
        </section>
      )}
    </GuestAccountLayout>
  );
}

export default BookingDetailPage;
