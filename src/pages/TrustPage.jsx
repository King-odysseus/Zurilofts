import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, Spinner } from 'flowbite-react';
import { AlertTriangle, BadgeCheck, Clock3, LifeBuoy, LogOut, ShieldCheck, WalletCards } from 'lucide-react';
import DisputePanel from '../components/DisputePanel.jsx';
import IdentityVerificationPanel from '../components/IdentityVerificationPanel.jsx';
import RouteBackButton from '../components/RouteBackButton.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

const RECOVERY_CARDS = [
  {
    key: 'checking',
    title: 'Checking payment',
    copy: 'We are confirming your payment securely. Keep this page open.',
    icon: Clock3,
    tone: 'info',
  },
  {
    key: 'pending',
    title: 'Payment pending',
    copy: 'Your provider is still processing the payment. You will not be charged again.',
    icon: LifeBuoy,
    tone: 'warning',
  },
  {
    key: 'failed',
    title: 'Payment was not completed',
    copy: 'No booking is confirmed until the provider verifies payment.',
    icon: AlertTriangle,
    tone: 'danger',
  },
];

// Shared class recipes so the hero, sidebar and section panels cannot drift apart.
const PANEL = 'rounded-xl border border-border bg-white p-5 shadow-sm sm:p-6';
const SECTION_HEAD = 'flex flex-col gap-3 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between';
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600';
const NAV_LINK = 'flex min-h-[40px] items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-muted transition-colors hover:bg-surface hover:text-navy';
const NAV_LINK_ACTIVE = `${NAV_LINK} bg-surface text-navy`;
// Each recovery card carries the same tone a themed Alert does, so the tone in
// the data maps straight onto the Alert palette.
const RECOVERY_TONE = { info: 'info', warning: 'warning', danger: 'failure' };

