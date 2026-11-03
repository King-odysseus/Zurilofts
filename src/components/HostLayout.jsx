import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import BrandLogo from './BrandLogo.jsx';
import PropTypes from 'prop-types';
import {
  ArrowLeftRight,
  BadgeCheck,
  Bell,
  Building2,
  CalendarClock,
  CalendarDays,
  ChartNoAxesCombined,
  ChevronDown,
  CircleUserRound,
  ClipboardList,
  Star,
  FileText,
  LockKeyhole,
  LogOut,
  MessageCircleMore,
  MessagesSquare,
  Percent,
  ShieldAlert,
  Wallet,
} from 'lucide-react';
import HostMobileBottomNav from './HostMobileBottomNav.jsx';
import { CONVERSATIONS_READ_EVENT } from '../utils/conversations.js';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import ThemeToggle from './ThemeToggle.jsx';
import LanguageSwitcher from './LanguageSwitcher.jsx';

// The five things a host repeats every day. One list feeds the desktop tabs and
// the mobile bottom bar so the two navigations cannot drift apart.
const TABS = [
  { key: 'today', label: 'host.tabToday', to: '/host/today', icon: CalendarClock, match: (pathname) => pathname === '/host/today' },
  { key: 'calendar', label: 'host.tabCalendar', to: '/host/calendar', icon: CalendarDays, match: (pathname) => pathname.startsWith('/host/calendar') },
  { key: 'listings', label: 'host.tabListings', to: '/host/listings', icon: Building2, match: (pathname) => pathname.startsWith('/host/listings') },
  // Messages is the host inbox, not the traveller one: a host reads the guests
  // staying at their properties here. Traveller conversations live at /inbox.
  // The label matches the other host surfaces; the account menu says "Guest
  // messages", which is where the distinction from travel actually matters.
  { key: 'messages', label: 'host.tabMessages', to: '/host/inbox', icon: MessageCircleMore, match: (pathname) => pathname.startsWith('/host/inbox') },
  { key: 'insights', label: 'host.tabInsights', to: '/host/insights', icon: Star, match: (pathname) => pathname.startsWith('/host/insights') || pathname.startsWith('/host/reservations') },
  { key: 'earnings', label: 'host.tabEarnings', to: '/host/earnings', icon: ChartNoAxesCombined, match: (pathname) => pathname.startsWith('/host/earnings') || pathname.startsWith('/host/payouts') },
];

function hostInitials(user) {
  const first = user?.firstName?.[0] ?? '';
  const last = user?.lastName?.[0] ?? '';
  return `${first}${last}`.toUpperCase() || 'H';
}

// Shared nav-link styling so the desktop tabs cannot drift apart.
const NAV_LINK_BASE = 'inline-flex items-center gap-2 rounded-full px-3 py-2 text-sm font-medium transition-colors';
const NAV_LINK_IDLE = 'text-muted hover:bg-surface hover:text-navy';
// Navy, not bronze: the workspace's main colour should be what marks where you
// are. Bronze stays a highlight (a count, a focus ring), and white type on
// bronze was too pale to read.
const NAV_LINK_ACTIVE = 'bg-navy-bg font-semibold text-white hover:bg-navy-hover hover:text-white';

// The account menu mirrors the traveller one row for row: icon, label, the
// browsing-as line, then the switch. A host menu that looked different from the
// traveller menu made the two sides feel like different products.
const ACCOUNT_ITEM = 'flex w-full items-center rounded-[10px] px-4 py-2.5 text-sm text-navy transition-colors hover:bg-surface';
const ACCOUNT_ICON = 'mr-3 h-4 w-4 text-muted';
const ACCOUNT_EYEBROW = 'px-4 pb-1 pt-2 text-[11px] font-medium uppercase tracking-[0.12em] text-muted';

