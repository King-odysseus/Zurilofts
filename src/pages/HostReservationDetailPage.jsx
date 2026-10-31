import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Button } from 'flowbite-react';
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
import { firstImage } from '../utils/images.js';

// The host's own view of one reservation. The guest side of the same row lives
// at /bookings/:id inside the traveller shell; a host who clicked through from
// Today, Calendar or Messages used to land there by mistake, which is why this
// page exists. Same booking, host framing: who is arriving, what they asked for,
// and what the host actually earns.

const CARD = 'rounded-xl border border-border bg-elevated shadow-sm';
const PANEL_HEAD = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';
const DAY_MS = 86_400_000;

const STATUS_META = {
  PENDING: { label: 'Awaiting payment', className: 'bg-[#FDF3D8] text-[#8A5A00]' },
  CONFIRMED: { label: 'Confirmed', className: 'bg-[#E7F6EE] text-[#157347]' },
  CANCELLED: { label: 'Cancelled', className: 'bg-[#FDECEC] text-[#B42318]' },
  CONFLICT: { label: 'Needs review', className: 'bg-[#FDECEC] text-[#B42318]' },
};

const STATUS_PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold';

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

function plural(count, word) {
  return `${count} ${word}${count === 1 ? '' : 's'}`;
}

function StatusPill({ status }) {
  const meta = STATUS_META[status] || { label: status || 'Status unavailable', className: 'bg-[#F1F5F9] text-[#475569]' };
  return <span className={`${STATUS_PILL} ${meta.className}`}>{meta.label}</span>;
}

StatusPill.propTypes = { status: PropTypes.string };

