import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo.jsx';
import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';
import {
  ArrowLeftRight,
  Building2,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  FileText,
  LockKeyhole,
  LogOut,
  MessageCircleMore,
  MessagesSquare,
  Percent,
  Plus,
  Wallet,
} from 'lucide-react';
import HostMobileBottomNav from './HostMobileBottomNav.jsx';
import { CONVERSATIONS_READ_EVENT } from '../utils/conversations.js';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';

// The five things a host repeats every day. One list feeds the desktop tabs and
// the mobile bottom bar so the two navigations cannot drift apart.
const TABS = [
  { key: 'today', label: 'Today', to: '/host/today', icon: CalendarClock, match: (pathname) => pathname === '/host/today' },
  { key: 'calendar', label: 'Calendar', to: '/host/calendar', icon: CalendarDays, match: (pathname) => pathname.startsWith('/host/calendar') },
  { key: 'listings', label: 'Listings', to: '/host/listings', icon: Building2, match: (pathname) => pathname.startsWith('/host/listings') || pathname.startsWith('/host/properties') },
  // Messages is the host inbox, not the traveller one: a host reads the guests
  // staying at their properties here. Traveller conversations live at /inbox.
  // The label matches the other host surfaces; the account menu says "Guest
  // messages", which is where the distinction from travel actually matters.
  { key: 'messages', label: 'Messages', to: '/host/inbox', icon: MessageCircleMore, match: (pathname) => pathname.startsWith('/host/inbox') },
  { key: 'earnings', label: 'Earnings', to: '/host/earnings', icon: ChartNoAxesCombined, match: (pathname) => pathname.startsWith('/host/earnings') || pathname.startsWith('/host/payouts') },
];

function hostInitials(user) {
  const first = user?.firstName?.[0] ?? '';
  const last = user?.lastName?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || 'H';
}

// Shared nav-link styling so the desktop tabs cannot drift apart.
const NAV_LINK_BASE = 'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors';
const NAV_LINK_IDLE = 'text-muted hover:bg-surface hover:text-navy';
// The active pill paints bronze, so its label must be the fixed navy ink.
// Keeping the colour out of the structural class stops an active item from
// inheriting the idle `text-muted`, which rendered pale-on-bronze.
const NAV_LINK_ACTIVE = 'bg-primary font-semibold text-white hover:bg-primary hover:text-white';

// The account menu mirrors the traveller one row for row: icon, label, the
// browsing-as line, then the switch. A host menu that looked different from the
// traveller menu made the two sides feel like different products.
const ACCOUNT_ITEM = 'flex w-full items-center rounded-[10px] px-4 py-2.5 text-sm text-navy transition-colors hover:bg-surface';
const ACCOUNT_ICON = 'mr-3 h-4 w-4 text-muted';
const ACCOUNT_EYEBROW = 'px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted';

function UnreadBadge({ count }) {
  if (!count) return null;
  return <span className="flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">{count > 9 ? '9+' : count}</span>;
}

