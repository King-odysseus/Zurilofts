import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { playMessageSound, playBookingSound } from '../utils/notificationSound.js';
import logoImg from '../assets/zurilofts-logo.png';

const navLinks = [
  { name: 'Home',       href: '/' },
  { name: 'Properties', href: '/properties' },
  { name: 'Contact',    href: '/contact' },
];

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();
  const dropdownRef = useRef(null);

  const { user, isAuthenticated, logout } = useAuth();
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
  const lastMsgRef = useRef(0);
  const lastBookingRef = useRef(0);
  // Booking updates are a rolling count of recent confirmed/cancelled bookings.
  // Persist how many the guest has already acknowledged so the badge doesn't
  // keep reappearing for the same updates after a reload.
  const seenBookingsRef = useRef(Number(localStorage.getItem('zuri_bk_seen') || 0));

  useEffect(() => {
    if (!isAuthenticated) { setUnreadMessages(0); setBookingUpdates(0); return; }
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
        } catch { /* ignore */ }
      }
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

  const totalNotif = unreadMessages + bookingUpdates;

  // Close dropdowns on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isHomePage = location.pathname === '/';
  const needsWhiteNav = !isHomePage || scrolled;

  function handleLogout() {
    setDropdownOpen(false);
    setMenuOpen(false);
    logout();
    navigate('/');
  }

  return (
    <nav className={`fixed w-full z-20 top-0 start-0 border-b transition-all duration-300 ${
      needsWhiteNav
        ? 'bg-white border-[#D9D9D9] shadow-sm'
        : 'bg-transparent border-transparent'
    }`}>
      <div className="max-w-screen-xl flex flex-wrap items-center mx-auto p-4">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 rtl:space-x-reverse md:flex-1 flex-shrink-0">
          <img src={logoImg} alt="ZuriLofts" className="h-12 w-auto" />
        </Link>

        {/* Right side: CTA buttons / user menu + hamburger */}
        <div className="flex items-center space-x-2 rtl:space-x-reverse ml-auto md:ml-0 md:flex-1 md:justify-end md:order-3">
          {isAuthenticated ? (
            /* Authenticated - Bell + User dropdown */
            <>
              {/* Notification bell with dropdown */}
              <div className="relative" ref={notifRef}>
                <button
                  onClick={() => setNotifOpen((o) => !o)}
                  className={`p-2 rounded-full transition-colors ${needsWhiteNav ? 'text-[#0B0B45] hover:bg-[#D9D9D9]/40' : 'text-white hover:bg-white/10'}`}
                  title="Notifications"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                  </svg>
                </button>
                {totalNotif > 0 && (
                  <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                    {totalNotif > 9 ? '9+' : totalNotif}
                  </span>
                )}
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-lg border border-[#D9D9D9] py-2 z-30">
                    <div className="px-4 py-2 border-b border-[#D9D9D9]">
                      <p className="text-sm font-semibold text-[#0B0B45]">Notifications</p>
                    </div>
                    {totalNotif === 0 ? (
                      <p className="px-4 py-6 text-sm text-[#6b7280] text-center">No new notifications</p>
                    ) : (
                      <>
                        {unreadMessages > 0 && (
                          <Link
                            to="/messages"
                            onClick={() => setNotifOpen(false)}
                            className="flex items-center px-4 py-3 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-[#C49A6C]/10 flex items-center justify-center mr-3 flex-shrink-0">
                              <svg className="w-4 h-4 text-[#C49A6C]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#0B0B45] text-xs">New Messages</p>
                              <p className="text-[#6b7280] text-[11px]">You have {unreadMessages} unread message{unreadMessages > 1 ? 's' : ''}</p>
                            </div>
                          </Link>
                        )}
                        {bookingUpdates > 0 && (
                          <Link
                            to="/profile#bookings"
                            onClick={() => { setNotifOpen(false); acknowledgeBookings(); }}
                            className="flex items-center px-4 py-3 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
                          >
                            <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center mr-3 flex-shrink-0">
                              <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-[#0B0B45] text-xs">Booking Updates</p>
                              <p className="text-[#6b7280] text-[11px]">{bookingUpdates} recent booking update{bookingUpdates > 1 ? 's' : ''}</p>
                            </div>
                          </Link>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
              <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-[#D9D9D9]/30 transition-all duration-200"
              >
                <div className="relative w-8 h-8 bg-[#C49A6C] rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
                  )}
                </div>
                <span className={`hidden md:block text-sm font-semibold ${needsWhiteNav ? 'text-[#0B0B45]' : 'text-white'}`}>
                  {user?.firstName}
                </span>
                <svg className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''} ${needsWhiteNav ? 'text-[#0B0B45]' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#D9D9D9] py-2 z-30">
                  <div className="px-4 py-3 border-b border-[#D9D9D9]">
                    <p className="text-sm font-semibold text-[#0B0B45]">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-[#6b7280]">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile#info"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    My Profile
                  </Link>
                  <Link
                    to="/messages"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <span className="flex-1">Messages</span>
                    {unreadMessages > 0 && (
                      <span className="min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                        {unreadMessages > 9 ? '9+' : unreadMessages}
                      </span>
                    )}
                  </Link>
                  <Link
                    to="/profile#bookings"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    Booking History
                  </Link>
                  <Link
                    to="/profile#favorites"
                    onClick={() => setDropdownOpen(false)}
                    className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
                  >
                    <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    Favourites
                  </Link>
                  {(user?.role === 'ADMIN' || user?.role === 'HOST') && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      {user?.role === 'ADMIN' ? 'Admin Panel' : 'Host Dashboard'}
                    </Link>
                  )}
                  <div className="border-t border-[#D9D9D9] mt-1 pt-1">
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
            /* Logged out - Sign In/Sign Up + Chat */
            <>
              <Link
                to="/login"
                className={`hidden md:inline-flex px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 whitespace-nowrap ${
                  needsWhiteNav
                    ? 'border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white'
                    : 'border-white text-white hover:bg-white hover:text-[#0B0B45]'
                }`}
              >
                Sign In / Sign Up
              </Link>
              <button
                onClick={() => window.dispatchEvent(new CustomEvent('open-chat'))}
                className="hidden md:inline-flex px-5 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200 shadow-md whitespace-nowrap"
              >
                Chat with Us
              </button>
            </>
          )}

          {/* Hamburger */}
          <button
            type="button"
            onClick={() => setMenuOpen(!menuOpen)}
            className={`inline-flex items-center p-2 w-10 h-10 justify-center rounded-lg md:hidden transition-colors duration-200 ${
              needsWhiteNav
                ? 'text-[#0B0B45] hover:bg-[#D9D9D9]'
                : 'text-white hover:bg-white/10'
            }`}
            aria-controls="navbar-main"
            aria-expanded={menuOpen}
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

        {/* Nav links - centered between logo and buttons on desktop, full-width dropdown on mobile */}
        <div
          id="navbar-main"
          className={`w-full md:w-auto md:flex-1 md:flex md:justify-center md:order-2 ${
            menuOpen ? 'block' : 'hidden md:flex'
          }`}
        >
          <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 md:mt-0 border-t border-[#D9D9D9] md:border-0 md:flex-row md:space-x-8 rtl:space-x-reverse md:bg-transparent rounded-b-2xl md:rounded-none bg-white shadow-lg md:shadow-none">
            {[...navLinks, ...(isAuthenticated ? [{ name: 'Trips', href: '/trips' }] : []), ...(isAuthenticated && (user?.role === 'HOST' || user?.role === 'ADMIN') ? [{ name: 'Host', href: '/host/today' }] : [])].map((link) => {
              const isActive = location.pathname === link.href;
              return (
                <li key={link.name}>
                  <Link
                    to={link.href}
                    onClick={() => setMenuOpen(false)}
                    className={`relative block py-2 px-3 md:p-0 rounded transition-colors duration-200 font-semibold group
                      ${isActive
                        ? 'text-[#C49A6C]'
                        : needsWhiteNav
                          ? 'text-[#1f2937] hover:text-[#C49A6C]'
                          : 'text-[#1f2937] md:text-white md:hover:text-[#C49A6C]'
                      }`}
                  >
                    {link.name}
                    <span className={`absolute bottom-0 left-0 h-0.5 bg-[#C49A6C] transition-all duration-200 hidden md:block ${
                      isActive ? 'w-full' : 'w-0 group-hover:w-full'
                    }`} />
                  </Link>
                </li>
              );
            })}
            {/* Mobile CTA buttons */}
            <li className="md:hidden pt-3 space-y-2 border-t border-[#D9D9D9] mt-2">
              {isAuthenticated ? (
                <>
                  <Link
                    to="/profile#info"
                    className="block w-full py-2.5 rounded-full font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/profile#bookings"
                    className="block w-full py-2.5 rounded-full font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Booking History
                  </Link>
                  <Link
                    to="/profile#favorites"
                    className="block w-full py-2.5 rounded-full font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Favourites
                  </Link>
                  <Link
                    to="/messages"
                    className="block w-full py-2.5 rounded-full font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ''}
                  </Link>
                  {(user?.role === 'ADMIN' || user?.role === 'HOST') && (
                    <Link
                      to="/admin"
                      className="block w-full py-2.5 rounded-full font-semibold bg-[#0B0B45] text-white hover:bg-[#06062a] transition-all duration-200 text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      {user?.role === 'ADMIN' ? 'Admin Panel' : 'Host Dashboard'}
                    </Link>
                  )}
                  <button
                    onClick={handleLogout}
                    className="block w-full py-2.5 rounded-full font-semibold text-red-600 hover:bg-red-50 transition-all duration-200 text-center border border-red-200"
                  >
                    Sign Out
                  </button>
                </>
              ) : (
                <>
                  <Link
                    to="/login"
                    className="block w-full py-2.5 rounded-full font-semibold border-2 border-[#0B0B45] text-[#0B0B45] hover:bg-[#0B0B45] hover:text-white transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In / Sign Up
                  </Link>
                  <button
                    className="block w-full py-2.5 rounded-full font-semibold bg-[#C49A6C] text-white hover:bg-[#b8895c] transition-all duration-200 text-center"
                    onClick={() => { setMenuOpen(false); window.dispatchEvent(new CustomEvent('open-chat')); }}
                  >
                    Chat with Us
                  </button>
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