export default function TrustPage() {
  const { user, logout } = useAuth();
  const [disputes, setDisputes] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadTrustData = useCallback(async ({ silent = false } = {}) => {
    if (!silent) setLoading(true);
    setError('');
    try {
      const [disputeResponse, bookingResponse] = await Promise.all([
        apiClient.get('/disputes'),
        apiClient.get('/bookings', { params: { limit: 100 } }),
      ]);
      setDisputes(Array.isArray(disputeResponse.data.data) ? disputeResponse.data.data : []);
      setBookings(Array.isArray(bookingResponse.data.data) ? bookingResponse.data.data : []);
    } catch (loadError) {
      setError(loadError.response?.data?.error || 'Trust and recovery data could not be loaded.');
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Trust and recovery | ZuriLofts';
    loadTrustData();
  }, [loadTrustData]);

  const stats = useMemo(() => {
    const openDisputes = disputes.filter((dispute) => dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW').length;
    const heldBookings = bookings.filter((booking) => booking.status === 'PENDING').length;
    return [
      { value: loading ? '-' : openDisputes, label: openDisputes === 1 ? 'Open dispute' : 'Open disputes' },
      { value: loading ? '-' : heldBookings, label: heldBookings === 1 ? 'Booking held' : 'Bookings held' },
      { value: '24h', label: 'First response target' },
    ];
  }, [bookings, disputes, loading]);

  const nextPaymentBooking = bookings.find((booking) => booking.status === 'PENDING');
  const paymentLink = nextPaymentBooking ? `/bookings/${nextPaymentBooking.id}` : '/trips';
  const initials = `${user?.firstName?.[0] || user?.name?.[0] || 'G'}${user?.lastName?.[0] || ''}`.toUpperCase();

  return <div className="min-h-screen bg-surface" data-openpencil-frame="0:9724">
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-6">
      <div className="mb-3"><RouteBackButton /></div>

      <header className={PANEL}>
        <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className={EYEBROW}>TRUST &amp; RECOVERY</p>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy">Keep your account safe</h1>
            <span className="mt-1 block text-sm leading-relaxed text-muted">Identity verification, dispute resolution and payment recovery in one place.</span>
          </div>
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3" aria-label="Trust and recovery overview">
            {stats.map((stat) => <div key={stat.label} className="min-w-[96px]"><strong className="block text-xl font-bold text-navy">{stat.value}</strong><span className="mt-1 block text-xs text-muted">{stat.label}</span></div>)}
          </div>
        </div>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-5 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="self-start rounded-xl border border-border bg-white p-5 shadow-sm lg:sticky lg:top-24">
          <div className="flex items-center gap-3 border-b border-border pb-4">
            {user?.avatar ? <img src={user.avatar} alt="" className="h-10 w-10 shrink-0 rounded-full object-cover" /> : <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-navy-bg text-xs font-bold text-white">{initials}</span>}
            <div className="min-w-0"><strong className="block truncate text-sm font-semibold text-navy">{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Guest'}</strong><small className="mt-0.5 block truncate text-xs text-muted">{user?.email}</small></div>
          </div>
          <nav className="mt-4 grid gap-1" aria-label="Trust sections">
            <a href="#identity" className={NAV_LINK_ACTIVE}><BadgeCheck size={16} strokeWidth={1.8} aria-hidden="true" />Identity verification</a>
            <a href="#disputes" className={NAV_LINK}><AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />Disputes{stats[0].value !== 0 && <em className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-primary-100 px-1.5 text-[10px] font-semibold not-italic text-primary-700">{stats[0].value}</em>}</a>
            <a href="#payment-recovery" className={NAV_LINK}><WalletCards size={16} strokeWidth={1.8} aria-hidden="true" />Payment recovery</a>
            <Link to="/profile#privacy" className={NAV_LINK}><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />Security</Link>
          </nav>
          <button type="button" className="mt-4 flex min-h-[40px] w-full items-center gap-2 border-t border-border px-3 pt-4 text-left text-xs font-semibold text-muted transition-colors hover:text-navy" onClick={logout}><LogOut size={16} strokeWidth={1.8} aria-hidden="true" />Log out</button>
        </aside>

        <div className="grid min-w-0 gap-5">
          <section id="identity" className={`${PANEL} scroll-mt-24`}><IdentityVerificationPanel /></section>

          <section id="disputes" className={`${PANEL} scroll-mt-24`}>
            <DisputePanel disputes={disputes} bookings={bookings} loading={loading} error={error} onRefresh={() => loadTrustData({ silent: true })} />
          </section>

          <section id="payment-recovery" className={`${PANEL} scroll-mt-24`}>
            <div className={SECTION_HEAD}>
              <div><h2 className="text-lg font-semibold text-navy">Payment recovery</h2><p className="mt-1 text-sm leading-relaxed text-muted">What guests see if a payment is interrupted.</p></div>
              <Badge color="gray" icon={ShieldCheck}>Secure provider check</Badge>
            </div>
            <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
              {RECOVERY_CARDS.map(({ key, title, copy, icon: Icon, tone }) => <Alert key={key} color={RECOVERY_TONE[tone]}>
                <div className="flex items-center gap-2"><Icon size={18} strokeWidth={1.8} aria-hidden="true" /><h3 className="text-sm font-semibold">{title}</h3></div>
                <p className="text-xs leading-relaxed">{copy}</p>
                {key === 'pending' && <Button as={Link} to={paymentLink} color="light" size="sm" className="self-start">Review booking</Button>}
                {key === 'failed' && <div className="flex flex-wrap items-center gap-3"><Button as={Link} to={paymentLink} size="sm">Try payment again</Button><Link to="/trips" className="text-xs font-semibold underline underline-offset-2">Return to booking</Link></div>}
              </Alert>)}
            </div>
            {loading && <div className="mt-4 flex items-center justify-center gap-2 text-xs text-muted"><Spinner size="sm" /><span>Checking your booking state...</span></div>}
          </section>
        </div>
      </div>
    </main>
  </div>;
}
