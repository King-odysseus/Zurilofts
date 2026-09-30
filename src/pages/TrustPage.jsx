import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Spinner } from 'flowbite-react';
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
  const paymentLink = nextPaymentBooking ? `/booking/${nextPaymentBooking.id}` : '/trips';
  const initials = `${user?.firstName?.[0] || user?.name?.[0] || 'G'}${user?.lastName?.[0] || ''}`.toUpperCase();

  return <div className="op-trust-page" data-openpencil-frame="0:9724">
    <main className="op-trust-wrap">
      <div className="op-trust-back"><RouteBackButton /></div>

      <header className="op-trust-hero">
        <div className="op-trust-hero-copy">
          <p>TRUST &amp; RECOVERY</p>
          <h1>Keep your account safe</h1>
          <span>Identity verification, dispute resolution and payment recovery in one place.</span>
        </div>
        <div className="op-trust-stats" aria-label="Trust and recovery overview">
          {stats.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
        </div>
      </header>

      <div className="op-trust-layout">
        <aside className="op-trust-sidebar">
          <div className="op-trust-person">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{initials}</span>}
            <div><strong>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Guest'}</strong><small>{user?.email}</small></div>
          </div>
          <nav aria-label="Trust sections">
            <a href="#identity"><BadgeCheck size={16} strokeWidth={1.8} aria-hidden="true" />Identity verification</a>
            <a href="#disputes"><AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />Disputes{stats[0].value !== 0 && <em>{stats[0].value}</em>}</a>
            <a href="#payment-recovery"><WalletCards size={16} strokeWidth={1.8} aria-hidden="true" />Payment recovery</a>
            <Link to="/profile#privacy"><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />Security</Link>
          </nav>
          <button type="button" className="op-trust-logout" onClick={logout}><LogOut size={16} strokeWidth={1.8} aria-hidden="true" />Log out</button>
        </aside>

        <div className="op-trust-content">
          <section id="identity" className="op-trust-panel"><IdentityVerificationPanel /></section>

          <section id="disputes" className="op-trust-panel">
            <DisputePanel disputes={disputes} bookings={bookings} loading={loading} error={error} onRefresh={() => loadTrustData({ silent: true })} />
          </section>

          <section id="payment-recovery" className="op-trust-panel op-trust-recovery-panel">
            <div className="op-trust-panel-head">
              <div><h2>Payment recovery</h2><p>What guests see if a payment is interrupted.</p></div>
              <Badge color="gray" icon={ShieldCheck}>Secure provider check</Badge>
            </div>
            <div className="op-trust-recovery">
              {RECOVERY_CARDS.map(({ key, title, copy, icon: Icon, tone }) => <article key={key} className={`op-trust-recovery-card is-${tone}`}>
                <span><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                <h3>{title}</h3>
                <p>{copy}</p>
                {key === 'pending' && <Button as={Link} to={paymentLink} color="light" size="sm">Review booking</Button>}
                {key === 'failed' && <div className="op-trust-recovery-actions"><Button as={Link} to={paymentLink} size="sm" className="op-trust-button-primary">Try payment again</Button><Link to="/trips">Return to booking</Link></div>}
              </article>)}
            </div>
            {loading && <div className="op-trust-inline-loading"><Spinner size="sm" /><span>Checking your booking state...</span></div>}
          </section>
        </div>
      </div>
    </main>
  </div>;
}
