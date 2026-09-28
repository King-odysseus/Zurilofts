import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import { useMode } from '../context/ModeContext.jsx';

// Paths where global navigation (including these tabs) is intentionally
// hidden: checkout (compact logo/back header only), and the host/admin
// workspaces, which have their own navigation. The home page keeps Explore
// active so mobile guests always have a primary navigation surface.
function isHiddenPath(pathname) {
  return (
    pathname.startsWith('/booking/') ||
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
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    key: 'saved',
    label: 'Saved',
    to: '/favourites',
    match: (p) => p.startsWith('/favourites') || p.startsWith('/shortlists'),
    icon: (active) => (
      <svg className="h-6 w-6" fill={active ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
      </svg>
    ),
  },
  {
    key: 'trips',
    label: 'Trips',
    to: '/trips',
    match: (p) => p.startsWith('/trips') || p.startsWith('/bookings'),
    icon: (active) => (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M3 7l9-4 9 4-9 4-9-4zm0 0v10l9 4m0-10v10m0-10l9-4v10l-9 4" />
      </svg>
    ),
  },
  {
    key: 'messages',
    label: 'Inbox',
    to: '/inbox',
    match: (p) => p.startsWith('/inbox') || p.startsWith('/messages') || p.startsWith('/disputes'),
    icon: (active) => (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8-1.135 0-2.22-.19-3.216-.535L3 21l1.5-4.5C3.55 15.17 3 13.635 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    key: 'profile',
    label: 'Profile',
    to: '/profile',
    match: (p) => p.startsWith('/profile') || p.startsWith('/verify-identity') || p.startsWith('/login') || p.startsWith('/register'),
    icon: (active) => (
      <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={active ? 2.2 : 1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
      </svg>
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
            className={`flex min-h-[54px] min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-full px-1 py-1.5 text-[10px] font-semibold leading-none transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-white ${
              active ? 'bg-white/16 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white'
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
