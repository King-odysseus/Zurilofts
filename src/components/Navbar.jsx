import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
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

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

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
      <div className="max-w-screen-xl flex flex-wrap items-center justify-between mx-auto p-4">

        {/* Logo */}
        <Link to="/" className="flex items-center space-x-3 rtl:space-x-reverse">
          {needsWhiteNav ? (
            <img src={logoImg} alt="ZuriLofts" className="h-12 w-auto" />
          ) : (
            <>
              <div className="w-8 h-8 bg-[#C49A6C] rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5}
                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              </div>
              <span className="self-center text-xl font-bold whitespace-nowrap text-white">
                ZuriLofts
              </span>
            </>
          )}
        </Link>

        {/* Right side: CTA buttons / user menu + hamburger */}
        <div className="flex items-center md:order-2 space-x-2 rtl:space-x-reverse">
          {isAuthenticated ? (
            /* Authenticated — User dropdown */
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center space-x-2 px-3 py-2 rounded-full hover:bg-[#D9D9D9]/30 transition-all duration-200"
              >
                <div className={`w-8 h-8 bg-[#C49A6C] rounded-full flex items-center justify-center text-sm font-bold text-[#262262]`}>
                  {user?.firstName?.[0]}{user?.lastName?.[0]}
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
              <Link
                to="/properties"
                className="hidden md:inline-flex px-5 py-2 rounded-full text-sm font-semibold bg-[#C49A6C] text-[#262262] hover:bg-[#b8895c] transition-all duration-200 shadow-md whitespace-nowrap"
              >
                Get It Now
              </Link>
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

        {/* Nav links */}
        <div
          id="navbar-main"
          className={`absolute top-full left-0 right-0 md:static md:flex md:w-auto md:order-1 transition-all duration-300 ${
            menuOpen ? 'block' : 'hidden'
          }`}
        >
          <ul className="font-medium flex flex-col p-4 md:p-0 mt-0 border-b border-[#D9D9D9] bg-white shadow-lg md:flex-row md:space-x-8 rtl:space-x-reverse md:mt-0 md:border-0 md:bg-transparent md:shadow-none rounded-b-2xl md:rounded-none">
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
                  <Link
                    to="/properties"
                    className="block w-full py-2.5 rounded-full font-semibold bg-[#C49A6C] text-[#262262] hover:bg-[#b8895c] transition-all duration-200 text-center"
                    onClick={() => setMenuOpen(false)}
                  >
                    Get It Now
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
