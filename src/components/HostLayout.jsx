import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo.jsx';
import PropTypes from 'prop-types';
import { Button, Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from 'flowbite-react';
import {
  Building2,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  LogOut,
  MessageCircleMore,
  Plus,
} from 'lucide-react';
import HostMobileBottomNav from './HostMobileBottomNav.jsx';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';

// The five things a host repeats every day. One list feeds the desktop tabs and
// the mobile bottom bar so the two navigations cannot drift apart.
const TABS = [
  { key: 'today', label: 'Today', to: '/host/today', icon: CalendarClock, match: (pathname) => pathname === '/host/today' },
  { key: 'calendar', label: 'Calendar', to: '/host/calendar', icon: CalendarDays, match: (pathname) => pathname.startsWith('/host/calendar') },
  { key: 'listings', label: 'Listings', to: '/host/listings', icon: Building2, match: (pathname) => pathname.startsWith('/host/listings') || pathname.startsWith('/host/properties') },
  { key: 'messages', label: 'Inbox', to: '/inbox', icon: MessageCircleMore, match: (pathname) => pathname.startsWith('/inbox') },
  { key: 'earnings', label: 'Earnings', to: '/host/earnings', icon: ChartNoAxesCombined, match: (pathname) => pathname.startsWith('/host/earnings') || pathname.startsWith('/host/payouts') },
];

function hostInitials(user) {
  const first = user?.firstName?.[0] ?? '';
  const last = user?.lastName?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || 'H';
}

// Shared nav-link styling so the desktop tabs cannot drift apart.
const NAV_LINK = 'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium text-muted transition-colors hover:bg-surface hover:text-navy';
const NAV_LINK_ACTIVE = 'bg-primary font-semibold text-navy-bg hover:bg-primary hover:text-navy-bg';

// Host workspace shell. Hosts get their own frame instead of the guest site
// header: the marketing nav (search, destinations, saved trips) is no use while
// running a listing, and admin's operations dashboard is the wrong shape for it
// too. This bar carries only the host's daily tasks, so the workspace reads as
// an app rather than a page inside the marketplace.
// Every /host/* route renders inside this, which is why the page bodies need no
// header of their own, including HostApplicationPage, which is why that page
// draws no navbar of its own. It used to sit outside this shell and rendered a
// second navbar above its content.
function HostLayout({ children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { setMode } = useMode();

  function handleTravelling() {
    // Hosting mode is a stored preference, so leaving through this exit also
    // clears it - otherwise the next visit would drop the user back here.
    setMode('travelling');
    navigate('/');
  }

  function handleLogout() {
    logout();
    navigate('/');
  }

  const displayName = [user?.firstName, user?.lastName].filter(Boolean).join(' ') || 'Your account';

  return (
    <div className="min-h-screen bg-surface">
      <header className="sticky top-0 z-30 border-b border-border bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
          <Link to="/host/today" className="inline-flex shrink-0 items-center gap-2.5" aria-label="Host workspace home">
            <BrandLogo imgClassName="h-8 w-auto" />
            <span className="hidden items-center rounded-full bg-primary-50 dark:bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600 dark:text-primary-300 md:inline-flex">Host</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Host workspace">
            {TABS.map((tab) => {
              const active = tab.match(location.pathname);
              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  aria-current={active ? 'page' : undefined}
                  className={`${NAV_LINK}${active ? ` ${NAV_LINK_ACTIVE}` : ''}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button as={Link} to="/host/properties/new" size="sm" aria-label="New listing">
              <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              <span className="hidden md:inline">New listing</span>
            </Button>

            <Dropdown
              inline
              arrowIcon={false}
              placement="bottom-end"
              label={
                <>
                  <span className="sr-only">Open host account menu</span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated p-1 transition-colors hover:border-primary-200">
                    <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-navy-bg text-[11px] font-bold tracking-wide text-white">{hostInitials(user)}</span>
                    <ChevronDown className="h-3.5 w-3.5 text-muted" aria-hidden="true" />
                  </span>
                </>
              }
            >
              <DropdownHeader>
                <span className="block text-sm font-semibold text-navy">{displayName}</span>
                <span className="block truncate text-xs text-muted">{user?.email}</span>
              </DropdownHeader>
              <DropdownItem as={Link} to="/profile">Profile</DropdownItem>
              <DropdownItem as={Link} to="/host/discounts">Discounts</DropdownItem>
              {/* Payouts need an approved HOST account, so pending applicants are
                  not offered a destination they cannot use yet. */}
              {user?.role === 'HOST' && <DropdownItem as={Link} to="/host/payouts">Payouts</DropdownItem>}
              <DropdownItem as={Link} to="/host/application">Host setup</DropdownItem>
              <DropdownDivider />
              <DropdownItem onClick={handleTravelling}>Back to travelling</DropdownItem>
              <DropdownItem onClick={handleLogout}>
                <span className="inline-flex items-center gap-2 text-red-600">
                  <LogOut className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                  Sign out
                </span>
              </DropdownItem>
            </Dropdown>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">{children}</main>
      <HostMobileBottomNav />
    </div>
  );
}

HostLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostLayout;
