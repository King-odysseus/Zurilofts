import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { CircleUserRound, Compass, Heart, Luggage, MessageCircleMore } from 'lucide-react';
import { useMode } from '../context/ModeContext.jsx';

// Paths where global navigation (including these tabs) is intentionally
// hidden: checkout and payment results (compact logo/back header only), and the host/admin
// workspaces, which have their own navigation. The home page keeps Explore
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
    key: 'explore',
    label: 'Explore',
    to: '/properties',
    match: (p) => p === '/' || p.startsWith('/properties') || p.startsWith('/property/'),
    icon: (active) => (
      <Compass className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    ),
  },
  {
    key: 'saved',
    label: 'Saved',
    to: '/favourites',
    match: (p) => p.startsWith('/favourites') || p.startsWith('/shortlists'),
    icon: (active) => (
      <Heart className="h-6 w-6" fill={active ? 'currentColor' : 'none'} strokeWidth={1.8} aria-hidden="true" />
    ),
  },
  {
    key: 'trips',
    label: 'Trips',
    to: '/trips',
    match: (p) => p.startsWith('/trips') || p.startsWith('/bookings'),
    icon: (active) => (
      <Luggage className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    ),
  },
  {
    key: 'messages',
    label: 'Inbox',
    to: '/inbox',
    match: (p) => p.startsWith('/inbox') || p.startsWith('/messages') || p.startsWith('/disputes'),
    icon: (active) => (
      <MessageCircleMore className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    ),
  },
  {
    key: 'profile',
    label: 'Profile',
    to: '/profile',
    match: (p) => p.startsWith('/profile') || p.startsWith('/verify-identity') || p.startsWith('/login') || p.startsWith('/register'),
    icon: (active) => (
      <CircleUserRound className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} aria-hidden="true" />
    ),
  },
];

/**
 * Role-aware guest mobile bottom navigation (below 768px): Explore, Saved,
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

  return (
    <nav
      aria-label="Primary"
      className="mobile-bottom-nav fixed inset-x-3 bottom-3 z-40 mx-auto flex max-w-[390px] items-center gap-1 rounded-full border border-white/10 bg-[#0B1F42] p-1.5 text-white shadow-[0_16px_36px_rgba(11,31,66,0.34)] backdrop-blur md:hidden"
    >
      {TABS.map((tab) => {
        const active = tab.match(location.pathname);
        return (
          <Link
            key={tab.key}
            to={tab.to}
            aria-current={active ? 'page' : undefined}
            className={`relative flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5 text-[10px] font-semibold leading-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
              active ? 'text-white' : 'text-white/80 hover:text-white'
            }`}
          >
            {tab.icon(active)}
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

export default MobileBottomNav;
