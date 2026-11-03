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
import { useLanguage } from '../context/LanguageContext.jsx';
import { canAddToCalendar, downloadStayCalendar, googleCalendarUrl } from '../utils/stayCalendar.js';

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
  const { t } = useLanguage();
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
      setError(t('payment.missingReferenceError'));
      setErrorLabel(t('payment.missingReferenceLabel'));
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

        // Paid, but the dates were taken. The money is real and the stay is not,
        // so this needs its own state: calling it "failed" tells the guest the
        // charge did not happen, and calling it "confirmed" sends them to a stay
        // they do not have.
        if (paymentData.reason === 'conflict') {
          setStatus('conflict');
          setError(data.message || t('payment.conflictBody'));
          return;
        }

        setStatus(PENDING_PROVIDER_STATES.has(providerStatus) ? 'pending' : 'failed');
        setError(data.message || t('payment.verificationIncompleteError'));
        setErrorLabel(providerStatus ? t('payment.providerStatusLabel', { status: providerStatus }) : t('payment.verificationNotCompleted'));
      } catch (err) {
        if (cancelled) return;
        const responseStatus = err.response?.status;
        const providerPending = !err.response || responseStatus >= 500;
        setStatus(providerPending ? 'pending' : 'failed');
        setError(
          err.response?.data?.message
            || err.response?.data?.error
            || t('payment.verifyError'),
        );
        setErrorLabel(providerPending ? t('payment.verificationOngoing') : t('payment.couldNotVerify'));
      }
    }

    verify();
    return () => { cancelled = true; };
  }, [reference, t]);

  const isSaved = saved || (booking?.propertyId ? isFavorite(booking.propertyId) : false);
  const calendarReady = canAddToCalendar(booking);
  const calendarLink = calendarReady ? googleCalendarUrl(booking) : null;

  async function saveBookingProperty() {
    if (!booking?.propertyId || isSaved) return;
    const ok = await toggleFavorite(booking.propertyId);
    if (ok) setSaved(true);
  }

  return (
    <main className="op-payment-result" aria-live="polite">
      <div className="op-payment-result-inner">
        <RouteBackButton className="op-payment-back" label={t('payment.back')} />
        <header className="op-payment-result-heading">
          <p>{t('payment.statusEyebrow')}</p>
          <h1>{t('payment.confirmationTitle')}</h1>
          <span>{t('payment.confirmationBody')}</span>
        </header>

        <Card className={`op-payment-card is-${status}`} aria-busy={status === 'loading'}>
          {status === 'loading' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-loading" aria-hidden="true"><RefreshCw /></div>
              <h2>{t('payment.confirmingTitle')}</h2>
              <p>{t('payment.confirmingBody')}</p>
              <ol className="op-payment-progress" aria-label={t('payment.progressLabel')}>
                <li className="op-payment-step is-complete">
                  <span className="op-payment-step-dot"><Check aria-hidden="true" /></span>
                  <span>{t('payment.stepRequestReceived')}</span>
                </li>
                <li className="op-payment-step is-active">
                  <span className="op-payment-step-dot" />
                  <span>{t('payment.stepCheckingProvider')}</span>
                </li>
                <li className="op-payment-step">
                  <span className="op-payment-step-dot" />
                  <span>{t('payment.stepConfirmingStay')}</span>
                </li>
              </ol>
              <p className="op-payment-note">{t('payment.dontCloseNote')}</p>
              <Button color="light" className="op-payment-secondary op-payment-cancel" onClick={() => navigate('/')}>
                {t('payment.cancel')}
              </Button>
            </div>
          )}

          {status === 'success' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-success" aria-hidden="true"><Check /></div>
              <h2>{t('payment.successTitle')}</h2>
              <p>{t('payment.successBody')}</p>
              <dl className="op-payment-details">
                <div><dt>{t('payment.reference')}</dt><dd>{booking?.paymentReference || reference || '-'}</dd></div>
                <div><dt>{t('payment.checkIn')}</dt><dd>{formatDate(booking?.checkIn)}</dd></div>
                <div><dt>{t('payment.checkOut')}</dt><dd>{formatDate(booking?.checkOut)}</dd></div>
                <div><dt>{t('payment.totalPaid')}</dt><dd>{formatMoney(booking?.total)}</dd></div>
              </dl>
              <div className="op-payment-action-row">
                <Button
                  color="light"
                  className="op-payment-secondary"
                  onClick={saveBookingProperty}
                  disabled={!booking?.propertyId || isSaved}
                >
                  <Heart aria-hidden="true" />
                  {isSaved ? t('payment.saved') : t('payment.save')}
                </Button>
                <Button color="dark" className="op-payment-primary" onClick={() => navigate('/')}>
                  <House aria-hidden="true" />
                  {t('payment.home')}
                </Button>
              </div>
              {calendarReady && (
                <div className="op-payment-calendar">
                  <button type="button" className="op-payment-link" onClick={() => downloadStayCalendar(booking)}>
                    {t('payment.addToCalendar')}
                  </button>
                  {calendarLink && (
                    <a className="op-payment-link" href={calendarLink} target="_blank" rel="noopener noreferrer">
                      {t('payment.googleCalendar')}
                    </a>
                  )}
                </div>
              )}
              {booking?.propertyId && (
                <button type="button" className="op-payment-link" onClick={() => navigate(`/stay/${booking.propertyId}`)}>
                  {t('payment.viewProperty')}
                </button>
              )}
            </div>
          )}

          {status === 'pending' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-pending" aria-hidden="true"><Clock3 /></div>
              <h2>{t('payment.pendingTitle')}</h2>
              <p>{error || t('payment.pendingBody')}</p>
              <span className="op-payment-badge">{t('payment.verificationInProgress')}</span>
              <p className="op-payment-note">{t('payment.pendingNote')}</p>
              <Button color="dark" className="op-payment-primary op-payment-wide" onClick={() => navigate('/trips')}>
                {t('payment.checkTripStatus')}
              </Button>
              <button type="button" className="op-payment-link" onClick={() => navigate('/')}>{t('payment.backToHome')}</button>
            </div>
          )}

          {status === 'conflict' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-pending" aria-hidden="true"><TriangleAlert /></div>
              <h2>{t('payment.conflictTitle')}</h2>
              <p>{t('payment.conflictBody')}</p>
              <div className="op-payment-alert" role="alert">
                <TriangleAlert aria-hidden="true" />
                <div>
                  <strong>{t('payment.conflictTitle')}</strong>
                  <span>{error || t('payment.conflictBody')}</span>
                </div>
              </div>
              <p className="op-payment-note">{t('payment.conflictNote')}</p>
              <Button color="dark" className="op-payment-primary op-payment-wide" onClick={() => navigate('/trips')}>
                {t('payment.checkTripStatus')}
              </Button>
              <button type="button" className="op-payment-link" onClick={() => navigate('/inbox')}>
                {t('payment.contactSupport')}
              </button>
            </div>
          )}

          {status === 'failed' && (
            <div className="op-payment-state">
              <div className="op-payment-icon is-failed" aria-hidden="true"><CircleX /></div>
              <h2>{t('payment.failedTitle')}</h2>
              <p>{t('payment.failedBody')}</p>
              <div className="op-payment-alert" role="alert">
                <TriangleAlert aria-hidden="true" />
                <div>
                  <strong>{errorLabel || t('payment.notCompleted')}</strong>
                  <span>{error || t('payment.reviewPaymentMethod')}</span>
                </div>
              </div>
              <Button
                color="dark"
                className="op-payment-primary op-payment-wide"
                onClick={() => navigate(bookingId ? '/trips' : '/')}
              >
                {t('payment.tryAgain')}
              </Button>
              <button type="button" className="op-payment-link" onClick={() => navigate('/inbox')}>
                {t('payment.contactSupport')}
              </button>
            </div>
          )}
        </Card>
      </div>
    </main>
  );
}

export default PaymentCallback;
