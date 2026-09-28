import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Avatar, Button, Dropdown, DropdownDivider, DropdownItem, TextInput } from 'flowbite-react';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import apiClient from '../api/client.js';
import { playMessageSound, playBookingSound } from '../utils/notificationSound.js';
import logoImg from '../assets/zurilofts-logo.png';
import MobileBottomNav from './MobileBottomNav.jsx';
import RouteBackButton from './RouteBackButton.jsx';
import { languageOptions } from '../i18n/translations.js';

const exploreLinks = [
  { name: 'Stays', href: '/properties' },
  { name: 'Places to Visit', href: '/places' },
  { name: 'Restaurants', href: '/restaurants' },
  { name: 'Travel Guides', href: '/guides' },
];

const savedLinks = [
  { name: 'Favourites', href: '/favourites' },
  { name: 'Shortlists', href: '/shortlists' },
];

// Exact match, plus prefix match so nested routes (e.g. /guides/:slug,
// /host/calendar/:id, /inbox/:conversationId) still highlight their parent.
function isActiveHref(pathname, href) {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Navbar({ solid = false }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const navMenuRef = useRef(null);
  const searchRef = useRef(null);

  const { user, isAuthenticated, logout } = useAuth();
  const { mode, setMode, canSelectHosting } = useMode();
  const { setLang, t } = useLanguage();
  // Only an approved HOST account has verified host access. ADMINS are excluded
  // here (they administer the platform through /admin), so they get no Payouts
  // or other verified-host affordances.
  const hasVerifiedHostAccess = user?.role === 'HOST';
  // An applicant with an in-progress application (any status) can already use
  // the host workspace - draft listings, calendar, messages - even before
  // approval. Only Payouts and publishing require full verification.
  const hasHostIntent = hasVerifiedHostAccess || user?.hostApplicationStatus != null;
  // On the host workspace routes, always present the host navigation regardless
  // of the persisted travelling/hosting toggle: a host arriving on /host/* (via
  // login redirect, a bookmark, or a direct link) must see Today/Calendar/
  // Listings/Messages/Earnings, not the guest destinations (design2 section 4).
  // The stored mode still drives the account-menu switch action.
  const onHostRoute = location.pathname.startsWith('/host');
  const effectiveMode = onHostRoute && canSelectHosting ? 'hosting' : mode;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Poll unread message count + booking updates for badge + sound alerts
  const [bookingUpdates, setBookingUpdates] = useState(0);
  const [conversationUnread, setConversationUnread] = useState(0);
  const lastMsgRef = useRef(0);
  const lastBookingRef = useRef(0);
  // Booking updates are a rolling count of recent confirmed/cancelled bookings.
  // Persist how many the guest has already acknowledged so the badge doesn't
  // keep reappearing for the same updates after a reload.
  const seenBookingsRef = useRef(Number(localStorage.getItem('zuri_bk_seen') || 0));

  useEffect(() => {
    if (!isAuthenticated) { setUnreadMessages(0); setBookingUpdates(0); setConversationUnread(0); return; }
    let active = true;
    async function loadUnread() {
      try {
        // Use the combined notifications endpoint for guests too
        const r = await apiClient.get('/notifications');
        if (!active) return;
        const d = r.data.data || {};
        const msgCount = d.unreadMessages ?? 0;
        const bkCount = d.bookingUpdates ?? 0;

        // Play a sound only when a count actually increases between polls -
        // never on every tick just because a count is non-zero.
        if (msgCount > lastMsgRef.current) playMessageSound();
        if (bkCount > lastBookingRef.current) playBookingSound();
        lastMsgRef.current = msgCount;
        lastBookingRef.current = bkCount;

        // If the rolling count shrank (old bookings aged out), lower the
        // acknowledged baseline so genuinely new updates still show.
        if (bkCount < seenBookingsRef.current) {
          seenBookingsRef.current = bkCount;
          localStorage.setItem('zuri_bk_seen', String(bkCount));
        }

        setUnreadMessages(msgCount);
        setBookingUpdates(Math.max(0, bkCount - seenBookingsRef.current));
      } catch {
        // Fallback to legacy endpoint
        try {
          const r = await apiClient.get('/messages/unread-count');
          if (!active) return;
          const count = r.data.data?.count || 0;
          if (count > lastMsgRef.current) playMessageSound();
          lastMsgRef.current = count;
          setUnreadMessages(count);
        } catch (err) { console.error(err); }
      }

      // Reservation conversation unread count (separate from the support inbox)
      try {
        const r = await apiClient.get('/conversations/unread-count');
        if (!active) return;
        setConversationUnread(r.data.data?.count || 0);
      } catch (err) { console.error(err); }
    }
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    return () => { active = false; clearInterval(t); };
  }, [isAuthenticated]);

  // Guest acknowledges booking updates - clears the badge and remembers it.
  function acknowledgeBookings() {
    seenBookingsRef.current = lastBookingRef.current;
    localStorage.setItem('zuri_bk_seen', String(lastBookingRef.current));
    setBookingUpdates(0);
  }

  const totalNotif = unreadMessages + conversationUnread + bookingUpdates;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
      if (navMenuRef.current && !navMenuRef.current.contains(e.target)) {
        setOpenSubmenu(null);
      }
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setSearchOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Close all menus on Escape
  useEffect(() => {
    function handleKey(e) {
      if (e.key === 'Escape') {
        setDropdownOpen(false);
        setNotifOpen(false);
        setOpenSubmenu(null);
        setSearchOpen(false);
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  const isHomePage = location.pathname === '/';
  const needsWhiteNav = solid || !isHomePage || scrolled;

  function handleLogout() {
    setDropdownOpen(false);
    setMenuOpen(false);
    logout();
    navigate('/');
  }

  function handleSearchSubmit(event) {
    event.preventDefault();
    const query = searchQuery.trim();
    navigate(query ? `/properties?search=${encodeURIComponent(query)}` : '/properties');
    setSearchOpen(false);
    setSearchQuery('');
    setMenuOpen(false);
  }

  // Desktop guest navigation: Explore, Saved, Trips, Messages. Profile is the
  // avatar/account menu on the right, so it is intentionally not duplicated as
  // a nav link. Host navigation keeps Today/Calendar/Listings/Messages/Earnings,
  // with Payouts surfaced inside Earnings only for verified hosts. Logged-out
  // visitors see just Explore (the Sign In / Sign Up CTA sits on the right).
  // Each item keeps a stable `name` (used for badge/logic checks below) plus a
  // `key` into translations.js so the visible label follows the language switch.
  const navItems = (() => {
    if (!isAuthenticated) {
      return [
        { name: 'Stays', key: 'properties', href: '/properties' },
        { name: 'Places', key: 'places', href: '/places' },
        { name: 'Restaurants', key: 'restaurants', href: '/restaurants' },
        { name: 'Guides', key: 'guides', href: '/guides' },
      ];
    }
    if (effectiveMode === 'hosting') {
      if (!hasHostIntent) {
        return [{ name: 'Host Setup', key: 'hostSetup', href: '/host/application' }];
      }
      return [
        { name: 'Today', key: 'today', href: '/host/today' },
        { name: 'Calendar', key: 'calendar', href: '/host/calendar' },
        { name: 'Listings', key: 'listings', href: '/host/listings' },
        { name: 'Messages', key: 'messages', href: '/inbox' },
        { name: 'Earnings', key: 'earnings', href: '/host/earnings' },
      ];
    }
    return [
      { name: 'Stays', key: 'properties', href: '/properties' },
      { name: 'Places', key: 'places', href: '/places' },
      { name: 'Restaurants', key: 'restaurants', href: '/restaurants' },
      { name: 'Guides', key: 'guides', href: '/guides' },
    ];
  })();

  function handleSwitchMode() {
    const next = effectiveMode === 'hosting' ? 'travelling' : 'hosting';
    setMode(next);
    setDropdownOpen(false);
    setMenuOpen(false);
    setOpenSubmenu(null);
    navigate(next === 'hosting' ? (hasHostIntent ? '/host/today' : '/host/application') : '/');
  }

  const navItemClass = (isActive) =>
    `group relative flex items-center gap-1 rounded-[10px] px-3 py-2 text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-2 ${
      isActive
        ? 'text-[#C89B6D]'
        : needsWhiteNav
          ? 'text-[#0B1F42] hover:text-[#C49A6C]'
          : 'text-white hover:text-[#C49A6C]'
    }`;

  const underlineClass = (isActive) =>
    `absolute bottom-0 left-0 h-0.5 bg-[#C89B6D] transition-all duration-200 ${
      isActive ? 'w-full' : 'w-0 group-hover:w-full'
    }`;

  const chevronIcon = (open) => (
    <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  const badgeClass = 'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 ml-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full align-middle';

  const accountItemClass = 'flex items-center rounded-[10px] px-4 py-2.5 text-sm text-[#0B1F42] hover:bg-[#F7F4EF] transition-colors';

  return (
    <><nav className={`fixed w-full z-20 top-0 start-0 transition-all duration-300 ${
      needsWhiteNav
        ? 'border-b border-[#E3E8EF] bg-white shadow-[0_4px_16px_rgba(11,31,66,0.06)]'
        : 'bg-transparent'
    }`}>
      <div className="mx-auto w-full max-w-[1344px] px-4 md:px-6">
        <div className="flex h-16 items-center justify-between md:grid md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
          {/* Back action and logo */}
          <div className="flex min-w-0 items-center gap-2 justify-self-start">
            <RouteBackButton className={needsWhiteNav ? '' : 'bg-white/10 text-white hover:bg-white/20'} />
            <Link to="/" className="flex flex-shrink-0 items-center">
              <img src={logoImg} alt="ZuriLofts" className="h-9 w-auto md:h-10" />
            </Link>
          </div>

          {/* Desktop nav links */}
          <div ref={navMenuRef} className="hidden md:flex md:flex-1 md:justify-center md:items-center md:px-4">
            <ul className="flex items-center md:space-x-1 lg:space-x-6">
              {navItems.map((item) => {
                const hasChildren = Array.isArray(item.children) && item.children.length > 0;
                const submenuItems = hasChildren
                  ? (item.href ? [{ name: item.name, href: item.href }, ...item.children] : item.children)
                  : [];
                const isActive = hasChildren
                  ? submenuItems.some((child) => isActiveHref(location.pathname, child.href))
                  : isActiveHref(location.pathname, item.href);

                if (!hasChildren) {
                  return (
                    <li key={item.name}>
                      <Link
                        to={item.href}
                        onClick={() => setOpenSubmenu(null)}
                        className={navItemClass(isActive)}
                      >
                        {item.key ? t(`nav.${item.key}`) : item.name}
                        {item.name === 'Messages' && conversationUnread > 0 && (
                          <span className={badgeClass}>
                            {conversationUnread > 9 ? '9+' : conversationUnread}
                          </span>
                        )}
                        <span className={underlineClass(isActive)} />
                      </Link>
                    </li>
                  );
                }

                const open = openSubmenu === item.name;
                return (
                  <li key={item.name} className="relative">
                    <button
                      type="button"
                      onClick={() => setOpenSubmenu(open ? null : item.name)}
                      aria-haspopup="true"
                      aria-expanded={open}
                      className={navItemClass(isActive)}
                    >
                      {item.name}
                      {chevronIcon(open)}
                      <span className={underlineClass(isActive)} />
                    </button>
                    {open && (
                      <div className="absolute left-0 top-full z-30 mt-2 w-56 rounded-2xl border border-[#E3E8EF] bg-white py-2 shadow-[0_8px_28px_rgba(11,31,66,0.14)]">
                        {submenuItems.map((child) => {
                          const childActive = isActiveHref(location.pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              to={child.href}
                              onClick={() => setOpenSubmenu(null)}
                              className={`flex items-center px-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C49A6C] ${
                                childActive
                                  ? 'text-[#9A744A] bg-[#FDE8D8] font-semibold'
                                  : 'text-[#0B1F42] hover:bg-[#F7F4EF] hover:text-[#9A744A]'
                              }`}
                            >
                              {child.name}
                            </Link>
                          );
                        })}
                      </div>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Right side: search, account menu and mobile menu */}
          <div className="flex items-center gap-1 justify-self-end md:gap-2">
            <div className="relative" ref={searchRef}>
              <button
                type="button"
                onClick={() => {
                  setSearchOpen((open) => !open);
                  setDropdownOpen(false);
                  setNotifOpen(false);
                }}
                aria-expanded={searchOpen}
                aria-controls="navbar-search"
                aria-label="Search stays"
                title="Search stays"
                className={`grid h-10 w-10 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-2 ${
                  needsWhiteNav ? 'text-[#0B1F42] hover:bg-[#F6EFE7]' : 'text-white hover:bg-white/10'
                }`}
              >
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
              {searchOpen && (
                <form
                  id="navbar-search"
                  role="search"
                  onSubmit={handleSearchSubmit}
                  className="absolute right-0 top-full z-30 mt-2 flex w-[min(340px,calc(100vw-2rem))] items-center gap-2 rounded-2xl border border-[#E3E8EF] bg-white p-2 shadow-[0_16px_40px_rgba(11,31,66,0.16)]"
                >
                  <TextInput
                    value={searchQuery}
                    onChange={(event) => setSearchQuery(event.target.value)}
                    placeholder="Where do you want to stay?"
                    aria-label="Search destination"
                    sizing="sm"
                    className="min-w-0 flex-1"
                    autoFocus
                  />
                  <Button type="submit" size="sm" className="shrink-0 bg-[#C49A6C] text-white enabled:hover:bg-[#B8895C]">
                    Search
                  </Button>
                </form>
              )}
            </div>

            {isAuthenticated ? (
              <>
                {/* Notification bell with dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen((o) => !o)}
                    aria-haspopup="true"
                    aria-expanded={notifOpen}
                    aria-label="Notifications"
                    className={`rounded-full p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-2 ${
                      needsWhiteNav ? 'text-[#0B1F42] hover:bg-[#F7F4EF]' : 'text-white hover:bg-white/10'
                    }`}
                    title="Notifications"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                    </svg>
                  </button>
                  {totalNotif > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                      {totalNotif > 9 ? '9+' : totalNotif}
                    </span>
                  )}
                  {notifOpen && (
                    <div className="absolute right-0 z-30 mt-2 w-64 rounded-2xl border border-[#E3E8EF] bg-white py-2 shadow-[0_8px_28px_rgba(11,31,66,0.14)]">
                      <div className="border-b border-[#E3E8EF] px-4 py-2">
                        <p className="text-sm font-semibold text-[#0B1F42]">Notifications</p>
                      </div>
                      {totalNotif === 0 ? (
                        <p className="px-4 py-6 text-center text-sm text-[#5B6B82]">No new notifications</p>
                      ) : (
                        <>
                          {unreadMessages > 0 && (
                            <Link
                              to="/messages"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center px-4 py-3 text-sm text-[#0B1F42] hover:bg-[#F6EFE7] transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#F6EFE7] flex items-center justify-center mr-3 flex-shrink-0">
                                <svg className="w-4 h-4 text-[#9A744A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#0B1F42] text-xs">New support message</p>
                                <p className="text-[#5B6B82] text-[11px]">You have {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}</p>
                              </div>
                            </Link>
                          )}
                          {conversationUnread > 0 && (
                            <Link
                              to="/inbox"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center px-4 py-3 text-sm text-[#0B1F42] hover:bg-[#F6EFE7] transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#F6EFE7] flex items-center justify-center mr-3 flex-shrink-0">
                                <svg className="w-4 h-4 text-[#9A744A]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#0B1F42] text-xs">New message</p>
                                <p className="text-[#5B6B82] text-[11px]">{conversationUnread} unread message{conversationUnread > 1 ? 's' : ''}</p>
                              </div>
                            </Link>
                          )}
                          {bookingUpdates > 0 && (
                            <Link
                              to="/profile#bookings"
                              onClick={() => { setNotifOpen(false); acknowledgeBookings(); }}
                              className="flex items-center px-4 py-3 text-sm text-[#0B1F42] hover:bg-[#F6EFE7] transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#0B1F42] text-xs">Booking Updates</p>
                                <p className="text-[#5B6B82] text-[11px]">{bookingUpdates} recent booking update{bookingUpdates > 1 ? 's' : ''}</p>
                              </div>
                            </Link>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>

                {/* Account / Profile menu */}
                <div className="relative" ref={dropdownRef}>
                  <button
                    onClick={() => { setMenuOpen(false); setDropdownOpen((open) => !open); }}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                    aria-label="Open menu"
                    className="flex items-center space-x-2 px-2 py-2 rounded-full hover:bg-[#F6EFE7] transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-2"
                  >
                    <div className="relative w-8 h-8 bg-[#C49A6C] rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                      )}
                    </div>
                    <span className={`hidden md:block text-sm font-semibold ${needsWhiteNav ? 'text-[#0B1F42]' : 'text-white'}`}>
                      {user?.firstName}
                    </span>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl py-2 z-30 border border-[#E3E8EF]">
                      <div className="px-4 py-3 border-b border-[#E3E8EF]">
                        <p className="text-sm font-semibold text-[#0B1F42]">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-[#5B6B82]">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile#info"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        {t('nav.myProfile')}
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="flex-1">{t('nav.contactSupport')}</span>
                        {unreadMessages > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {unreadMessages > 9 ? '9+' : unreadMessages}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/inbox"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                        <span className="flex-1">{t('nav.messages')}</span>
                        {conversationUnread > 0 && (
                          <span className="min-w-[18px] h-[18px] px-1 bg-red-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {conversationUnread > 9 ? '9+' : conversationUnread}
                          </span>
                        )}
                      </Link>
                      <Link
                        to="/bookings"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        {t('nav.bookingHistory')}
                      </Link>
                      <Link
                        to="/favourites"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        {t('nav.favourites')}
                      </Link>
                      {user?.role !== 'HOST' && (
                        <Link
                          to="/host/application"
                          onClick={() => setDropdownOpen(false)}
                          className={accountItemClass}
                        >
                          <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 10h.01M15 10h.01" />
                          </svg>
                          {t('nav.becomeHost')}
                        </Link>
                      )}
                      <Link
                        to="/terms"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        {t('nav.termsOfService')}
                      </Link>
                      <Link
                        to="/privacy"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        {t('nav.privacyPolicy')}
                      </Link>
                      {(user?.role === 'ADMIN' || user?.role === 'HOST') && (
                        <Link
                          to={user?.role === 'ADMIN' ? '/admin' : '/host/today'}
                          onClick={() => setDropdownOpen(false)}
                          className={accountItemClass}
                        >
                          <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {user?.role === 'ADMIN' ? t('nav.adminPanel') : t('nav.hostDashboard')}
                        </Link>
                      )}
                      {canSelectHosting && (
                        <div className="border-t border-[#E3E8EF] mt-1 pt-1">
                          <button
                            onClick={handleSwitchMode}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-[#0B1F42] hover:bg-[#F6EFE7] transition-colors"
                          >
                            <svg className="w-4 h-4 mr-3 text-[#5B6B82]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            {effectiveMode === 'hosting' ? t('nav.switchToTravelling') : t('nav.switchToHosting')}
                          </button>
                        </div>
                      )}
                      <div className="border-t border-[#E3E8EF] mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          {t('nav.signOut')}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              <Dropdown
                inline
                theme={{ inlineWrapper: 'zl-header-avatar-button' }}
                label={<><span className="sr-only">Open account menu</span><Avatar placeholderInitials="?" rounded size="sm" className="zl-header-avatar" /></>}
                arrowIcon={false}
                placement="bottom-end"
                aria-label="Open account menu"
              >
                <DropdownItem onClick={() => navigate('/login')}>{t('nav.signIn')}</DropdownItem>
                <DropdownItem onClick={() => navigate('/register')}>{t('nav.createAccount')}</DropdownItem>
                <DropdownDivider />
                <DropdownItem onClick={() => navigate('/register?role=HOST')}>{t('nav.becomeHost')}</DropdownItem>
              </Dropdown>
            )}

            {/* Language switcher */}
            <Dropdown
              inline
              theme={{ inlineWrapper: `zl-header-icon-button ${needsWhiteNav ? '' : 'text-white'}` }}
              label={<><span className="sr-only">{t('nav.language')}</span><span className={`zl-header-action-icon ${needsWhiteNav ? '' : 'text-white'}`} aria-hidden="true"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.45 3.3 5.45 3.3 9S14.2 18.55 12 21c-2.2-2.45-3.3-5.45-3.3-9S9.8 5.45 12 3z" /></svg></span></>}
              arrowIcon={false}
              placement="bottom-end"
              aria-label={t('nav.language')}
            >
              {languageOptions.map((option) => <DropdownItem key={option.value} onClick={() => setLang(option.value)}>{option.label}</DropdownItem>)}
            </Dropdown>

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className={`inline-flex h-11 w-11 items-center justify-center rounded-[10px] p-2 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-2 md:hidden ${
                needsWhiteNav
                  ? 'text-[#0B1F42] hover:bg-[#F6EFE7]'
                  : 'text-white hover:bg-white/10'
              }`}
              aria-controls="navbar-main"
              aria-expanded={menuOpen}
              aria-label="Toggle navigation menu"
            >
              <span className="sr-only">Open main menu</span>
              {menuOpen ? (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              ) : (
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                </svg>
              )}
            </button>
          </div>
        </div>

        {/* Secondary navigation drawer */}
        {menuOpen && (
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setMenuOpen(false)}
            className="fixed inset-0 top-16 z-10 bg-black/20"
          />
        )}
        <div
          id="navbar-main"
          role="dialog"
          aria-modal="true"
          aria-label="Account and navigation menu"
          className={`fixed left-1/2 top-20 z-30 w-[calc(100%-2rem)] max-w-md max-h-[calc(100dvh-6rem)] -translate-x-1/2 overflow-y-auto rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_20px_60px_rgba(11,31,66,0.2)] transition-all duration-200 ${menuOpen ? 'translate-y-0 opacity-100' : '-translate-y-3 pointer-events-none opacity-0'}`}
        >
          <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[#E3E8EF] bg-white px-4 py-3">
            <div className="flex items-center gap-3 min-w-0">
              {isAuthenticated ? (
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[#C49A6C] text-sm font-bold text-white">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                </div>
              ) : (
                <div className="h-9 w-9 shrink-0 rounded-full bg-[#F7F4EF]" aria-hidden="true" />
              )}
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-[#0B1F42]">{isAuthenticated ? user?.firstName : 'Explore ZuriLofts'}</p>
                <p className="truncate text-xs text-[#5B6B82]">{isAuthenticated ? user?.email : 'Find your next stay'}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              aria-label="Close menu"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[#0B1F42] transition hover:bg-[#F7F4EF] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <ul className="px-2 py-3 space-y-1 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain">
            {navItems.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              if (hasChildren) {
                const children = item.href ? [{ name: item.name, href: item.href }, ...item.children] : item.children;
                return (
                  <li key={item.name} className="pt-1 md:hidden">
                    <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5B6B82]">{item.name}</p>
                    <ul className="space-y-1">
                      {children.map((child) => (
                        <li key={child.href}>
                          <Link
                            to={child.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center min-h-[44px] px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C49A6C] ${
                              isActiveHref(location.pathname, child.href)
                                ? 'text-[#9A744A] bg-[#F6EFE7]'
                                : 'text-[#0B1F42] hover:bg-[#F6EFE7] hover:text-[#9A744A]'
                            }`}
                          >
                            {child.name}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </li>
                );
              }
              return (
                <li key={item.name} className="md:hidden">
                  <Link
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between min-h-[44px] px-3 py-2.5 rounded-[10px] text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#C49A6C] ${
                      isActiveHref(location.pathname, item.href)
                        ? 'text-[#9A744A] bg-[#F6EFE7]'
                        : 'text-[#0B1F42] hover:bg-[#F6EFE7] hover:text-[#9A744A]'
                    }`}
                  >
                    <span>{item.key ? t(`nav.${item.key}`) : item.name}</span>
                    {item.name === 'Messages' && conversationUnread > 0 && (
                      <span className={badgeClass}>
                        {conversationUnread > 9 ? '9+' : conversationUnread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}

            <li className="mt-3 border-t border-[#E3E8EF] pt-3">
              <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#5B6B82]">{t('nav.moreToExplore')}</p>
              <div className="space-y-1">
                {exploreLinks.filter((link) => link.href !== '/properties').map((link) => (
                  <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className="flex min-h-[44px] items-center rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#0B1F42] hover:bg-[#F6EFE7] hover:text-[#9A744A]">
                    {link.name}
                  </Link>
                ))}
                {savedLinks.map((link) => (
                  <Link key={link.href} to={link.href} onClick={() => setMenuOpen(false)} className="flex min-h-[44px] items-center rounded-[10px] px-3 py-2.5 text-sm font-medium text-[#0B1F42] hover:bg-[#F6EFE7] hover:text-[#9A744A]">
                    {link.name}
                  </Link>
                ))}
              </div>
            </li>

            {/* Mobile CTA buttons */}
            <li className="pt-3 space-y-2 border-t border-[#E3E8EF] mt-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile#info"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.myProfile')}
                  </Link>
                  <Link
                    to="/bookings"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-[10px] font-semibold border border-[#E3E8EF] text-[#0B1F42] hover:bg-[#F7F4EF] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.bookingHistory')}
                  </Link>
                  {user?.role !== 'HOST' && (
                    <Link
                      to="/host/application"
                      className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-[10px] font-semibold border border-[#E3E8EF] text-[#0B1F42] hover:bg-[#F7F4EF] transition-colors duration-200 text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      {t('nav.becomeHost')}
                    </Link>
                  )}
                  <Link
                    to="/terms"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-[10px] font-semibold border border-[#E3E8EF] text-[#0B1F42] hover:bg-[#F7F4EF] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.termsOfService')}
                  </Link>
                  <Link
                    to="/privacy"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-[10px] font-semibold border border-[#E3E8EF] text-[#0B1F42] hover:bg-[#F7F4EF] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.privacyPolicy')}
                  </Link>
                  {(user?.role === 'ADMIN' || user?.role === 'HOST') && (
                    <Link
                      to={user?.role === 'ADMIN' ? '/admin' : '/host/today'}
                      className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-colors duration-200 text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      {user?.role === 'ADMIN' ? t('nav.adminPanel') : t('nav.hostDashboard')}
                    </Link>
                  )}
                  {canSelectHosting && (
                    <button
                      onClick={handleSwitchMode}
                      className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-[10px] font-semibold text-[#9A744A] hover:bg-[#F6EFE7] transition-colors duration-200 text-center"
                    >
                      {effectiveMode === 'hosting' ? t('nav.switchToTravelling') : t('nav.switchToHosting')}
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold text-red-600 hover:bg-red-50 transition-colors duration-200 text-center border border-red-200"
                  >
                    {t('nav.signOut')}
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold bg-[#C49A6C] text-white hover:bg-[#B8895C] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.signIn')}
                  </Link>
                  <Link
                    to="/register"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#C49A6C] text-[#0B1F42] hover:bg-[#F7F4EF] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.createAccount')}
                  </Link>
                  <Link
                    to="/terms"
                      className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-[10px] font-semibold border border-[#E3E8EF] text-[#0B1F42] hover:bg-[#F7F4EF] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.termsOfService')}
                  </Link>
                  <Link
                    to="/privacy"
                      className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-[10px] font-semibold border border-[#E3E8EF] text-[#0B1F42] hover:bg-[#F7F4EF] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    {t('nav.privacyPolicy')}
                  </Link>
                </>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav><MobileBottomNav /></>
  );
}

export default Navbar;
