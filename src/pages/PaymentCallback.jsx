import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Alert, Badge, Button } from 'flowbite-react';
import {
  Check,
  CircleX,
  Clock3,
  Heart,
  House,
  RefreshCw,
  TriangleAlert,
} from 'lucide-react';
import apiClient from '../api/client';
import { useFavorites } from '../context/FavoritesContext.jsx';
import { canAddToCalendar, downloadStayCalendar, googleCalendarUrl } from '../utils/stayCalendar.js';

const PENDING_PROVIDER_STATES = new Set(['pending', 'ongoing', 'processing', 'abandoned']);

const LINK_CLASS = 'text-sm font-semibold text-primary-700 underline-offset-4 transition-colors hover:text-navy hover:underline';

function formatDate(value) {
  if (!value) return '-';
  return new Date(value).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === '') return '-';
  const amount = Number(value);
  return Number.isFinite(amount) ? `KES ${amount.toLocaleString()}` : '-';
}

function PaymentCallback() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const reference = searchParams.get('reference');
  const [status, setStatus] = useState('loading');
  const [booking, setBooking] = useState(null);
  const [bookingId, setBookingId] = useState(null);
  const [error, setError] = useState('');
  const [errorLabel, setErrorLabel] = useState('');
  const { toggleFavorite, isFavorite } = useFavorites();
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    let cancelled = false;

    if (!reference) {
      setStatus('failed');
      setError('No payment reference was found. Please return to your trip and try again.');
      setErrorLabel('Missing payment reference');
      return () => { cancelled = true; };
    }

    async function verify() {
      try {
        const res = await apiClient.get(`/payments/verify/${reference}`);
        if (cancelled) return;
        const data = res.data;
        const paymentData = data.data || {};
        setBookingId(paymentData.bookingId || null);

        if (paymentData.confirmed) {
          setStatus('success');
          if (paymentData.bookingId) {
            try {
              const bookingRes = await apiClient.get(`/bookings/${paymentData.bookingId}`);
              if (!cancelled) setBooking(bookingRes.data.data);
            } catch {
              // Confirmation stays valid when optional booking details cannot load.
            }
          }
          return;
        }

        const providerStatus = String(paymentData.providerStatus || '').toLowerCase();
        setStatus(PENDING_PROVIDER_STATES.has(providerStatus) ? 'pending' : 'failed');
        setError(data.message || 'Payment verification did not complete. Please review your trip before trying again.');
        setErrorLabel(providerStatus ? `Provider status: ${providerStatus}` : 'Verification not completed');
      } catch (err) {
        if (cancelled) return;
        const responseStatus = err.response?.status;
        const providerPending = !err.response || responseStatus >= 500;
        setStatus(providerPending ? 'pending' : 'failed');
        setError(
          err.response?.data?.message
            || err.response?.data?.error
            || 'Unable to verify the payment right now. If you completed payment, it will be confirmed shortly.',
        );
        setErrorLabel(providerPending ? 'Verification is still in progress' : 'Payment could not be verified');
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [reference]);

  const isSaved = saved || (booking?.propertyId ? isFavorite(booking.propertyId) : false);
  const calendarReady = canAddToCalendar(booking);
  const calendarLink = calendarReady ? googleCalendarUrl(booking) : null;

  async function saveBookingProperty() {
    if (!booking?.propertyId || isSaved) return;
    const ok = await toggleFavorite(booking.propertyId);
    if (ok) setSaved(true);
  }

  return (
    <main className="min-h-screen bg-surface px-4 py-10 sm:px-6 lg:px-8" aria-live="polite">
      <div className="mx-auto w-full max-w-2xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">PAYMENT STATUS</p>
          <h1 className="mt-1 text-2xl font-bold text-navy">Your stay confirmation</h1>
          <span className="mt-1 block text-sm text-muted">We verify every payment securely before confirming a reservation.</span>
        </header>

        <div
          className="rounded-xl border border-border bg-white p-5 text-center shadow-sm sm:p-6"
          aria-busy={status === 'loading'}
        >
          {status === 'loading' && (
            <div className="space-y-4">
              <span
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary"
                aria-hidden="true"
              >
                <RefreshCw className="h-6 w-6 animate-spin" strokeWidth={1.8} />
              </span>
              <h2 className="text-base font-semibold text-navy">Confirming payment</h2>
              <p className="text-sm text-muted">This usually takes a few seconds. Keep this page open while we finish.</p>
              <Badge color="info" className="mx-auto w-fit">Verifying</Badge>

              <ol className="mx-auto max-w-sm space-y-2 text-left text-sm" aria-label="Payment verification progress">
                <li className="flex items-center gap-2 text-charcoal">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary-50 text-primary" aria-hidden="true">
                    <Check className="h-3.5 w-3.5" strokeWidth={2.5} />
                  </span>
                  <span>Request received</span>
                </li>
                <li className="flex items-center gap-2 text-charcoal">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-primary" aria-hidden="true" />
                  <span>Checking with the payment provider</span>
                </li>
                <li className="flex items-center gap-2 text-muted">
                  <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border" aria-hidden="true" />
                  <span>Confirming your stay</span>
                </li>
              </ol>

              <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                Don&apos;t close this window while we finish.
              </p>

              <Button color="light" onClick={() => navigate('/')}>Cancel</Button>
            </div>
          )}

          {status === 'success' && (
            <div className="space-y-4">
              <span
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary"
                aria-hidden="true"
              >
                <Check className="h-6 w-6" strokeWidth={2} />
              </span>
              <h2 className="text-base font-semibold text-navy">Payment successful</h2>
              <p className="text-sm text-muted">Your stay is confirmed. Your booking details are below.</p>
              <Badge color="success" className="mx-auto w-fit">Confirmed</Badge>

              <dl className="space-y-2 rounded-lg border border-border p-4 text-left text-sm">
                <div className="flex items-baseline justify-between gap-3 text-charcoal">
                  <dt>Reference</dt>
                  <dd className="font-medium text-navy tabular-nums">{booking?.paymentReference || reference || '-'}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-charcoal">
                  <dt>Check-in</dt>
                  <dd className="font-medium text-navy tabular-nums">{formatDate(booking?.checkIn)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 text-charcoal">
                  <dt>Check-out</dt>
                  <dd className="font-medium text-navy tabular-nums">{formatDate(booking?.checkOut)}</dd>
                </div>
                <div className="flex items-baseline justify-between gap-3 border-t border-border pt-2 text-charcoal">
                  <dt>Total paid</dt>
                  <dd className="font-bold text-navy tabular-nums">{formatMoney(booking?.total)}</dd>
                </div>
              </dl>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button
                  color="light"
                  onClick={saveBookingProperty}
                  disabled={!booking?.propertyId || isSaved}
                >
                  <Heart className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
                <Button onClick={() => navigate('/')}>
                  <House className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                  Home
                </Button>
              </div>

              {calendarReady && (
                <div className="flex flex-col items-center gap-2 sm:flex-row sm:justify-center">
                  <button type="button" className={LINK_CLASS} onClick={() => downloadStayCalendar(booking)}>
                    Add to calendar
                  </button>
                  {calendarLink && (
                    <a className={LINK_CLASS} href={calendarLink} target="_blank" rel="noopener noreferrer">
                      Google Calendar
                    </a>
                  )}
                </div>
              )}
              {booking?.propertyId && (
                <button type="button" className={LINK_CLASS} onClick={() => navigate(`/property/${booking.propertyId}`)}>
                  View property
                </button>
              )}
            </div>
          )}

          {status === 'pending' && (
            <div className="space-y-4">
              <span
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary-50 text-primary"
                aria-hidden="true"
              >
                <Clock3 className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h2 className="text-base font-semibold text-navy">Payment pending</h2>
              <p className="text-sm text-muted">{error || 'The payment provider is still confirming this transaction. We are holding your booking while it clears.'}</p>
              <Badge color="warning" className="mx-auto w-fit">Verification in progress</Badge>
              <p className="rounded-lg bg-surface px-3 py-2 text-xs text-muted">
                We&apos;ll update your trip as soon as the payment clears.
              </p>
              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button fullSized onClick={() => navigate('/trips')}>Check trip status</Button>
                <Button fullSized color="light" onClick={() => navigate('/')}>Back to home</Button>
              </div>
            </div>
          )}

          {status === 'failed' && (
            <div className="space-y-4">
              <span
                className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-surface text-navy"
                aria-hidden="true"
              >
                <CircleX className="h-6 w-6" strokeWidth={1.8} />
              </span>
              <h2 className="text-base font-semibold text-navy">Payment failed</h2>
              <p className="text-sm text-muted">No confirmed booking or charge was recorded for this payment attempt.</p>
              <Badge color="failure" className="mx-auto w-fit">Failed</Badge>

              <Alert color="failure" role="alert" className="text-left">
                <div className="flex items-start gap-2">
                  <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                  <div>
                    <strong className="block font-semibold">{errorLabel || 'Payment not completed'}</strong>
                    <span className="block text-sm">{error || 'Please review your payment method and try again.'}</span>
                  </div>
                </div>
              </Alert>

              <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                <Button fullSized onClick={() => navigate(bookingId ? '/trips' : '/')}>Try again</Button>
                <Button fullSized color="light" onClick={() => navigate('/inbox')}>Need help? Contact support</Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}

export default PaymentCallback;
