import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button, Card } from 'flowbite-react';
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
import RouteBackButton from '../components/RouteBackButton.jsx';
import { useFavorites } from '../context/FavoritesContext.jsx';

const PENDING_PROVIDER_STATES = new Set(['pending', 'ongoing', 'processing', 'abandoned']);

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

  async function saveBookingProperty() {
    if (!booking?.propertyId || isSaved) return;
    const ok = await toggleFavorite(booking.propertyId);
    if (ok) setSaved(true);
  }

  return (
    <main className="op-payment-result" aria-live="polite">
      <div className="op-payment-result-inner">
        <RouteBackButton className="op-payment-back" label="Back" />
        <header className="op-payment-result-heading">
          <p>PAYMENT STATUS</p>
          <h1>Your stay confirmation</h1>
          <span>We verify every payment securely before confirming a reservation.</span>
        </header>

        <Card className={`op-payment-card is-${status}`} aria-busy={status === 'loading'}>
          {status === 'loading' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-loading" aria-hidden="true"><RefreshCw /></div>
              <h2>Confirming payment</h2>
              <p>This usually takes a few seconds. Keep this page open while we finish.</p>
              <ol className="op-payment-progress" aria-label="Payment verification progress">
                <li className="op-payment-step is-complete">
                  <span className="op-payment-step-dot"><Check aria-hidden="true" /></span>
                  <span>Request received</span>
                </li>
                <li className="op-payment-step is-active">
                  <span className="op-payment-step-dot" />
                  <span>Checking with the payment provider</span>
                </li>
                <li className="op-payment-step">
                  <span className="op-payment-step-dot" />
                  <span>Confirming your stay</span>
                </li>
              </ol>
              <p className="op-payment-note">Don&apos;t close this window while we finish.</p>
              <Button color="light" className="op-payment-secondary op-payment-cancel" onClick={() => navigate('/')}>
                Cancel
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-success" aria-hidden="true"><Check /></div>
              <h2>Payment successful</h2>
              <p>Your stay is confirmed. We&apos;ve also sent the confirmation to your email.</p>
              <dl className="op-payment-details">
                <div><dt>Reference</dt><dd>{booking?.paymentReference || reference || '-'}</dd></div>
                <div><dt>Check-in</dt><dd>{formatDate(booking?.checkIn)}</dd></div>
                <div><dt>Check-out</dt><dd>{formatDate(booking?.checkOut)}</dd></div>
                <div><dt>Total paid</dt><dd>{formatMoney(booking?.total)}</dd></div>
              </dl>
              <div className="op-payment-action-row">
                <Button
                  color="light"
                  className="op-payment-secondary"
                  onClick={saveBookingProperty}
                  disabled={!booking?.propertyId || isSaved}
                >
                  <Heart aria-hidden="true" />
                  {isSaved ? 'Saved' : 'Save'}
                </Button>
                <Button color="dark" className="op-payment-primary" onClick={() => navigate('/')}>
                  <House aria-hidden="true" />
                  Home
                </Button>
              </div>
              {booking?.propertyId && (
                <button type="button" className="op-payment-link" onClick={() => navigate(`/property/${booking.propertyId}`)}>
                  View property
                </button>
              )}
            </div>
          )}

          {status === 'pending' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-pending" aria-hidden="true"><Clock3 /></div>
              <h2>Payment pending</h2>
              <p>{error || 'The payment provider is still confirming this transaction. We are holding your booking while it clears.'}</p>
              <span className="op-payment-badge">Verification in progress</span>
              <p className="op-payment-note">We&apos;ll update your trip as soon as the payment clears.</p>
              <Button color="dark" className="op-payment-primary op-payment-wide" onClick={() => navigate('/trips')}>
                Check trip status
              </Button>
              <button type="button" className="op-payment-link" onClick={() => navigate('/')}>Back to home</button>
            </div>
          )}

          {status === 'failed' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-failed" aria-hidden="true"><CircleX /></div>
              <h2>Payment failed</h2>
              <p>No confirmed booking or charge was recorded for this payment attempt.</p>
              <div className="op-payment-alert" role="alert">
                <TriangleAlert aria-hidden="true" />
                <div>
                  <strong>{errorLabel || 'Payment not completed'}</strong>
                  <span>{error || 'Please review your payment method and try again.'}</span>
                </div>
              </div>
              <Button
                color="dark"
                className="op-payment-primary op-payment-wide"
                onClick={() => navigate(bookingId ? '/trips' : '/')}
              >
                Try again
              </Button>
              <button type="button" className="op-payment-link" onClick={() => navigate('/inbox')}>
                Need help? Contact support
              </button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

export default PaymentCallback;
