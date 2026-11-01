import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Badge, Button } from 'flowbite-react';
import {
  CalendarDays,
  ChevronLeft,
  Clock3,
  Mail,
  MapPin,
  MessageCircleMore,
  Users,
  Wallet,
} from 'lucide-react';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { firstImage } from '../utils/images.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';

// The host's own view of one reservation. The guest side of the same row lives
// at /bookings/:id inside the traveller shell; a host who clicked through from
// Today, Calendar or Messages used to land there by mistake, which is why this
// page exists. Same booking, host framing: who is arriving, what they asked for,
// and what the host actually earns.

const DAY_MS = 86_400_000;

// Status reads through the shared Badge, so the colours come from the theme
// rather than a set of hex fills copied onto this page. The label is a
// dictionary key: the words below the badge are translated where they render.
const STATUS_META = {
  PENDING: { label: 'hostpreview.statusAwaitingPayment', color: 'warning' },
  CONFIRMED: { label: 'hostpreview.statusConfirmed', color: 'success' },
  CANCELLED: { label: 'hostpreview.statusCancelled', color: 'failure' },
  CONFLICT: { label: 'hostpreview.statusNeedsReview', color: 'failure' },
};

function money(value) {
  if (value == null) return '-';
  return `KES ${Number(value).toLocaleString()}`;
}

