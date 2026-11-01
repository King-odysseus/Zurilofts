import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { CalendarDays, ClipboardList, LockKeyhole, MessageCircleMore, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import VerificationNudge from './VerificationNudge.jsx';

function AccountIcon({ type }) {
  const icons = {
    profile: UserRound,
    verification: ShieldCheck,
    trips: CalendarDays,
    bookings: ClipboardList,
    inbox: MessageCircleMore,
    privacy: LockKeyhole,
  };
  const Icon = icons[type];

  return <Icon className="opg-account-nav-icon" strokeWidth={1.8} aria-hidden="true" />;
}

AccountIcon.propTypes = {
  type: PropTypes.oneOf(['profile', 'verification', 'trips', 'bookings', 'inbox', 'privacy']).isRequired,
};

const accountLinks = [
  { key: 'profile', label: 'account.navPersonalDetails', to: '/profile#info' },
  { key: 'verification', label: 'account.navVerification', to: '/verify-identity' },
  { key: 'privacy', label: 'account.navPrivacy', to: '/profile#privacy' },
];

const travelLinks = [
  { key: 'trips', label: 'account.navTrips', to: '/trips' },
  { key: 'bookings', label: 'account.navBookings', to: '/booking-history' },
  { key: 'inbox', label: 'account.navInbox', to: '/inbox' },
];

// Pages pass these as English words; the table is what lets the shell show
// them in the reader's language without changing every caller.
const EYEBROW_KEYS = {
  Travel: 'account.eyebrowTravel',
  Reservation: 'account.eyebrowReservation',
  Account: 'account.eyebrowAccount',
  Trips: 'account.eyebrowTrips',
  Messages: 'account.eyebrowMessages',
};

// Keyed by IdentityVerification.status. SUBMITTED says the documents are with
// the reviewer instead of asking for them again, since re-uploading files
// already under review is busywork; REJECTED says they were not accepted, so
// the person knows to replace them rather than keep waiting.
const GUEST_NUDGE = {
  UNVERIFIED: { tone: 'attention', title: 'account.verificationNudgeUnverifiedTitle', description: 'account.verificationNudgeUnverifiedBody', actionLabel: 'account.verificationNudgeAction' },
  SUBMITTED: { tone: 'review', title: 'account.verificationNudgeSubmittedTitle', description: 'account.verificationNudgeSubmittedBody', actionLabel: 'account.verificationNudgeViewStatus' },
  REJECTED: { tone: 'rejected', title: 'account.verificationNudgeRejectedTitle', description: 'account.verificationNudgeRejectedBody', actionLabel: 'account.verificationNudgeAction' },
};

function GuestAccountLayout({ active, title, description, eyebrow, action, pageClassName = '', children }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  // A guest only learns that identity verification is required when checkout
  // refuses to take their money, which is the worst possible moment to find
  // out. The status already arrives with the session, so the shell can say it
  // plainly on every account page - profile, trips, bookings - long before a
  // stay is chosen. APPROVED has no entry, so a verified guest never sees it.
  const verificationNudge = GUEST_NUDGE[user?.identityVerificationStatus];
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Guest account';
    const eyebrowKey = eyebrow ? EYEBROW_KEYS[eyebrow] : null;
  const initials = `${user?.firstName?.[0] || user?.name?.[0] || 'G'}${user?.lastName?.[0] || ''}`.toUpperCase();

  return <div className={`opg-account-page${pageClassName ? ` ${pageClassName}` : ''}`}>
    <main className="opg-account-main">
      <div className="opg-account-container">
        <aside className="opg-account-sidebar" aria-label={t('account.navigationLabel')}>
          <div className="opg-account-person">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{initials}</span>}
            <div><strong>{fullName}</strong><small>{t('account.guestAccount')}</small></div>
          </div>

          <p className="opg-account-nav-label">{t('account.navLabelAccount')}</p>
          <nav className="opg-account-nav">
            {accountLinks.map((item) => <Link key={item.key} to={item.to} className={active === item.key ? 'is-active' : ''} aria-current={active === item.key ? 'page' : undefined}><AccountIcon type={item.key} />{t(item.label)}</Link>)}
          </nav>

          <p className="opg-account-nav-label">{t('account.navLabelTravel')}</p>
          <nav className="opg-account-nav">
            {travelLinks.map((item) => <Link key={item.key} to={item.to} className={active === item.key ? 'is-active' : ''} aria-current={active === item.key ? 'page' : undefined}><AccountIcon type={item.key} />{t(item.label)}</Link>)}
          </nav>
        </aside>

        <section className="opg-account-content">
          <header className="opg-account-heading">
            <div>
              {eyebrow && <p>{eyebrowKey ? t(eyebrowKey) : eyebrow}</p>}
              <h1>{title}</h1>
              {description && <span>{description}</span>}
            </div>
            {action}
          </header>
          {verificationNudge && <VerificationNudge
            tone={verificationNudge.tone}
            title={t(verificationNudge.title)}
            description={t(verificationNudge.description)}
            actionLabel={t(verificationNudge.actionLabel)}
            to="/verify-identity"
            className="mb-5"
          />}
          {children}
        </section>
      </div>
    </main>
  </div>;
}

GuestAccountLayout.propTypes = {
  active: PropTypes.oneOf(['profile', 'verification', 'privacy', 'trips', 'bookings', 'inbox']).isRequired,
  title: PropTypes.string.isRequired,
  description: PropTypes.string,
  eyebrow: PropTypes.string,
  action: PropTypes.node,
  pageClassName: PropTypes.string,
  children: PropTypes.node.isRequired,
};

export default GuestAccountLayout;