UnreadBadge.propTypes = { count: PropTypes.number };

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
  const { mode, setMode } = useMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unreadGuestMessages, setUnreadGuestMessages] = useState(0);
  const menuRef = useRef(null);

  // Opening any host workspace page is a change of sides, not just a change of
  // page. Record it so the header cannot quietly become the host header after a
  // link, bookmark or redirect - the transition overlay names the side instead.
  useEffect(() => {
    if (mode !== 'hosting') setMode('hosting');
    // Intentionally mount-only: re-running on every mode change would replay the
    // overlay each time the person deliberately leaves hosting.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Only the host side is counted here, so the badge cannot include unread
  // replies that belong to conversations this account has as a guest.
  useEffect(() => {
    let active = true;
    async function loadUnread() {
      try {
        const response = await apiClient.get('/conversations/unread-count', { params: { side: 'host' } });
        if (active) setUnreadGuestMessages(Number(response.data.data?.count) || 0);
      } catch {
        if (active) setUnreadGuestMessages(0);
      }
    }
    loadUnread();
    const interval = setInterval(loadUnread, 60000);
    // Opening a thread marks it read; recount then so the badge cannot keep
    // counting messages the host has already seen.
    window.addEventListener(CONVERSATIONS_READ_EVENT, loadUnread);
    return () => {
      active = false;
      clearInterval(interval);
      window.removeEventListener(CONVERSATIONS_READ_EVENT, loadUnread);
    };
  }, [location.pathname]);

  // A menu that survives the page change behind it would look stuck open.
  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') setMenuOpen(false);
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  function handleTravelling() {
    // Hosting mode is a stored preference, so leaving through this exit also
    // clears it - otherwise the next visit would drop the user back here.
    setMenuOpen(false);
    setMode('travelling');
    navigate('/');
  }

  function handleLogout() {
    setMenuOpen(false);
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
                  className={`${NAV_LINK_BASE} ${active ? NAV_LINK_ACTIVE : NAV_LINK_IDLE}`}
                >
                  {tab.label}
                  {tab.key === 'messages' && <UnreadBadge count={unreadGuestMessages} />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            <Button as={Link} to="/host/properties/new" size="sm" aria-label="New listing">
              <Plus className="h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
              <span className="hidden md:inline">New listing</span>
            </Button>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label="Open host account menu"
                className="inline-flex items-center gap-1 rounded-full border border-border bg-elevated p-1 transition-colors hover:border-primary-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy-bg text-[11px] font-bold tracking-wide text-white">
                  {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : hostInitials(user)}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {menuOpen && <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-border bg-elevated py-2 shadow-xl">
                <div className="border-b border-border px-4 py-3">
                  <p className="text-sm font-semibold text-navy">{displayName}</p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                </div>

                <Link to="/profile#info" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <CircleUserRound className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  My Profile
                </Link>
                <Link to="/host/inbox" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <MessagesSquare className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  <span className="flex-1">Guest messages</span>
                  <UnreadBadge count={unreadGuestMessages} />
                </Link>
                <Link to="/host/discounts" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <Percent className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  Discounts
                </Link>
                {/* Payouts need an approved HOST account, so pending applicants are
                    not offered a destination they cannot use yet. */}
                {user?.role === 'HOST' && <Link to="/host/payouts" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <Wallet className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  Payouts
                </Link>}
                <Link to="/host/application" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <ClipboardList className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  Host setup
                </Link>
                <Link to="/terms" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <FileText className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  Terms of Service
                </Link>
                <Link to="/privacy" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <LockKeyhole className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  Privacy Policy
                </Link>

                <div className="mt-1 border-t border-border pt-1">
                  {/* The switch lives here alone and names the side first, exactly
                      as the traveller menu does: the header changes shape with the
                      side, so this line is the one place the two cannot be
                      confused, and the transition overlay announces the change. */}
                  <p className={ACCOUNT_EYEBROW}>You&apos;re browsing as a host</p>
                  <button type="button" onClick={handleTravelling} className={ACCOUNT_ITEM}>
                    <ArrowLeftRight className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                    Switch to Travelling
                  </button>
                </div>

                <div className="mt-1 border-t border-border pt-1">
                  <button type="button" onClick={handleLogout} className={ACCOUNT_ITEM}>
                    <LogOut className="mr-3 h-4 w-4 text-red-600" strokeWidth={2} aria-hidden="true" />
                    <span className="text-red-600">Sign Out</span>
                  </button>
                </div>
              </div>}
            </div>
          </div>
        </div>
      </header>

      {/* The mobile bottom bar floats over the page, so the last element on
          every host screen needs clearance or a composer sits behind it. */}
      <main className="mx-auto w-full max-w-7xl px-4 py-6 pb-28 md:pb-6 lg:px-6">{children}</main>
      <HostMobileBottomNav />
    </div>
  );
}

HostLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostLayout;
