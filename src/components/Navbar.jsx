import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useMode } from '../context/ModeContext.jsx';
import apiClient from '../api/client.js';
import { playMessageSound, playBookingSound } from '../utils/notificationSound.js';
import logoImg from '../assets/zurilofts-logo.png';

const exploreLinks = [
  { name: 'Properties', href: '/properties' },
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

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [openSubmenu, setOpenSubmenu] = useState(null);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);
  const navMenuRef = useRef(null);

  const { user, isAuthenticated, logout } = useAuth();
  const { mode, setMode, canSelectHosting } = useMode();
  const hasVerifiedHostAccess = user?.role === 'HOST' || user?.role === 'ADMIN';
  // An applicant with an in-progress application (any status) can already use
  // the host workspace - draft listings, calendar, messages - even before
  // approval. Only Payouts and publishing require full verification.
  const hasHostIntent = hasVerifiedHostAccess || user?.hostApplicationStatus != null;
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [notifOpen, setNotifOpen] = useState(false);
  const notifRef = useRef(null);

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
        setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, []);

  function handleLogout() {
    setDropdownOpen(false);
    setMenuOpen(false);
    logout();
    navigate('/');
  }

  // Desktop guest navigation: Explore, Saved, Trips, Messages. Profile is the
  // avatar/account menu on the right, so it is intentionally not duplicated as
  // a nav link. Host navigation keeps Today/Calendar/Listings/Messages/Earnings,
  // with Payouts surfaced inside Earnings only for verified hosts. Logged-out
  // visitors see just Explore (the Sign In / Sign Up CTA sits on the right).
  const navItems = (() => {
    if (!isAuthenticated) {
      return [{ name: 'Explore', children: exploreLinks }];
    }
    if (mode === 'hosting') {
      if (!hasHostIntent) {
        return [{ name: 'Host Setup', href: '/host/application' }];
      }
      const items = [
        { name: 'Today', href: '/host/today' },
        { name: 'Calendar', href: '/host/calendar' },
        { name: 'Listings', href: '/host/listings' },
        { name: 'Messages', href: '/inbox' },
        { name: 'Earnings', href: '/host/earnings' },
      ];
      if (hasVerifiedHostAccess) {
        items.push({ name: 'Payouts', href: '/host/payouts' });
      }
      return items;
    }
    return [
      { name: 'Explore', children: exploreLinks },
      { name: 'Saved', children: savedLinks },
      { name: 'Trips', href: '/trips' },
      { name: 'Messages', href: '/inbox' },
    ];
  })();

  function handleSwitchMode() {
    const next = mode === 'hosting' ? 'travelling' : 'hosting';
    setMode(next);
    setDropdownOpen(false);
    setMenuOpen(false);
    setOpenSubmenu(null);
    navigate(next === 'hosting' ? (hasHostIntent ? '/host/today' : '/host/application') : '/');
  }

  const navItemClass = (isActive) =>
    `group relative flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 ${
      isActive
        ? 'text-[#2563EB]'
        : 'text-[#222222] hover:text-[#2563EB]'
    }`;

  const underlineClass = (isActive) =>
    `absolute bottom-0 left-0 h-0.5 bg-[#2563EB] transition-all duration-200 ${
      isActive ? 'w-full' : 'w-0 group-hover:w-full'
    }`;

  const chevronIcon = (open) => (
    <svg className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  );

  const badgeClass = 'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 ml-1.5 bg-red-600 text-white text-[10px] font-bold rounded-full align-middle';

  const accountItemClass = 'flex items-center px-4 py-2.5 text-sm text-[#222222] hover:bg-[#2563EB]/10 transition-colors';

  return (
    <nav className="fixed w-full z-20 top-0 start-0 transition-all duration-300 bg-white border-b border-[#E5E7EB] shadow-sm">
      <div className="max-w-screen-xl mx-auto px-4 md:px-6">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img src={logoImg} alt="ZuriLofts" className="h-10 w-auto" />
          </Link>

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
                        {item.name}
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
                      <div className="absolute left-0 top-full mt-2 w-56 bg-white rounded-2xl shadow-xl py-2 z-30 border border-[#E5E7EB]">
                        {submenuItems.map((child) => {
                          const childActive = isActiveHref(location.pathname, child.href);
                          return (
                            <Link
                              key={child.href}
                              to={child.href}
                              onClick={() => setOpenSubmenu(null)}
                              className={`flex items-center px-4 py-2.5 text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB] ${
                                childActive
                                  ? 'text-[#2563EB] bg-[#2563EB]/5 font-semibold'
                                  : 'text-[#222222] hover:bg-[#2563EB]/10 hover:text-[#2563EB]'
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

          {/* Right side: CTA buttons / user menu + hamburger */}
          <div className="flex items-center gap-1 md:gap-2">
            {isAuthenticated ? (
              <>
                {/* Notification bell with dropdown */}
                <div className="relative" ref={notifRef}>
                  <button
                    onClick={() => setNotifOpen((o) => !o)}
                    aria-haspopup="true"
                    aria-expanded={notifOpen}
                    aria-label="Notifications"
                    className="p-2 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 text-[#222222] hover:bg-[#2563EB]/10"
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
                    <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl py-2 z-30 border border-[#E5E7EB]">
                      <div className="px-4 py-2 border-b border-[#E5E7EB]">
                        <p className="text-sm font-semibold text-[#222222]">Notifications</p>
                      </div>
                      {totalNotif === 0 ? (
                        <p className="px-4 py-6 text-sm text-[#6b7280] text-center">No new notifications</p>
                      ) : (
                        <>
                          {unreadMessages > 0 && (
                            <Link
                              to="/messages"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center px-4 py-3 text-sm text-[#222222] hover:bg-[#2563EB]/10 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 flex items-center justify-center mr-3 flex-shrink-0">
                                <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#222222] text-xs">New support message</p>
                                <p className="text-[#6b7280] text-[11px]">You have {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}</p>
                              </div>
                            </Link>
                          )}
                          {conversationUnread > 0 && (
                            <Link
                              to="/inbox"
                              onClick={() => setNotifOpen(false)}
                              className="flex items-center px-4 py-3 text-sm text-[#222222] hover:bg-[#2563EB]/10 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-[#2563EB]/10 flex items-center justify-center mr-3 flex-shrink-0">
                                <svg className="w-4 h-4 text-[#2563EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#222222] text-xs">New message</p>
                                <p className="text-[#6b7280] text-[11px]">{conversationUnread} unread message{conversationUnread > 1 ? 's' : ''}</p>
                              </div>
                            </Link>
                          )}
                          {bookingUpdates > 0 && (
                            <Link
                              to="/profile#bookings"
                              onClick={() => { setNotifOpen(false); acknowledgeBookings(); }}
                              className="flex items-center px-4 py-3 text-sm text-[#222222] hover:bg-[#2563EB]/10 transition-colors"
                            >
                              <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                                <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium text-[#222222] text-xs">Booking Updates</p>
                                <p className="text-[#6b7280] text-[11px]">{bookingUpdates} recent booking update{bookingUpdates > 1 ? 's' : ''}</p>
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
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    aria-haspopup="true"
                    aria-expanded={dropdownOpen}
                    aria-label="Account menu"
                    className="flex items-center space-x-2 px-2 py-2 rounded-full hover:bg-[#2563EB]/10 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
                  >
                    <div className="relative w-8 h-8 bg-[#C49A6C] rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                      {user?.avatar ? (
                        <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                      )}
                    </div>
                    <span className="hidden md:block text-sm font-semibold text-[#222222]">
                      {user?.firstName}
                    </span>
                    <svg className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''} text-[#222222]`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {dropdownOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl py-2 z-30 border border-[#E5E7EB]">
                      <div className="px-4 py-3 border-b border-[#E5E7EB]">
                        <p className="text-sm font-semibold text-[#222222]">{user?.firstName} {user?.lastName}</p>
                        <p className="text-xs text-[#6b7280]">{user?.email}</p>
                      </div>
                      <Link
                        to="/profile#info"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                        </svg>
                        My Profile
                      </Link>
                      <Link
                        to="/messages"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                        </svg>
                        <span className="flex-1">Contact Support</span>
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
                        <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8h2a2 2 0 012 2v6a2 2 0 01-2 2h-2v4l-4-4H9a1.994 1.994 0 01-1.414-.586m0 0L11 14h4a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2v4l.586-.586z" />
                        </svg>
                        <span className="flex-1">Messages</span>
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
                        <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                        </svg>
                        Booking History
                      </Link>
                      <Link
                        to="/favourites"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Favourites
                      </Link>
                      <Link
                        to="/terms"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        Terms of Service
                      </Link>
                      <Link
                        to="/privacy"
                        onClick={() => setDropdownOpen(false)}
                        className={accountItemClass}
                      >
                        <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                        </svg>
                        Privacy Policy
                      </Link>
                      {(user?.role === 'ADMIN' || user?.role === 'HOST') && (
                        <Link
                          to={user?.role === 'ADMIN' ? '/admin' : '/host/today'}
                          onClick={() => setDropdownOpen(false)}
                          className={accountItemClass}
                        >
                          <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          {user?.role === 'ADMIN' ? 'Admin Panel' : 'Host Dashboard'}
                        </Link>
                      )}
                      {canSelectHosting && (
                        <div className="border-t border-[#E5E7EB] mt-1 pt-1">
                          <button
                            onClick={handleSwitchMode}
                            className="flex items-center w-full px-4 py-2.5 text-sm text-[#222222] hover:bg-[#2563EB]/10 transition-colors"
                          >
                            <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                            </svg>
                            {mode === 'hosting' ? 'Switch to Travelling' : 'Switch to Hosting'}
                          </button>
                        </div>
                      )}
                      <div className="border-t border-[#E5E7EB] mt-1 pt-1">
                        <button
                          onClick={handleLogout}
                          className="flex items-center w-full px-4 py-2.5 text-sm text-red-600 hover:bg-red-50 transition-colors"
                        >
                          <svg className="w-4 h-4 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                          </svg>
                          Sign Out
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </>
            ) : (
              /* Logged out - Sign In / Sign Up */
              <Link
                to="/login"
                className="hidden md:inline-flex items-center justify-center px-5 py-2 rounded-lg text-sm font-semibold transition-all duration-200 whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 bg-[#2563EB] text-white hover:bg-[#1D4ED8]"
              >
                Sign In / Sign Up
              </Link>
            )}

            {/* Hamburger */}
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="inline-flex items-center p-2 w-11 h-11 justify-center rounded-lg md:hidden transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 text-[#222222] hover:bg-[#2563EB]/10"
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

        {/* Mobile menu - full-width dropdown below the bar */}
        <div
          id="navbar-main"
          className={`md:hidden ${menuOpen ? 'block' : 'hidden'} bg-white border-t border-[#E5E7EB]`}
        >
          <ul className="px-2 py-3 space-y-1 max-h-[calc(100dvh-5rem)] overflow-y-auto overscroll-contain">
            {navItems.map((item) => {
              const hasChildren = Array.isArray(item.children) && item.children.length > 0;
              if (hasChildren) {
                const children = item.href ? [{ name: item.name, href: item.href }, ...item.children] : item.children;
                return (
                  <li key={item.name} className="pt-1">
                    <p className="px-3 py-1 text-[11px] font-bold uppercase tracking-[0.12em] text-[#6b7280]">{item.name}</p>
                    <ul className="space-y-1">
                      {children.map((child) => (
                        <li key={child.href}>
                          <Link
                            to={child.href}
                            onClick={() => setMenuOpen(false)}
                            className={`flex items-center min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB] ${
                              isActiveHref(location.pathname, child.href)
                                ? 'text-[#2563EB] bg-[#2563EB]/5'
                                : 'text-[#222222] hover:bg-[#2563EB]/10 hover:text-[#2563EB]'
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
                <li key={item.name}>
                  <Link
                    to={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={`flex items-center justify-between min-h-[44px] px-3 py-2.5 rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB] ${
                      isActiveHref(location.pathname, item.href)
                        ? 'text-[#2563EB] bg-[#2563EB]/5'
                        : 'text-[#222222] hover:bg-[#2563EB]/10 hover:text-[#2563EB]'
                    }`}
                  >
                    <span>{item.name}</span>
                    {item.name === 'Messages' && conversationUnread > 0 && (
                      <span className={badgeClass}>
                        {conversationUnread > 9 ? '9+' : conversationUnread}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}

            {/* Mobile CTA buttons */}
            <li className="pt-3 space-y-2 border-t border-[#E5E7EB] mt-3">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile#info"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/bookings"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Booking History
                  </Link>
                  <Link
                    to="/favourites"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Favourites
                  </Link>
                  <Link
                    to="/messages"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Contact Support{unreadMessages > 0 ? ` (${unreadMessages})` : ''}
                  </Link>
                  <Link
                    to="/inbox"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Messages{conversationUnread > 0 ? ` (${conversationUnread})` : ''}
                  </Link>
                  <Link
                    to="/terms"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Terms of Service
                  </Link>
                  <Link
                    to="/privacy"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Privacy Policy
                  </Link>
                  {(user?.role === 'ADMIN' || user?.role === 'HOST') && (
                    <Link
                      to={user?.role === 'ADMIN' ? '/admin' : '/host/today'}
                      className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors duration-200 text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      {user?.role === 'ADMIN' ? 'Admin Panel' : 'Host Dashboard'}
                    </Link>
                  )}
                  {canSelectHosting && (
                    <button
                      onClick={handleSwitchMode}
                      className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold text-[#2563EB] hover:bg-[#2563EB]/10 transition-colors duration-200 text-center"
                    >
                      {mode === 'hosting' ? 'Switch to Travelling' : 'Switch to Hosting'}
                    </button>
                  )}
                  <button
                    onClick={handleLogout}
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold text-red-600 hover:bg-red-50 transition-colors duration-200 text-center border border-red-200"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold bg-[#2563EB] text-white hover:bg-[#1D4ED8] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In / Sign Up
                  </Link>
                  <Link
                    to="/terms"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Terms of Service
                  </Link>
                  <Link
                    to="/privacy"
                    className="flex items-center justify-center w-full min-h-[44px] px-4 rounded-lg font-semibold border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] transition-colors duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Privacy Policy
                  </Link>
                </>
              )}
            </li>
          </ul>
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
