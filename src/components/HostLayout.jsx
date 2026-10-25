import { Link, useLocation, useNavigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Dropdown, DropdownDivider, DropdownHeader, DropdownItem } from 'flowbite-react';
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
import logoImg from '../assets/zurilofts-logo.png';

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
    <div className="min-h-screen bg-[#F7F8FA]">
      <header className="op-host-appbar">
        <div className="op-host-appbar-inner">
          <Link to="/host/today" className="op-host-appbar-brand" aria-label="Host workspace home">
            <img src={logoImg} alt="" className="h-8 w-auto" />
            <span className="op-host-appbar-badge">Host</span>
          </Link>

          <nav className="op-host-appbar-tabs" aria-label="Host workspace">
            {TABS.map((tab) => {
              const active = tab.match(location.pathname);
              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  aria-current={active ? 'page' : undefined}
                  className={`op-host-appbar-tab${active ? ' is-active' : ''}`}
                >
                  {tab.label}
                </Link>
              );
            })}
          </nav>

          <div className="op-host-appbar-actions">
            <Link to="/host/properties/new" className="op-host-appbar-primary" aria-label="New listing">
              <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              <span>New listing</span>
            </Link>

            <Dropdown
              inline
              arrowIcon={false}
              placement="bottom-end"
              theme={{ inlineWrapper: 'op-host-appbar-menu' }}
              label={
                <>
                  <span className="sr-only">Open host account menu</span>
                  <span aria-hidden="true" className="op-host-appbar-avatar">{hostInitials(user)}</span>
                  <ChevronDown className="h-3.5 w-3.5" aria-hidden="true" />
                </>
              }
            >
              <DropdownHeader>
                <span className="block text-sm font-semibold text-[#0B1F42]">{displayName}</span>
                <span className="block truncate text-xs text-[#64748B]">{user?.email}</span>
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

      <main className="op-host-appmain">{children}</main>
      <HostMobileBottomNav />
    </div>
  );
}

HostLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostLayout;
