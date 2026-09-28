import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { useAuth } from '../context/AuthContext.jsx';

function AccountIcon({ type }) {
  const paths = {
    profile: 'M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z',
    verification: 'M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622C17.176 19.29 21 14.591 21 9c0-1.042-.133-2.052-.382-3.016z',
    trips: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
    bookings: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2m-2 0V3H9v2m0 0h6M9 12h6m-6 4h6',
    inbox: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z',
    privacy: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z',
  };

  return <svg className="opg-account-nav-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={paths[type]} /></svg>;
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

function GuestAccountLayout({ active, title, description, eyebrow, action, children }) {
  const { user } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Guest account';
  const initials = `${user?.firstName?.[0] || user?.name?.[0] || 'G'}${user?.lastName?.[0] || ''}`.toUpperCase();

  return <div className="opg-account-page">
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
  children: PropTypes.node.isRequired,
};

export default GuestAccountLayout;
