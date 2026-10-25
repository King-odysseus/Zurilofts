import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { CalendarDays, ClipboardList, LockKeyhole, MessageCircleMore, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// Shared sidebar entry styling, so the two nav groups stay visually identical.
const NAV_LINK = 'flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-navy';
const NAV_LINK_ACTIVE = 'bg-primary-50 font-semibold text-navy';
const NAV_LABEL = 'mx-2 mb-1 mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-muted';

function navLinkClass(isActive) {
  return isActive ? `${NAV_LINK} ${NAV_LINK_ACTIVE}` : NAV_LINK;
}

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

  return <Icon className="h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />;
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

function GuestAccountLayout({ active, title, description, eyebrow, action, compact = false, children }) {
  const { user } = useAuth();
  const fullName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || user?.name || 'Guest account';
  const initials = `${user?.firstName?.[0] || user?.name?.[0] || 'G'}${user?.lastName?.[0] || ''}`.toUpperCase();
  // `compact` is the "thread open on a phone" state: the account chrome would
  // otherwise push the conversation far below the fold, so it returns at lg.
  const headingClass = `mb-5 flex-col gap-4 sm:flex-row sm:items-start sm:justify-between${compact ? ' hidden lg:flex' : ' flex'}`;

  return <div className="min-h-screen bg-surface">
    {/* The navbar is fixed at h-16 (64px). Without matching top padding the page
        title rendered underneath it and the first line was cut in half. */}
    <main className="mx-auto w-full max-w-6xl px-4 pb-8 pt-24 sm:px-6 lg:px-8">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className={`h-fit rounded-xl border border-border bg-white p-3 lg:sticky lg:top-24${compact ? ' hidden lg:block' : ''}`} aria-label="Account navigation">
          <div className="flex items-center gap-3 border-b border-border px-2 pb-3">
            {user?.avatar
              ? <img src={user.avatar} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
              : <span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-primary text-sm font-bold text-white">{initials}</span>}
            <div className="min-w-0">
              <strong className="block truncate text-sm font-bold text-navy">{fullName}</strong>
              <small className="mt-0.5 block truncate text-xs text-muted">Guest account</small>
            </div>
          </div>

          <p className={NAV_LABEL}>Account</p>
          <nav className="grid gap-1">
            {accountLinks.map((item) => <Link key={item.key} to={item.to} className={navLinkClass(active === item.key)} aria-current={active === item.key ? 'page' : undefined}><AccountIcon type={item.key} />{item.label}</Link>)}
          </nav>

          <p className={NAV_LABEL}>Travel</p>
          <nav className="grid gap-1">
            {travelLinks.map((item) => <Link key={item.key} to={item.to} className={navLinkClass(active === item.key)} aria-current={active === item.key ? 'page' : undefined}><AccountIcon type={item.key} />{item.label}</Link>)}
          </nav>
        </aside>

        <section className="min-w-0">
          <header className={headingClass}>
            <div className="min-w-0">
              {eyebrow && <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-600">{eyebrow}</p>}
              <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h1>
              {description && <span className="mt-1 block max-w-2xl text-sm leading-relaxed text-muted">{description}</span>}
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
  compact: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

export default GuestAccountLayout;
