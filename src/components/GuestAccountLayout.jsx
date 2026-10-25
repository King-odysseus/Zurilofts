import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { CalendarDays, ClipboardList, LockKeyhole, MessageCircleMore, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

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
  { key: 'profile', label: 'Personal details', to: '/profile#info' },
  { key: 'verification', label: 'Verification', to: '/verify-identity' },
  { key: 'privacy', label: 'Privacy', to: '/profile#privacy' },
];

const travelLinks = [
  { key: 'trips', label: 'Trips', to: '/trips' },
  { key: 'bookings', label: 'Booking history', to: '/booking-history' },
  { key: 'inbox', label: 'Messages', to: '/inbox' },
];

function GuestAccountLayout({ active, title, description, eyebrow, action, pageClassName = '', children }) {
  const { user } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Guest account';
  const initials = `${user?.firstName?.[0] || user?.name?.[0] || 'G'}${user?.lastName?.[0] || ''}`.toUpperCase();

  return <div className={`opg-account-page${pageClassName ? ` ${pageClassName}` : ''}`}>
    <main className="opg-account-main">
      <div className="opg-account-container">
        <aside className="opg-account-sidebar" aria-label="Account navigation">
          <div className="opg-account-person">
            {user?.avatar ? <img src={user.avatar} alt="" /> : <span>{initials}</span>}
            <div><strong>{fullName}</strong><small>Guest account</small></div>
          </div>

          <p className="opg-account-nav-label">Account</p>
          <nav className="opg-account-nav">
            {accountLinks.map((item) => <Link key={item.key} to={item.to} className={active === item.key ? 'is-active' : ''} aria-current={active === item.key ? 'page' : undefined}><AccountIcon type={item.key} />{item.label}</Link>)}
          </nav>

          <p className="opg-account-nav-label">Travel</p>
          <nav className="opg-account-nav">
            {travelLinks.map((item) => <Link key={item.key} to={item.to} className={active === item.key ? 'is-active' : ''} aria-current={active === item.key ? 'page' : undefined}><AccountIcon type={item.key} />{item.label}</Link>)}
          </nav>
        </aside>

        <section className="opg-account-content">
          <header className="opg-account-heading">
            <div>
              {eyebrow && <p>{eyebrow}</p>}
              <h1>{title}</h1>
              {description && <span>{description}</span>}
            </div>
            {action}
          </header>
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