// Bell rows: the same shape as an account row, with the icon parked in a tinted
// tile so a glance tells a booking request from a message.
const NOTIF_ITEM = 'flex items-center gap-3 px-4 py-3 text-sm text-navy transition-colors hover:bg-surface';
const NOTIF_TILE = 'grid h-8 w-8 shrink-0 place-items-center rounded-full bg-primary-50 text-primary-600 dark:bg-primary/15 dark:text-primary-300';

// Trust and Safety approved this host. The notice is shown once and then
// acknowledged here, because there is no read flag for review outcomes: the
// approval is a status, not a message with a read state. The key is cleared
// whenever the account stops being verified, so a host who is sent back and
// re-approved is told again.
const VERIFIED_NOTICE_KEY = 'zuri_host_verified_notice_seen';

function readVerifiedNoticeSeen() {
  try {
    return window.localStorage.getItem(VERIFIED_NOTICE_KEY) === '1';
  } catch {
    // Private mode, or storage turned off: show the notice rather than hide it.
    return false;
  }
}

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
  const { t } = useLanguage();
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { mode, setMode } = useMode();
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [unreadGuestMessages, setUnreadGuestMessages] = useState(0);
  // Bookings still waiting on the host's decision. Counted apart from messages
  // because the two lead to different pages and mean different things: one is a
  // conversation, the other is money and dates that stay blocked until answered.
  const [pendingBookings, setPendingBookings] = useState(0);
  // Listings an admin sent back or hid. Counted here as well as on the listings
  // page because a host who never opens Listings would otherwise never learn
  // that a reviewer is waiting on them.
  const [listingsNeedingAttention, setListingsNeedingAttention] = useState(0);
  const [verifiedNoticeSeen, setVerifiedNoticeSeen] = useState(readVerifiedNoticeSeen);
  const menuRef = useRef(null);
  const notifRef = useRef(null);

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

  // Booking requests need their own poll: /notifications scopes that count to
  // bookings on this host's properties, which the conversation endpoint above
  // knows nothing about.
  useEffect(() => {
    let active = true;
    async function loadPendingBookings() {
      try {
        const response = await apiClient.get('/notifications');
        if (active) {
          setPendingBookings(Number(response.data.data?.pendingBookings) || 0);
          setListingsNeedingAttention(Number(response.data.data?.listingsNeedingAttention) || 0);
        }
      } catch {
        // A failed count must not leave a stale badge claiming work is waiting.
        if (active) {
          setPendingBookings(0);
          setListingsNeedingAttention(0);
        }
      }
    }
    loadPendingBookings();
    const interval = setInterval(loadPendingBookings, 60000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }, [location.pathname]);

  // A menu that survives the page change behind it would look stuck open.
  useEffect(() => {
    setMenuOpen(false);
    setNotifOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen && !notifOpen) return undefined;
    function onPointerDown(event) {
      if (menuRef.current && !menuRef.current.contains(event.target)) setMenuOpen(false);
      if (notifRef.current && !notifRef.current.contains(event.target)) setNotifOpen(false);
    }
    function onKeyDown(event) {
      if (event.key === 'Escape') {
        setMenuOpen(false);
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen, notifOpen]);

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
  // Approved by Trust and Safety. The host sees the badge on their own account,
  // not only on the public listing where guests see it.
  const isVerifiedHost = user?.hostApplicationStatus === 'APPROVED';

  // A returned application is a notification too: it blocks publishing until the
  // host corrects it, and nothing else in this header says so.
  const applicationNeedsChanges = user?.hostApplicationStatus === 'CHANGES_REQUESTED';
  // So is a hold. A host who was verified and has now been put under
  // investigation loses the badge with no other trace in this header, which is
  // exactly the moment they need the page that explains why.
  const applicationUnderInvestigation = user?.hostApplicationStatus === 'UNDER_INVESTIGATION';
  // A suspended verification looks identical to a hold from inside the header,
  // because both simply remove the badge. The row has to say which one it is:
  // "we are looking into this" and "we have suspended it" are different news.
  const applicationSuspended = user?.hostApplicationStatus === 'SUSPENDED';
  const showVerifiedNotice = isVerifiedHost && !verifiedNoticeSeen;
  const totalNotifications = unreadGuestMessages + pendingBookings
    + (listingsNeedingAttention > 0 ? 1 : 0)
    + (applicationNeedsChanges ? 1 : 0)
    + (applicationUnderInvestigation ? 1 : 0)
    + (applicationSuspended ? 1 : 0)
    + (showVerifiedNotice ? 1 : 0);

  function acknowledgeVerified() {
    setVerifiedNoticeSeen(true);
    setNotifOpen(false);
    try {
      window.localStorage.setItem(VERIFIED_NOTICE_KEY, '1');
    } catch {
      // Not persisted, so the notice returns next time. Harmless.
    }
  }

  // A re-approved account is a new outcome, so the old acknowledgement must not
  // swallow it.
  useEffect(() => {
    if (isVerifiedHost) return;
    try {
      window.localStorage.removeItem(VERIFIED_NOTICE_KEY);
    } catch {
      // Nothing to clear.
    }
    setVerifiedNoticeSeen(false);
  }, [isVerifiedHost]);

  return (
    <div className="min-h-screen bg-canvas">
      <header className="sticky top-0 z-30 border-b border-border bg-elevated/95 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 lg:px-6">
          <Link to="/host/today" className="inline-flex shrink-0 items-center gap-2.5" aria-label={t('host.workspaceHome')}>
            <BrandLogo imgClassName="h-8 w-auto" />
            <span className="hidden items-center rounded-full bg-surface dark:bg-primary/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted dark:text-primary-300 md:inline-flex">{t('host.badge')}</span>
          </Link>

          <nav className="hidden items-center gap-1 lg:flex" aria-label={t('host.workspace')}>
            {TABS.map((tab) => {
              const active = tab.match(location.pathname);
              return (
                <Link
                  key={tab.key}
                  to={tab.to}
                  aria-current={active ? 'page' : undefined}
                  className={`${NAV_LINK_BASE} ${active ? NAV_LINK_ACTIVE : NAV_LINK_IDLE}`}
                >
                  {t(tab.label)}
                  {tab.key === 'messages' && <UnreadBadge count={unreadGuestMessages} />}
                </Link>
              );
            })}
          </nav>

          <div className="flex items-center gap-2">
            {/* The bell the admin workspace already has, on the host side and next
                to the avatar. Each row names one thing to do and links to the page
                that does it, so the badge is a way in rather than a number to
                interpret on a page the host then has to find. */}
            <ThemeToggle className="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            <LanguageSwitcher triggerClassName="inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" />
            <div className="relative" ref={notifRef}>
              <button
                type="button"
                onClick={() => { setNotifOpen((open) => !open); setMenuOpen(false); }}
                aria-haspopup="true"
                aria-expanded={notifOpen}
                aria-label={totalNotifications > 0 ? t('host.notificationsNew', { count: totalNotifications }) : t('host.notifications')}
                title={t('host.notifications')}
                className="relative inline-flex h-9 w-9 items-center justify-center rounded-full text-muted transition-colors hover:bg-surface hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <Bell className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
                {totalNotifications > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white">
                    {totalNotifications > 99 ? '99+' : totalNotifications}
                  </span>
                )}
              </button>

              {notifOpen && <div className="absolute right-0 z-30 mt-2 w-[min(18rem,calc(100vw-2rem))] rounded-2xl bg-elevated py-2 shadow-xl">
                <div className="border-b border-border px-4 py-2">
                  <p className="text-sm font-semibold text-navy">{t('host.notifications')}</p>
                </div>
                {totalNotifications === 0 ? (
                  <p className="px-4 py-6 text-center text-sm text-muted">{t('host.noNewNotifications')}</p>
                ) : (
                  <>
                    {showVerifiedNotice && <Link to="/host/application" onClick={acknowledgeVerified} className={NOTIF_ITEM}>
                      <span className={NOTIF_TILE} aria-hidden="true"><BadgeCheck className="h-4 w-4" strokeWidth={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-navy">You are verified</span>
                        <span className="block text-[11px] text-muted">Trust and Safety approved your host application. Your account now carries the verified badge.</span>
                      </span>
                    </Link>}
                    {applicationNeedsChanges && <Link to="/host/application" onClick={() => setNotifOpen(false)} className={NOTIF_ITEM}>
                      <span className={NOTIF_TILE} aria-hidden="true"><ClipboardList className="h-4 w-4" strokeWidth={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-navy">{t('host.applicationNeedsChanges')}</span>
                        <span className="block text-[11px] text-muted">{t('host.applicationNeedsChangesHint')}</span>
                      </span>
                    </Link>}
                    {applicationUnderInvestigation && <Link to="/host/application" onClick={() => setNotifOpen(false)} className={NOTIF_ITEM}>
                      <span className={NOTIF_TILE} aria-hidden="true"><ShieldAlert className="h-4 w-4" strokeWidth={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-navy">{t('hostsetup.underInvestigation')}</span>
                        <span className="block text-[11px] text-muted">{t('hostsetup.investigationHint')}</span>
                      </span>
                    </Link>}
                    {applicationSuspended && <Link to="/host/application" onClick={() => setNotifOpen(false)} className={NOTIF_ITEM}>
                      <span className={NOTIF_TILE} aria-hidden="true"><ShieldAlert className="h-4 w-4" strokeWidth={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-navy">{t('hostsetup.suspended')}</span>
                        <span className="block text-[11px] text-muted">{t('hostsetup.suspendedHint')}</span>
                      </span>
                    </Link>}
                    {pendingBookings > 0 && <Link to="/host/reservations" onClick={() => setNotifOpen(false)} className={NOTIF_ITEM}>
                      <span className={NOTIF_TILE} aria-hidden="true"><ClipboardList className="h-4 w-4" strokeWidth={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-navy">{t('host.bookingsToConfirm')}</span>
                        <span className="block text-[11px] text-muted">{t(pendingBookings === 1 ? 'host.bookingsAwaitingOne' : 'host.bookingsAwaitingOther', { count: pendingBookings })}</span>
                      </span>
                    </Link>}
                    {listingsNeedingAttention > 0 && <Link to="/host/listings" onClick={() => setNotifOpen(false)} className={NOTIF_ITEM}>
                      <span className={NOTIF_TILE} aria-hidden="true"><Building2 className="h-4 w-4" strokeWidth={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-navy">{t('host.listingNeedsAttention')}</span>
                        <span className="block text-[11px] text-muted">{t(listingsNeedingAttention === 1 ? 'host.listingDecisionOne' : 'host.listingDecisionOther', { count: listingsNeedingAttention })}</span>
                      </span>
                    </Link>}
                    {unreadGuestMessages > 0 && <Link to="/host/inbox" onClick={() => setNotifOpen(false)} className={NOTIF_ITEM}>
                      <span className={NOTIF_TILE} aria-hidden="true"><MessageCircleMore className="h-4 w-4" strokeWidth={2} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-xs font-semibold text-navy">{t('host.guestMessages')}</span>
                        <span className="block text-[11px] text-muted">{t(unreadGuestMessages === 1 ? 'host.unreadOne' : 'host.unreadOther', { count: unreadGuestMessages })}</span>
                      </span>
                    </Link>}
                  </>
                )}
              </div>}
            </div>

            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => { setMenuOpen((open) => !open); setNotifOpen(false); }}
                aria-haspopup="true"
                aria-expanded={menuOpen}
                aria-label={t('host.openAccountMenu')}
                className="inline-flex items-center gap-1 p-1 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <span aria-hidden="true" className="inline-flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-navy-bg text-[11px] font-bold tracking-wide text-white">
                  {user?.avatar ? <img src={user.avatar} alt="" className="h-full w-full object-cover" /> : hostInitials(user)}
                </span>
                <ChevronDown className={`h-3.5 w-3.5 text-muted transition-transform ${menuOpen ? 'rotate-180' : ''}`} aria-hidden="true" />
              </button>

              {menuOpen && <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl bg-elevated py-2 shadow-xl">
                <div className="border-b border-border px-4 py-3">
                  <p className="flex items-center gap-1.5 text-sm font-semibold text-navy">
                    <span className="min-w-0 truncate">{displayName}</span>
                    {isVerifiedHost && (
                      <span
                        className="inline-flex shrink-0 items-center gap-1 rounded-full bg-[#E7F6EE] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.06em] text-[#157347]"
                        title="Your host account is verified"
                      >
                        <BadgeCheck className="h-3 w-3" strokeWidth={2.4} aria-hidden="true" />
                        Verified
                      </span>
                    )}
                  </p>
                  <p className="truncate text-xs text-muted">{user?.email}</p>
                </div>

                <Link to="/host/settings" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <CircleUserRound className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  {t('host.menuMyProfile')}
                </Link>
                <Link to="/host/reservations" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <ClipboardList className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  {t('host.menuReservations')}
                </Link>
                <Link to="/host/inbox" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <MessagesSquare className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  <span className="flex-1">{t('host.guestMessages')}</span>
                  <UnreadBadge count={unreadGuestMessages} />
                </Link>
                <Link to="/host/discounts" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <Percent className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  {t('host.menuDiscounts')}
                </Link>
                {/* Payouts need an approved HOST account, so pending applicants are
                    not offered a destination they cannot use yet. */}
                {user?.role === 'HOST' && <Link to="/host/payouts" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <Wallet className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  {t('host.menuPayouts')}
                </Link>}
                <Link to="/help" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  {t('host.menuHelpCentre')}
                </Link>
                <Link to="/host/application" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <ClipboardList className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  {t('host.menuHostSetup')}
                </Link>
                <Link to="/terms" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <FileText className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  {t('host.menuTerms')}
                </Link>
                <Link to="/privacy" onClick={() => setMenuOpen(false)} className={ACCOUNT_ITEM}>
                  <LockKeyhole className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                  {t('host.menuPrivacy')}
                </Link>

                <div className="mt-1 border-t border-border pt-1">
                  {/* The switch lives here alone and names the side first, exactly
                      as the traveller menu does: the header changes shape with the
                      side, so this line is the one place the two cannot be
                      confused, and the transition overlay announces the change. */}
                  <p className={ACCOUNT_EYEBROW}>{t('host.browsingAsHost')}</p>
                  <button type="button" onClick={handleTravelling} className={ACCOUNT_ITEM}>
                    <ArrowLeftRight className={ACCOUNT_ICON} strokeWidth={2} aria-hidden="true" />
                    {t('host.switchToTravelling')}
                  </button>
                </div>

                <div className="mt-1 border-t border-border pt-1">
                  <button type="button" onClick={handleLogout} className={ACCOUNT_ITEM}>
                    <LogOut className="mr-3 h-4 w-4 text-red-600" strokeWidth={2} aria-hidden="true" />
                    <span className="text-red-600">{t('host.signOut')}</span>
                  </button>
                </div>
              </div>}
            </div>
          </div>
        </div>
      </header>

      {/* The floating bottom bar's clearance is reserved once, on <body>, via
          --zl-bottom-nav-space (see styles.css). Reserving it again here would
          double it and leave a dead band under the last card. */}
      <main className="mx-auto w-full max-w-7xl px-4 py-8 lg:px-6 lg:py-10">{children}</main>
      <HostMobileBottomNav />
    </div>
  );
}

HostLayout.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostLayout;
