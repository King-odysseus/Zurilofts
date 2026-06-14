import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Poll unread message count for the badge on the account menu
  useEffect(() => {
    if (!isAuthenticated) { setUnreadMessages(0); return; }
    let active = true;
    async function loadUnread() {
      try {
        const r = await apiClient.get('/messages/unread-count');
        if (active) setUnreadMessages(r.data.data?.count || 0);
      } catch { /* ignore */ }
    }
    loadUnread();
    const t = setInterval(loadUnread, 30000);
    return () => { active = false; clearInterval(t); };
  }, [isAuthenticated]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setDropdownOpen(false);
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
            /* Authenticated — User dropdown (Profile, Messages, Admin) */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-[#D9D9D9]/30 transition-all duration-200"
              >
                <div className="relative w-8 h-8 bg-[#C49A6C] rounded-full flex items-center justify-center text-sm font-bold text-[#262262]">
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
                  {unreadMessages > 0 && (
                    <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {unreadMessages > 9 ? '9+' : unreadMessages}
                    </span>
                  )}
                </div>
                <span className={`hidden md:block text-sm font-semibold ${needsWhiteNav ? 'text-[#262262]' : 'text-white'}`}>
                  {user?.firstName}
                </span>
                <svg className={`w-4 h-4 transition-transform duration-200 ${dropdownOpen ? 'rotate-180' : ''} ${needsWhiteNav ? 'text-[#262262]' : 'text-white'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#D9D9D9] py-2 z-30">
                  <div className="px-4 py-3 border-b border-[#D9D9D9]">
                    <p className="text-sm font-semibold text-[#262262]">{user?.firstName} {user?.lastName}</p>
                    <p className="text-xs text-[#6b7280]">{user?.email}</p>
                  </div>
                  <Link
                    to="/profile"
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
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      onClick={() => setDropdownOpen(false)}
                      className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
                    >
                      <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      Admin Panel
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
          ) : (
            /* Logged out — Sign In + Get It Now */
            <>
              <Link
                to="/login"
                className={`hidden md:inline-flex px-5 py-2 rounded-full text-sm font-semibold transition-all duration-200 border-2 whitespace-nowrap ${
                  needsWhiteNav
                    ? 'border-[#262262] text-[#262262] hover:bg-[#262262] hover:text-white'
                    : 'border-white text-white hover:bg-white hover:text-[#262262]'
                }`}
              >
                Sign In
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
                ? 'text-[#262262] hover:bg-[#D9D9D9]'
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

        {/* Nav links — centered between logo and buttons on desktop, full-width dropdown on mobile */}
        <div
          id="navbar-main"
          className={`w-full md:w-auto md:flex-1 md:flex md:justify-center md:order-2 ${
            menuOpen ? 'block' : 'hidden md:flex'
          }`}
        >
          <ul className="font-medium flex flex-col p-4 md:p-0 mt-4 md:mt-0 border-t border-[#D9D9D9] md:border-0 md:flex-row md:space-x-8 rtl:space-x-reverse md:bg-transparent rounded-b-2xl md:rounded-none bg-white shadow-lg md:shadow-none">
            {navLinks.map((link) => {
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
                    to="/profile"
                    className="block w-full py-2.5 rounded-full font-semibold border-2 border-[#262262] text-[#262262] hover:bg-[#262262] hover:text-white transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    My Profile
                  </Link>
                  <Link
                    to="/messages"
                    className="block w-full py-2.5 rounded-full font-semibold border-2 border-[#262262] text-[#262262] hover:bg-[#262262] hover:text-white transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Messages{unreadMessages > 0 ? ` (${unreadMessages})` : ''}
                  </Link>
                  {user?.role === 'ADMIN' && (
                    <Link
                      to="/admin"
                      className="block w-full py-2.5 rounded-full font-semibold bg-[#262262] text-white hover:bg-[#1a1850] transition-all duration-200 text-center"
                      onClick={() => setMenuOpen(false)}
                    >
                      Admin Panel
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
                    className="block w-full py-2.5 rounded-full font-semibold border-2 border-[#262262] text-[#262262] hover:bg-[#262262] hover:text-white transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Sign In
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