function formatDate(iso) {
  if (!iso) return '-';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(':').map(Number);
  if (Number.isNaN(hour)) return String(value);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute || 0).padStart(2, '0')} ${suffix}`;
}

function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const nights = Math.round((end - start) / DAY_MS);
  return nights > 0 ? nights : 0;
}

// A count and its noun are two dictionary entries, never a suffix glued on by
// the page: Swahili does not pluralise the way English does, so the sentence has
// to be assembled from whole strings.
function countLabel(t, count, singularKey, pluralKey) {
  return t(count === 1 ? singularKey : pluralKey, { count });
}

function StatusPill({ status }) {
  const { t } = useLanguage();
  const meta = STATUS_META[status];
  // An unknown status is data from the server, so it is shown as it arrives;
  // only the empty case needs words of its own.
  if (!meta) return <Badge color="gray">{status || t('hostpreview.statusUnavailable')}</Badge>;
  return <Badge color={meta.color}>{t(meta.label)}</Badge>;
}

StatusPill.propTypes = { status: PropTypes.string };

// A key/value row. Two columns with the label clamped to the free space and the
// figure kept unwrapped on the right, so every money card on the page lines its
// figures up in the same column no matter how long the label runs.
function MoneyRow({ label, value, tone, hint }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 py-3">
    <div className="min-w-0">
      <p className={`text-xs ${tone === 'total' ? 'font-semibold text-navy' : 'text-muted'}`}>{label}</p>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
    <strong className={`shrink-0 whitespace-nowrap text-right tabular-nums ${tone === 'total' ? 'text-base font-bold text-navy' : 'text-xs text-navy'}`}>{value}</strong>
  </div>;
}

MoneyRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  tone: PropTypes.string,
  hint: PropTypes.string,
};

function DetailRow({ icon: Icon, label, children }) {
  return <div className="flex items-start gap-2.5">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.7} aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      <div className="text-sm text-navy">{children}</div>
    </div>
  </div>;
}

DetailRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// Placeholder cards, not bare bars: the loading shapes have to match the cards
// that land, otherwise the page jumps when the request resolves.
function Skeleton() {
  const { t } = useLanguage();
  return <div className="flex flex-col gap-4" role="status" aria-label={t('hostpreview.loadingReservation')}>
    <HostCard>
      <span className="block h-40 animate-pulse rounded-xl bg-inset" />
    </HostCard>
    <HostCard>
      <span className="block h-28 animate-pulse rounded-xl bg-inset" />
    </HostCard>
  </div>;
}

export default function HostReservationDetailPage() {
  const { t } = useLanguage();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messagePending, setMessagePending] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/bookings/${routeId}`);
      setBooking(response.data.data);
    } catch (loadError) {
      setError(loadError.response?.status === 404
        ? t('hostpreview.reservationNotFound')
        : t('hostpreview.loadReservationFailed'));
    } finally {
      setLoading(false);
    }
  }, [routeId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function openConversation() {
    if (!booking) return;
    setMessagePending(true);
    try {
      const response = await apiClient.post('/conversations', { bookingId: booking.id });
      navigate(`/host/inbox/${response.data.data.id}`);
    } catch {
      setError(t('hostpreview.openConversationFailed'));
    } finally {
      setMessagePending(false);
    }
  }

  if (loading) return <Skeleton />;

  if (error && !booking) {
    return <HostCard>
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-6 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-muted">
          <CalendarDays className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <h1 className="mt-1 text-base font-semibold text-navy">{t('hostpreview.reservationUnavailable')}</h1>
        <p className="text-sm leading-relaxed text-muted">{error}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" onClick={load} className="min-h-11 sm:min-h-0">{t('hostpreview.tryAgain')}</Button>
          <Button as={Link} to="/host/reservations" color="light" size="sm" className="min-h-11 sm:min-h-0">
            {t('hostpreview.allReservations')}
          </Button>
        </div>
      </div>
    </HostCard>;
  }

  if (!booking) return null;

  const property = booking.property || {};
  const guest = booking.user || {};
  const image = firstImage(property);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || t('hostpreview.guest');
  const addOnTotal = booking.addonsSubtotal ?? (booking.addOns || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const additionalGuests = booking.additionalGuests || [];

  return <div className="flex flex-col gap-5 sm:gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/host/reservations" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-navy">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        {t('hostpreview.allReservations')}
      </Link>
      <StatusPill status={booking.status} />
    </div>

    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button size="sm" color="light" onClick={load} className="min-h-11 sm:min-h-0">{t('hostpreview.tryAgain')}</Button>
      </div>
    </Alert>}

    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className={HOST_EYEBROW}>{t('hostpreview.reservationEyebrow')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{guestName}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {property.title || t('hostpreview.yourListing')} <span aria-hidden="true" className="text-border">|</span> {countLabel(t, booking.guests || 1, 'hostpreview.guestOne', 'hostpreview.guestOther')} <span aria-hidden="true" className="text-border">|</span> {countLabel(t, nights, 'hostpreview.nightOne', 'hostpreview.nightOther')}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="sm" onClick={openConversation} disabled={messagePending} className="min-h-11 sm:min-h-0">
          <MessageCircleMore className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {messagePending ? t('hostpreview.opening') : t('hostpreview.messageGuest')}
        </Button>
        {property.id && <Button as={Link} to={`/host/calendar/${property.id}`} color="light" size="sm" className="min-h-11 sm:min-h-0">{t('hostpreview.calendar')}</Button>}
      </div>
    </header>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="flex flex-col gap-5 lg:gap-6">
        {/* flush: the special-request hairline runs to the card edge, so the
            body and that strip re-apply the same 16px gutter as the card head. */}
        <HostCard flush title={t('hostpreview.stay')} className="overflow-hidden">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row">
            <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-surface sm:h-24 sm:w-32">
              {image
                ? <img src={image} alt="" className="h-full w-full object-cover" />
                : <span className="grid h-full w-full place-items-center text-muted"><CalendarDays className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></span>}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <DetailRow icon={CalendarDays} label={t('hostpreview.stay')}>
                {formatDate(booking.checkIn)} <span className="text-muted">{t('hostpreview.to')}</span> {formatDate(booking.checkOut)}
              </DetailRow>
              <DetailRow icon={Clock3} label={t('hostpreview.arrivalAndDeparture')}>
                {t('hostpreview.checkIn')} {formatTime(booking.checkInTime) || t('hostpreview.timeFlexible')} <span aria-hidden="true" className="text-border">|</span> {t('hostpreview.checkOut')} {formatTime(booking.checkOutTime) || t('hostpreview.byCheckoutTime')}
              </DetailRow>
              <DetailRow icon={MapPin} label={t('hostpreview.listing')}>
                {property.title || t('hostpreview.yourListing')}{property.location ? `, ${property.location}` : ''}
              </DetailRow>
            </div>
          </div>

          {booking.specialRequests && <div className="border-t border-border px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('hostpreview.whatGuestAskedFor')}</p>
            <p className="mt-2 text-sm leading-relaxed text-navy">{booking.specialRequests}</p>
          </div>}
        </HostCard>

        <HostCard title={t('hostpreview.whoIsArriving')}>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-xs font-bold text-white">
              {guest.avatar ? <img src={guest.avatar} alt="" className="h-full w-full object-cover" /> : (guestName[0] || 'G').toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{guestName}</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                <Users className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                {countLabel(t, booking.guests || 1, 'hostpreview.guestOne', 'hostpreview.guestOther')}
              </p>
            </div>
          </div>

          {guest.email && <p className="flex items-center gap-2 text-xs text-muted">
            <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <a href={`mailto:${guest.email}`} className="min-w-0 truncate underline underline-offset-2 hover:text-navy">{guest.email}</a>
          </p>}

          {/* Inset rather than outlined: a border here would be a box inside the
              card's own border. */}
          {additionalGuests.length > 0 && <div className="rounded-xl bg-surface px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('hostpreview.alsoStaying')}</p>
            <ul className="mt-2 space-y-1.5">
              {additionalGuests.map((person, index) => <li key={`${person.firstName}-${person.lastName}-${index}`} className="text-sm text-navy">
                {[person.firstName, person.lastName].filter(Boolean).join(' ') || t('hostpreview.guest')}
              </li>)}
            </ul>
          </div>}
        </HostCard>
      </div>

      <div className="flex flex-col gap-5 lg:gap-6">
        <HostCard title={<span className="flex items-center gap-2">
          <Wallet className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
          {t('hostpreview.whatYouEarn')}
        </span>}>
          <div className="divide-y divide-border">
            {booking.hostNetAmount != null
              ? <>
                <MoneyRow label={t('hostpreview.yourEarnings')} value={money(booking.hostNetAmount)} tone="total" />
                {booking.hostCommission != null && <MoneyRow label={t('hostpreview.platformCommission')} value={`- ${money(booking.hostCommission)}`} hint={t('hostpreview.platformCommissionHint')} />}
                {booking.withholdingTax != null && <MoneyRow label={t('hostpreview.withholdingTax')} value={`- ${money(booking.withholdingTax)}`} hint={t('hostpreview.withholdingTaxHint')} />}
                {booking.hostPayableAt && <MoneyRow label={t('hostpreview.releasesToBalance')} value={formatDate(booking.hostPayableAt)} />}
                {booking.hostFundsReleasedAt && <MoneyRow label={t('hostpreview.released')} value={formatDate(booking.hostFundsReleasedAt)} />}
              </>
              : <p className="py-4 text-xs leading-relaxed text-muted">
                {t('hostpreview.earningsPending')}
              </p>}
          </div>
        </HostCard>

        <HostCard title={t('hostpreview.whatGuestPaid')}>
          <div className="divide-y divide-border">
            <MoneyRow label={countLabel(t, nights, 'hostpreview.nightsAtRateOne', 'hostpreview.nightsAtRateOther')} value={money(booking.subtotal)} />
            {booking.cleaningFee > 0 && <MoneyRow label={t('hostpreview.cleaningFee')} value={money(booking.cleaningFee)} />}
            {booking.serviceFee > 0 && <MoneyRow label={t('hostpreview.guestServiceFee')} value={money(booking.serviceFee)} />}
            {booking.lateCheckoutFee > 0 && <MoneyRow label={t('hostpreview.lateCheckOut')} value={money(booking.lateCheckoutFee)} />}
            {(booking.discountAmount || 0) > 0 && <MoneyRow label={`${t('hostpreview.discount')}${booking.promoCode?.code ? ` (${booking.promoCode.code})` : ''}`} value={`- ${money(booking.discountAmount)}`} />}
            {addOnTotal > 0 && <MoneyRow label={t('hostpreview.addOns')} value={money(addOnTotal)} />}
            <MoneyRow label={t('hostpreview.guestTotal')} value={money(booking.total)} tone="total" />
          </div>
          {booking.paymentMethod && <p className="text-[11px] text-muted">
            {t('hostpreview.paidBy', { method: booking.paymentMethod === 'mpesa' ? 'M-PESA' : booking.paymentMethod })}
            {booking.paidAt ? ` ${t('hostpreview.paidOn', { date: formatDate(booking.paidAt) })}` : ''}
          </p>}
        </HostCard>

        {(booking.addOns || []).length > 0 && <HostCard title={t('hostpreview.addOnsBooked')}>
          <ul className="space-y-2">
            {booking.addOns.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-navy">{item.addOn?.name || t('hostpreview.addOn')} <span className="text-muted">x{item.quantity}</span></span>
              <span className="shrink-0 tabular-nums text-muted">{money(item.quantity * item.unitPrice)}</span>
            </li>)}
          </ul>
        </HostCard>}
      </div>
    </div>
  </div>;
}