function MoneyRow({ label, value, tone, hint }) {
  return <div className="flex items-start justify-between gap-4 py-2">
    <div className="min-w-0">
      <p className={`text-xs ${tone === 'total' ? 'font-semibold text-navy' : 'text-muted'}`}>{label}</p>
      {hint && <p className="text-[10px] text-muted">{hint}</p>}
    </div>
    <strong className={`shrink-0 text-xs tabular-nums ${tone === 'total' ? 'text-base font-bold text-navy' : 'text-navy'}`}>{value}</strong>
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

function Skeleton() {
  return <div className="space-y-3" aria-label="Loading reservation">
    <span className="block h-40 animate-pulse rounded-xl bg-surface" />
    <span className="block h-28 animate-pulse rounded-xl bg-surface" />
  </div>;
}

export default function HostReservationDetailPage() {
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
        ? 'This reservation was not found, or it is not on one of your listings.'
        : 'Could not load this reservation. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [routeId]);

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
      setError('Could not open the conversation with this guest. Please try again.');
    } finally {
      setMessagePending(false);
    }
  }

  if (loading) return <div className="space-y-4"><Skeleton /></div>;

  if (error && !booking) {
    return <div className={`${CARD} px-5 py-12 text-center`}>
      <p className="text-sm text-muted">{error}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Button type="button" size="sm" onClick={load}>Try again</Button>
        <Button as={Link} to="/host/reservations" color="light" size="sm">All reservations</Button>
      </div>
    </div>;
  }

  if (!booking) return null;

  const property = booking.property || {};
  const guest = booking.user || {};
  const image = firstImage(property);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || 'Guest';
  const addOnTotal = booking.addonsSubtotal ?? (booking.addOns || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const additionalGuests = booking.additionalGuests || [];

  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/host/reservations" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-navy">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        All reservations
      </Link>
      <StatusPill status={booking.status} />
    </div>

    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button size="xs" color="light" onClick={load}>Try again</Button>
      </div>
    </Alert>}

    <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className={PANEL_HEAD}>RESERVATION</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{guestName}</h1>
        <p className="mt-1 text-sm text-muted">
          {property.title || 'Your listing'} <span aria-hidden="true">·</span> {plural(booking.guests || 1, 'guest')} <span aria-hidden="true">·</span> {plural(nights, 'night')}
        </p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="button" size="sm" onClick={openConversation} disabled={messagePending}>
          <MessageCircleMore className="mr-1.5 h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {messagePending ? 'Opening...' : 'Message guest'}
        </Button>
        {property.id && <Button as={Link} to={`/host/calendar/${property.id}`} color="light" size="sm">Calendar</Button>}
      </div>
    </header>

    <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="space-y-4">
        <section className={`${CARD} overflow-hidden`} aria-label="Stay">
          <div className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-surface sm:h-24 sm:w-32">
              {image
                ? <img src={image} alt="" className="h-full w-full object-cover" />
                : <span className="grid h-full w-full place-items-center text-muted"><CalendarDays className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></span>}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <DetailRow icon={CalendarDays} label="Stay">
                {formatDate(booking.checkIn)} <span className="text-muted">to</span> {formatDate(booking.checkOut)}
              </DetailRow>
              <DetailRow icon={Clock3} label="Arrival and departure">
                Check-in {formatTime(booking.checkInTime) || 'flexible'} <span aria-hidden="true">·</span> check-out {formatTime(booking.checkOutTime) || 'by 10:00 AM'}
              </DetailRow>
              <DetailRow icon={MapPin} label="Listing">
                {property.title || 'Your listing'}{property.location ? `, ${property.location}` : ''}
              </DetailRow>
            </div>
          </div>

          {booking.specialRequests && <div className="border-t border-border px-4 py-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">What the guest asked for</p>
            <p className="mt-1 text-sm leading-relaxed text-navy">{booking.specialRequests}</p>
          </div>}
        </section>

        <section className={`${CARD} p-4`} aria-label="Who is arriving">
          <h2 className="text-sm font-semibold text-navy">Who is arriving</h2>
          <div className="mt-3 flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-xs font-bold text-white">
              {guest.avatar ? <img src={guest.avatar} alt="" className="h-full w-full object-cover" /> : (guestName[0] || 'G').toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{guestName}</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                <Users className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                {plural(booking.guests || 1, 'guest')}
              </p>
            </div>
          </div>

          {guest.email && <p className="mt-3 flex items-center gap-2 text-xs text-muted">
            <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <a href={`mailto:${guest.email}`} className="truncate underline underline-offset-2 hover:text-navy">{guest.email}</a>
          </p>}

          {additionalGuests.length > 0 && <div className="mt-3 rounded-lg border border-border p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">Also staying</p>
            <ul className="mt-1 space-y-0.5">
              {additionalGuests.map((person, index) => <li key={`${person.firstName}-${person.lastName}-${index}`} className="text-sm text-navy">
                {[person.firstName, person.lastName].filter(Boolean).join(' ') || 'Guest'}
              </li>)}
            </ul>
          </div>}
        </section>
      </div>

      <div className="space-y-4">
        <section className={`${CARD} p-4`} aria-label="What you earn">
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Wallet className="h-4 w-4 text-muted" strokeWidth={1.8} aria-hidden="true" />
            What you earn
          </h2>
          <div className="mt-2 divide-y divide-border">
            {booking.hostNetAmount != null
              ? <>
                <MoneyRow label="Your earnings from this stay" value={money(booking.hostNetAmount)} tone="total" />
                {booking.hostCommission != null && <MoneyRow label="Platform commission" value={`- ${money(booking.hostCommission)}`} hint="Taken from the host share, per your commission rate" />}
                {booking.withholdingTax != null && <MoneyRow label="Withholding tax" value={`- ${money(booking.withholdingTax)}`} hint="Remitted to KRA on your behalf" />}
                {booking.hostPayableAt && <MoneyRow label="Releases to your balance" value={formatDate(booking.hostPayableAt)} />}
                {booking.hostFundsReleasedAt && <MoneyRow label="Released" value={formatDate(booking.hostFundsReleasedAt)} />}
              </>
              : <p className="py-3 text-xs leading-relaxed text-muted">
                Earnings appear here once the guest&apos;s payment clears. Nothing is deducted from a booking that has not been paid.
              </p>}
          </div>
        </section>

        <section className={`${CARD} p-4`} aria-label="What the guest paid">
          <h2 className="text-sm font-semibold text-navy">What the guest paid</h2>
          <div className="mt-2 divide-y divide-border">
            <MoneyRow label={`${plural(nights, 'night')} at the nightly rate`} value={money(booking.subtotal)} />
            {booking.cleaningFee > 0 && <MoneyRow label="Cleaning fee" value={money(booking.cleaningFee)} />}
            {booking.serviceFee > 0 && <MoneyRow label="Guest service fee" value={money(booking.serviceFee)} />}
            {booking.lateCheckoutFee > 0 && <MoneyRow label="Late check-out" value={money(booking.lateCheckoutFee)} />}
            {(booking.discountAmount || 0) > 0 && <MoneyRow label={`Discount${booking.promoCode?.code ? ` (${booking.promoCode.code})` : ''}`} value={`- ${money(booking.discountAmount)}`} />}
            {addOnTotal > 0 && <MoneyRow label="Add-ons" value={money(addOnTotal)} />}
            <MoneyRow label="Guest total" value={money(booking.total)} tone="total" />
          </div>
          {booking.paymentMethod && <p className="mt-2 text-[11px] text-muted">
            Paid by {booking.paymentMethod === 'mpesa' ? 'M-PESA' : booking.paymentMethod}
            {booking.paidAt ? ` on ${formatDate(booking.paidAt)}` : ''}
          </p>}
        </section>

        {(booking.addOns || []).length > 0 && <section className={`${CARD} p-4`} aria-label="Add-ons booked">
          <h2 className="text-sm font-semibold text-navy">Add-ons booked</h2>
          <ul className="mt-2 space-y-1.5">
            {booking.addOns.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-navy">{item.addOn?.name || 'Add-on'} <span className="text-muted">x{item.quantity}</span></span>
              <span className="shrink-0 tabular-nums text-muted">{money(item.quantity * item.unitPrice)}</span>
            </li>)}
          </ul>
        </section>}
      </div>
    </div>
  </div>;
}
