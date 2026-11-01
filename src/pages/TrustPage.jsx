import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Badge, Button, Spinner } from 'flowbite-react';
import { AlertTriangle, BadgeCheck, Clock3, LifeBuoy, LogOut, ShieldCheck, WalletCards } from 'lucide-react';
import DisputePanel from '../components/DisputePanel.jsx';
import IdentityVerificationPanel from '../components/IdentityVerificationPanel.jsx';
import RouteBackButton from '../components/RouteBackButton.jsx';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

const RECOVERY_CARDS = [
  {
    key: 'checking',
    titleKey: 'trust.recoveryCheckingTitle',
    copyKey: 'trust.recoveryCheckingCopy',
    icon: Clock3,
    tone: 'info',
  },
  {
    key: 'pending',
    titleKey: 'trust.recoveryPendingTitle',
    copyKey: 'trust.recoveryPendingCopy',
    icon: LifeBuoy,
    tone: 'warning',
  },
  {
    key: 'failed',
    titleKey: 'trust.recoveryFailedTitle',
    copyKey: 'trust.recoveryFailedCopy',
    icon: AlertTriangle,
    tone: 'danger',
  },
];

export default function TrustPage() {
  const { t } = useLanguage();
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
      setError(loadError.response?.data?.error || t('trust.trustLoadFailed'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    loadTrustData();
  }, [loadTrustData]);

  const stats = useMemo(() => {
    const openDisputes = disputes.filter((dispute) => dispute.status === 'OPEN' || dispute.status === 'UNDER_REVIEW').length;
    const heldBookings = bookings.filter((booking) => booking.status === 'PENDING').length;
    return [
      { value: loading ? '-' : openDisputes, label: t(openDisputes === 1 ? 'trust.openDisputeOne' : 'trust.openDisputeOther') },
      { value: loading ? '-' : heldBookings, label: t(heldBookings === 1 ? 'trust.bookingHeldOne' : 'trust.bookingHeldOther') },
      { value: '24h', label: t('trust.firstResponseTarget') },
    ];
  }, [bookings, disputes, loading, t]);

  const nextPaymentBooking = bookings.find((booking) => booking.status === 'PENDING');
  const paymentLink = nextPaymentBooking ? `/bookings/${nextPaymentBooking.id}` : '/trips';
  const initials = `${user?.firstName?.[0] || user?.name?.[0] || 'G'}${user?.lastName?.[0] || ''}`.toUpperCase();

  return <div className="op-trust-page">
    <main className="op-trust-wrap">
      <div className="op-trust-back"><RouteBackButton /></div>

      <header className="op-trust-hero">
        <div className="op-trust-hero-copy">
          <p>{t('misc.trustEyebrow')}</p>
          <h1>{t('misc.trustTitle')}</h1>
          <span>{t('misc.trustDescription')}</span>
        </div>
        <div className="op-trust-stats" aria-label={t('misc.trustOverview')}>
          {stats.map((stat) => <div key={stat.label}><strong>{stat.value}</strong><span>{stat.label}</span></div>)}
        </div>
      </header>

      <div className="op-trust-layout">
        <aside className="op-trust-sidebar">
          <div className="op-trust-person">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{initials}</span>}
            <div><strong>{[user?.firstName, user?.lastName].filter(Boolean).join(' ') || t('trust.guestFallback')}</strong><small>{user?.email}</small></div>
          </div>
          <nav aria-label={t('misc.trustSections')}>
            <a href="#identity"><BadgeCheck size={16} strokeWidth={1.8} aria-hidden="true" />{t('misc.identityVerification')}</a>
            <a href="#disputes"><AlertTriangle size={16} strokeWidth={1.8} aria-hidden="true" />{t('admin.disputes')}{stats[0].value !== 0 && <em>{stats[0].value}</em>}</a>
            <a href="#payment-recovery"><WalletCards size={16} strokeWidth={1.8} aria-hidden="true" />{t('misc.paymentRecovery')}</a>
            <Link to="/profile#privacy"><ShieldCheck size={16} strokeWidth={1.8} aria-hidden="true" />{t('misc.security')}</Link>
          </nav>
          <button type="button" className="op-trust-logout" onClick={logout}><LogOut size={16} strokeWidth={1.8} aria-hidden="true" />{t('misc.logOut')}</button>
        </aside>

        <div className="op-trust-content">
          <section id="identity" className="op-trust-panel"><IdentityVerificationPanel /></section>

          <section id="disputes" className="op-trust-panel">
            <DisputePanel disputes={disputes} bookings={bookings} loading={loading} error={error} onRefresh={() => loadTrustData({ silent: true })} />
          </section>

          <section id="payment-recovery" className="op-trust-panel op-trust-recovery-panel">
            <div className="op-trust-panel-head">
              <div><h2>{t('misc.paymentRecovery')}</h2><p>{t('misc.paymentRecoveryHint')}</p></div>
              <Badge color="gray" icon={ShieldCheck}>{t('misc.secureProviderCheck')}</Badge>
            </div>
            <div className="op-trust-recovery">
              {RECOVERY_CARDS.map(({ key, titleKey, copyKey, icon: Icon, tone }) => <article key={key} className={`op-trust-recovery-card is-${tone}`}>
                <span><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
                <h3>{t(titleKey)}</h3>
                <p>{t(copyKey)}</p>
                {key === 'pending' && <Button as={Link} to={paymentLink} color="light" size="sm">{t('misc.reviewBooking')}</Button>}
                {key === 'failed' && <div className="op-trust-recovery-actions"><Button as={Link} to={paymentLink} size="sm" className="op-trust-button-primary">{t('misc.tryPaymentAgain')}</Button><Link to="/trips">{t('misc.returnToBooking')}</Link></div>}
              </article>)}
            </div>
            {loading && <div className="op-trust-inline-loading"><Spinner size="sm" /><span>{t('misc.checkingBookingState')}</span></div>}
          </section>
        </div>
      </div>
    </main>
  </div>;
}
