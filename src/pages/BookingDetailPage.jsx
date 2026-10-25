import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Badge, Button } from 'flowbite-react';
import { ClipboardList, MapPin } from 'lucide-react';
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
const STATUS_META = {
  PENDING: { label: 'Pending payment', color: 'warning' },
  CONFIRMED: { label: 'Confirmed', color: 'success' },
  CANCELLED: { label: 'Cancelled', color: 'failure' },
  CONFLICT: { label: 'Needs review', color: 'failure' },
};

const SUBTLE_LINK = 'inline-flex min-h-[36px] items-center text-xs font-semibold text-muted hover:text-navy';

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
    <div className="flex items-center justify-between gap-3 border-b border-border py-2 last:border-0">
      <dt className="text-sm text-muted">{label}</dt>
      <dd className="text-sm font-medium tabular-nums text-navy">{value}</dd>
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
    document.title = 'Booking details | ZuriLofts';
  }, []);

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
  const status = STATUS_META[booking?.status] || { label: booking?.status || 'Unknown', color: 'gray' };
  const isGuestOwner = Boolean(user?.id && booking?.userId && user.id === booking.userId);
  const canResumePayment = isGuestOwner && booking?.status === 'PENDING' && !booking?.paidAt;
  // Hosts get the same two controls: a reservation is just as useful in the
  // calendar of the person preparing the apartment as in the guest's.
  const calendarReady = canAddToCalendar(booking);
  const calendarLink = calendarReady ? googleCalendarUrl(booking) : null;

  if (loading) {
    return (
      <GuestAccountLayout active="bookings" eyebrow="Reservation" title="Booking details" description="Loading your reservation.">
        <div className="flex flex-col gap-3" aria-label="Loading booking"><span className="block h-28 animate-pulse rounded-xl bg-white" /><span className="block h-28 animate-pulse rounded-xl bg-white" /><span className="block h-28 animate-pulse rounded-xl bg-white" /></div>
      </GuestAccountLayout>
    );
  }

  if (notFound) {
    return (
      <GuestAccountLayout active="bookings" eyebrow="Reservation" title="Booking details" description="We could not find that reservation.">
        <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border bg-white px-6 py-14 text-center">
          <ClipboardList className="h-8 w-8 text-primary-600" strokeWidth={1.6} aria-hidden="true" />
          <h2 className="text-lg font-bold text-navy">Booking not found</h2>
          <p className="max-w-md text-sm leading-relaxed text-muted">It may have been removed, or it does not belong to this account.</p>
          <Button as={Link} to="/bookings">Back to bookings</Button>
        </div>
      </GuestAccountLayout>
    );
  }

  if (error || !booking) {
    return (
      <GuestAccountLayout active="bookings" eyebrow="Reservation" title="Booking details" description="Something went wrong.">
        <Alert color="failure" role="alert">
          <p>{error || 'Could not load this booking. Please try again.'}</p>
          <Button color="light" size="sm" type="button" onClick={() => window.location.reload()} className="mt-2">Try again</Button>
        </Alert>
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
      action={<Button as={Link} to="/bookings" color="light">All bookings</Button>}
    >
      <article className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <div className="grid grid-cols-1 sm:grid-cols-[200px_minmax(0,1fr)]">
          <Link to={`/property/${property.id || booking.propertyId}`} className="block h-40 w-full overflow-hidden sm:h-full" aria-label={`View ${property.title || 'stay'}`}>
            <img className="h-full w-full object-cover" src={image} alt="" />
          </Link>
          <div className="min-w-0 p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <h2 className="text-lg font-bold text-navy"><Link to={`/property/${property.id || booking.propertyId}`} className="hover:text-primary-600">{property.title || 'Property'}</Link></h2>
                <p className="mt-0.5 flex items-center gap-1 text-sm text-muted"><MapPin size={13} aria-hidden="true" /> {property.location || 'Nairobi'}</p>
              </div>
              <Badge color={status.color}>{status.label}</Badge>
            </div>

            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Check-in</dt><dd className="mt-1 text-sm font-medium text-navy">{formatDate(booking.checkIn)}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Check-out</dt><dd className="mt-1 text-sm font-medium text-navy">{formatDate(booking.checkOut)}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Guests</dt><dd className="mt-1 text-sm font-medium text-navy">{booking.guests || 1}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Total</dt><dd className="mt-1 text-sm font-bold tabular-nums text-navy">{formatCurrency(booking.total)}</dd></div>
            </dl>

            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Arrival time</dt><dd className="mt-1 text-sm font-medium text-navy">{formatTime(booking.checkInTime)}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Departure time</dt><dd className="mt-1 text-sm font-medium text-navy">{formatTime(booking.checkOutTime)}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Payment</dt><dd className="mt-1 text-sm font-medium text-navy">{booking.paidAt ? `Paid ${formatDate(booking.paidAt)}` : (booking.paymentMethod || '-')}</dd></div>
              <div><dt className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted">Reference</dt><dd className="mt-1 text-sm font-medium text-navy">{booking.id.slice(-8).toUpperCase()}</dd></div>
            </dl>
          </div>
        </div>
      </article>

      <section className="mt-4 rounded-xl border border-border bg-white p-5 shadow-sm" aria-labelledby="detail-payment">
        <h2 id="detail-payment" className="text-base font-bold text-navy">Payment summary</h2>
        <dl className="mt-3">
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
          <div className="flex items-center justify-between gap-3 border-t border-border pt-3">
            <dt className="text-base font-bold text-navy">Total</dt>
            <dd className="text-base font-bold tabular-nums text-navy">{formatCurrency(booking.total)}</dd>
          </div>
        </dl>

        {actionError && <Alert color="failure" role="alert" className="mt-3">{actionError}</Alert>}

        <div className="mt-4 flex flex-wrap items-center gap-2">
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
            <a className={SUBTLE_LINK} href={calendarLink} target="_blank" rel="noopener noreferrer">Google Calendar</a>
          )}
          <Link className={SUBTLE_LINK} to={`/property/${property.id || booking.propertyId}`}>View stay</Link>
          <Link className={SUBTLE_LINK} to={isGuestOwner ? '/trips' : '/host/today'}>{isGuestOwner ? 'My trips' : 'Today'}</Link>
        </div>
      </section>

      {(additionalGuests.length > 0 || booking.specialRequests) && (
        <section className="mt-4 rounded-xl border border-border bg-white p-5 shadow-sm" aria-labelledby="detail-stay">
          <h2 id="detail-stay" className="text-base font-bold text-navy">Guest details</h2>
          {additionalGuests.length > 0 && (
            <>
              <h3 className="mt-3 text-sm font-semibold text-navy">Additional guests</h3>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-navy">
                {additionalGuests.map((guest, index) => (
                  <li key={`guest-${index}-${guest.lastName || ''}`}>{[guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest'}</li>
                ))}
              </ul>
            </>
          )}
          {booking.specialRequests && (
            <>
              <h3 className="mt-3 text-sm font-semibold text-navy">Special requests</h3>
              <p className="mt-2 text-sm leading-relaxed text-navy">{booking.specialRequests}</p>
            </>
          )}
        </section>
      )}
    </GuestAccountLayout>
  );
}

export default BookingDetailPage;
