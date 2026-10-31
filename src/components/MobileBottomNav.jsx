import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CircleUserRound, Home, Heart, Luggage, MessageCircleMore } from 'lucide-react';
import { useMode } from '../context/ModeContext.jsx';

// Paths where global navigation (including these tabs) is intentionally
// hidden: checkout and payment results (compact logo/back header only), and the host/admin
// workspaces, which have their own navigation. The home page keeps Home
// active so mobile guests always have a primary navigation surface.
function isHiddenPath(pathname) {
  return (
    pathname.startsWith('/booking/') ||
    pathname.startsWith('/payment/callback') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/host')
  );
}

const TABS = [
  {
    key: 'home',
    label: 'Home',
    to: '/',
    match: (p) => p === '/' || p.startsWith('/properties') || p.startsWith('/property/'),
    icon: (active) => (
      <Home className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    ),
  },
  {
    key: 'saved',
    label: 'Saved',
    to: '/favourites',
    match: (p) => p.startsWith('/favourites') || p.startsWith('/shortlists'),
    icon: (active) => (
      <Heart className="h-[18px] w-[18px]" fill={active ? 'currentColor' : 'none'} strokeWidth={1.8} aria-hidden="true" />
    ),
  },
  {
    key: 'trips',
    label: 'Trips',
    to: '/trips',
    match: (p) => p.startsWith('/trips') || p.startsWith('/bookings'),
    icon: (active) => (
      <Luggage className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    ),
  },
  {
    key: 'messages',
    label: 'Inbox',
    to: '/inbox',
    match: (p) => p.startsWith('/inbox') || p.startsWith('/messages') || p.startsWith('/disputes'),
    icon: (active) => (
      <MessageCircleMore className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    ),
  },
  {
    key: 'profile',
    label: 'Profile',
    to: '/profile',
    match: (p) => p.startsWith('/profile') || p.startsWith('/verify-identity') || p.startsWith('/login') || p.startsWith('/register'),
    icon: (active) => (
      <CircleUserRound className="h-[18px] w-[18px]" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    ),
  },
];

/**
 * Role-aware guest mobile bottom navigation (below 768px): Home, Saved,
 * Trips, Inbox, Profile. Hidden during checkout (compact header instead)
 * and inside the host/admin workspaces, which have their own navigation.
 * Destinations that require auth (Trips, Messages, Profile's booking
 * history) rely on the existing ProtectedRoute redirect-to-login - no
 * special-casing needed here.
 *
 * Toggles a body class so global CSS can reserve bottom content padding
 * only while the bar is actually shown, rather than every page having to
 * remember to add its own spacer.
 */
function MobileBottomNav() {
  const location = useLocation();
  const { mode } = useMode();
  const hidden = isHiddenPath(location.pathname) || mode === 'hosting';

  useEffect(() => {
    document.body.classList.toggle('has-mobile-bottom-nav', !hidden);
    return () => document.body.classList.remove('has-mobile-bottom-nav');
  }, [hidden]);

  if (hidden) return null;

  // The .mobile-bottom-nav class stays on the bar because styles.css uses it for
  // the bronze active rail and for the page space reserved by
  // body.has-mobile-bottom-nav. That rule sits after the Tailwind layers, so a
  // pb-* utility would lose to it; the home-indicator inset is therefore set
  // inline, where it also stays visible to whoever restyles this bar next.
  return (
    <nav
      aria-label="Primary"
      style={{ paddingBottom: 'calc(6px + env(safe-area-inset-bottom))' }}
      className="mobile-bottom-nav fixed inset-x-3 bottom-3 z-40 mx-auto grid max-w-[390px] grid-cols-5 items-stretch rounded-full border border-border bg-elevated text-muted shadow-[0_10px_30px_rgba(15,23,42,0.14)] md:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match(location.pathname);
        // Equal grid columns plus min-w-0 keep all five tabs the same width at
        // 360px, so the label truncates instead of the bar scrolling sideways.
        // Active is navy ink only; the bronze hairline below it is the single
        // accent, drawn by the shared .mobile-bottom-nav rules.
        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-[44px] min-w-0 flex-col items-center justify-center gap-0.5 rounded-2xl px-1 text-[10px] font-semibold leading-none transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-primary ${
              active ? 'text-navy' : 'text-muted hover:text-navy'
            }`}
          >
            {/* An unread dot belongs absolutely inside this box, so showing one
                never pushes the icon off the centre line of its column. */}
            <span className="relative flex h-[18px] w-[18px] items-center justify-center">
              {tab.icon(active)}
            </span>
            <span className="w-full truncate text-center">{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
