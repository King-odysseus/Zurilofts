import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { playMessageSound, playBookingSound } from '../utils/notificationSound.js';
import logoImg from '../assets/zurilofts-logo.png';
import { TextInput } from 'flowbite-react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import '../admin-design.css';

// Shared: both hosts and admins - routes gated by requireHost (or weaker).
const sharedNavItems = [
  { path: '/admin', label: 'Dashboard', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', exact: true },
  { path: '/admin/properties', label: 'Properties', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/admin/earnings', label: 'Earnings', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
];

// Admin-only: backend is requireAdmin. Hosts must not see these - clicking
// them would 403. Separated from sharedNavItems so the host sidebar stays
// functional and doesn't invite users to dead-end pages.
const adminOnlyItems = [
  { path: '/admin/bookings', label: 'Bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/admin/users', label: 'Users & Hosts', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.65' },
  { path: '/admin/host-applications', label: 'Host Applications', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l4.414 4.414A1 1 0 0118 8.414V19a2 2 0 01-2 2z' },
  { path: '/admin/promos', label: 'Promo Codes', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  { path: '/admin/addons', label: 'Add-ons', icon: 'M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4' },
  { path: '/admin/guides', label: 'Guides', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { path: '/admin/feedback', label: 'Feedback', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
  { path: '/admin/messages', label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { path: '/admin/payouts', label: 'Payouts', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
];

const adminMobilePrimaryItems = [
  { path: '/admin', label: 'Overview', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', exact: true },
  { path: '/admin/properties', label: 'Listings', icon: 'M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2v-4a2 2 0 00-2-2h-2M10 6h1M13 6h1M10 10h1M13 10h1M10 14h1M13 14h1M10 18h1M13 18h1' },
  { path: '/admin/users', label: 'People', icon: 'M16 21v-2a4 4 0 00-4-4H6a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM22 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75', matchPaths: ['/admin/users', '/admin/host-applications'] },
];

const hostMobilePrimaryItems = [
  { path: '/admin', label: 'Overview', icon: 'M3 3h7v9H3zM14 3h7v5h-7zM14 12h7v9h-7zM3 16h7v5H3z', exact: true },
  { path: '/admin/properties', label: 'Listings', icon: 'M6 22V4a2 2 0 012-2h8a2 2 0 012 2v18M6 12H4a2 2 0 00-2 2v6a2 2 0 002 2h16a2 2 0 002-2v-4a2 2 0 00-2-2h-2M10 6h1M13 6h1M10 10h1M13 10h1M10 14h1M13 14h1M10 18h1M13 18h1' },
  { path: '/admin/earnings', label: 'Earnings', icon: 'M21 12a9 9 0 11-18 0 9 9 0 0118 0zM12 7v10M15 9.5c-.7-.7-1.7-1.1-3-1.1-1.7 0-3 .8-3 2s1.3 2 3 2 3 .8 3 2-1.3 2-3 2c-1.3 0-2.3-.4-3-1.1' },
];

const mobileMoreIcon = 'M5 12h.01M12 12h.01M19 12h.01';


// Avatar dropdown shown in the dashboard header - mirrors the client Navbar's
// account menu so admins/hosts get the same affordance inside the panel.
function HeaderUserMenu({ user, isAdmin, onLogout }) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div className="relative" ref={menuRef}>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center space-x-2 px-2 py-1.5 rounded-full hover:bg-[#D9D9D9]/40 transition-all duration-200"
      >
        <div className="w-9 h-9 bg-[#C49A6C] rounded-full flex items-center justify-center text-sm font-bold text-white overflow-hidden">
          {user?.avatar ? (
            <img src={user.avatar} alt="" className="w-full h-full object-cover" />
          ) : (
            <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
          )}
        </div>
        <span className="hidden sm:block text-sm font-semibold text-[#0B0B45]">{user?.firstName}</span>
        <svg className={`w-4 h-4 text-[#0B0B45] transition-transform duration-200 ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-lg border border-[#D9D9D9] py-2 z-30">
          <div className="px-4 py-3 border-b border-[#D9D9D9]">
            <p className="text-sm font-semibold text-[#0B0B45]">{user?.firstName} {user?.lastName}</p>
            <p className="text-xs text-[#6b7280]">{user?.email}</p>
            <span className="inline-block mt-1.5 text-[10px] font-bold uppercase tracking-wider text-[#C49A6C]">{isAdmin ? 'Admin' : 'Host'}</span>
          </div>
          <Link
            to="/profile#info"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
          >
            <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
            My Profile
          </Link>
          {user?.role !== 'HOST' && (
            <Link
              to="/host/application"
              onClick={() => setOpen(false)}
              className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
            >
              <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 10h.01M15 10h.01" />
              </svg>
              Become a host
            </Link>
          )}
          <Link
            to="/admin/messages"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
          >
            <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            Messages
          </Link>
          <Link
            to="/"
            onClick={() => setOpen(false)}
            className="flex items-center px-4 py-2.5 text-sm text-[#1f2937] hover:bg-[#D9D9D9]/30 transition-colors"
          >
            <svg className="w-4 h-4 mr-3 text-[#6b7280]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Go back to client view
          </Link>
          <div className="border-t border-[#D9D9D9] mt-1 pt-1">
            <button
              onClick={() => { setOpen(false); onLogout(); }}
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
  );
}

HeaderUserMenu.propTypes = {
  user: PropTypes.shape({
    firstName: PropTypes.string,
    lastName: PropTypes.string,
    email: PropTypes.string,
    avatar: PropTypes.string,
    role: PropTypes.string,
  }),
  isAdmin: PropTypes.bool,
  onLogout: PropTypes.func.isRequired,
};


function AdminLayout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(() => {
    try { return localStorage.getItem('zurilofts_admin_sidebar') === 'collapsed'; } catch { return false; }
  });
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false);
  const isAdmin = user?.role === 'ADMIN';
  const isMessageThreadRoute = /^\/admin\/messages\/[^/]+$/.test(location.pathname);
  const navItems = isAdmin ? [...sharedNavItems, ...adminOnlyItems] : sharedNavItems;
  const mobilePrimaryItems = isAdmin ? adminMobilePrimaryItems : hostMobilePrimaryItems;
  const mobilePrimaryPaths = new Set(mobilePrimaryItems.map((item) => item.path));
  const mobileMoreItems = navItems.filter((item) => !mobilePrimaryPaths.has(item.path));
  const mobileNavLabels = {
    'Users & Hosts': 'Users',
    'Host Applications': 'Hosts',
    'Promo Codes': 'Promos',
  };

  function matchesMobilePrimary(item) {
    const paths = item.matchPaths || [item.path];
    return paths.some((path) => {
      if (item.exact) return location.pathname === path;
      return location.pathname === path || location.pathname.startsWith(`${path}/`);
    });
  }

  const mobilePrimaryActive = mobilePrimaryItems.some(matchesMobilePrimary);
  const mobileMoreActive = !mobilePrimaryActive && location.pathname.startsWith('/admin');

  // ── Notification polling (messages + new bookings) ──
  const [notif, setNotif] = useState({ unreadMessages: 0, pendingBookings: 0 });
  const lastNotifRef = useRef({ unreadMessages: 0, pendingBookings: 0 });

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const r = await apiClient.get('/notifications');
        if (!active) return;
        const d = r.data.data || {};
        const prev = lastNotifRef.current;

        // Play sound only when a count increased
        if (d.unreadMessages > prev.unreadMessages) playMessageSound();
        if (d.pendingBookings > prev.pendingBookings) playBookingSound();

        lastNotifRef.current = { unreadMessages: d.unreadMessages ?? 0, pendingBookings: d.pendingBookings ?? 0 };
        setNotif({ unreadMessages: d.unreadMessages ?? 0, pendingBookings: d.pendingBookings ?? 0 });
      } catch { /* silently ignore */ }
    };
    poll();
    const t = setInterval(poll, 25000);
    return () => { active = false; clearInterval(t); };
  }, []);

  useEffect(() => {
    setMobileMoreOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!mobileMoreOpen) return undefined;
    const previousOverflow = document.body.style.overflow;
    function handleKeyDown(event) {
      if (event.key === 'Escape') setMobileMoreOpen(false);
    }
    document.body.style.overflow = 'hidden';
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMoreOpen]);

  function handleLogout() {
    logout();
    navigate('/');
  }

  function toggleSidebar() {
    setCollapsed((prev) => {
      const next = !prev;
      try { localStorage.setItem('zurilofts_admin_sidebar', next ? 'collapsed' : 'expanded'); } catch { /* ignore localStorage errors */ }
      return next;
    });
  }

  return (
    <div className={`op-admin-layout min-h-screen bg-white flex${isMessageThreadRoute ? ' is-message-thread-open' : ''}`}>
      {/* Sidebar */}
      <aside
        className={`op-admin-sidebar bg-white hidden md:flex flex-col fixed inset-y-0 left-0 z-10 transition-all duration-300 ${
          collapsed ? 'w-[72px]' : 'w-[224px]'
        }`}
      >
        <div className={`flex items-center ${collapsed ? 'justify-center px-2 pb-2 pt-5' : 'justify-between px-5 pb-3 pt-5'}`}>
          <Link to="/" className="op-admin-brand inline-flex items-center gap-2">
            <img src={logoImg} alt="ZuriLofts" className="h-7 w-7 object-contain" />
            {!collapsed && <strong>zuri.admin</strong>}
          </Link>
        </div>
        {!collapsed && (
          <span className="block px-6 pb-4 text-[#C49A6C] text-xs font-semibold uppercase tracking-wider">
            {isAdmin ? 'Workspace' : 'Host workspace'}
          </span>
        )}
        <nav className={`min-h-0 flex-1 overflow-y-auto ${collapsed ? 'flex flex-col items-center' : 'px-3'}`}>
          {navItems.map(({ path, label, icon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                title={collapsed ? label : ''}
                aria-current={active ? 'page' : undefined}
                className={`op-admin-nav-link flex items-center rounded-lg mb-1 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[#E8EDF7] text-[#0B1F42]'
                    : 'text-[#414D63] hover:bg-[#F7F4EF]'
                } ${collapsed ? 'justify-center w-11 h-11' : 'px-3 py-2'}`}
              >
                <div className="relative">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                  </svg>
                  {path === '/admin/messages' && notif.unreadMessages > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}
                    </span>
                  )}
                  {path === '/admin/bookings' && notif.pendingBookings > 0 && (
                    <span className="absolute -top-1.5 -right-2 min-w-[18px] h-[18px] px-1 bg-amber-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                      {notif.pendingBookings > 99 ? '99+' : notif.pendingBookings}
                    </span>
                  )}
                </div>
                {!collapsed && <span className="ml-3">{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={`op-admin-sidebar-account border-t border-white/10 ${collapsed ? 'flex flex-col items-center p-3' : 'p-5'}`}>
          <Link
            to="/"
            title={collapsed ? 'Go back to client view' : ''}
            className={`flex items-center rounded-full text-sm font-semibold bg-white/10 text-white hover:bg-[#C49A6C] hover:text-white transition-all duration-200 ${
              collapsed ? 'justify-center w-11 h-11 mb-4' : 'justify-center mb-5 px-4 py-2.5'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            {!collapsed && <span className="ml-2.5">Go back to client view</span>}
          </Link>
          <ThemeToggle className="op-admin-theme-toggle" showLabel={!collapsed} />
          <div className={`flex items-center my-5 ${collapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-[#C49A6C] rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="text-sm">
                <p className="font-medium">{user?.firstName}</p>
                <p className="text-white/50 text-xs">{isAdmin ? 'Admin' : 'Host'}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            title={collapsed ? 'Sign Out' : ''}
            className={`flex items-center text-white/60 hover:text-white transition-colors mt-3 ${
              collapsed ? 'justify-center w-full text-base' : 'text-[15px]'
            }`}
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            {!collapsed && <span className="ml-2.5">Sign Out</span>}
          </button>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className={`op-admin-sidebar-toggle ${collapsed ? 'is-collapsed' : 'is-expanded'}`}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={collapsed ? 'M9 5l7 7-7 7' : 'M15 19l-7-7 7-7'} />
          </svg>
        </button>
      </aside>

      {/* Mobile header and floating section nav */}
      <div className="op-admin-mobile-header md:hidden">
        <div className="op-admin-mobile-heading">
          <Link to="/" className="op-admin-mobile-brand">
            <img src={logoImg} alt="" />
            <span>
              <strong>zuri.admin</strong>
              <small>{isAdmin ? 'Workspace' : 'Host workspace'}</small>
            </span>
          </Link>
        </div>
        <div className="op-admin-mobile-actions">
          <ThemeToggle className="op-admin-mobile-theme" />
          <div className="relative">
            <button
              className="op-admin-mobile-bell"
              title={`${notif.unreadMessages} unread, ${notif.pendingBookings} pending`}
              aria-label={`${notif.unreadMessages} unread messages and ${notif.pendingBookings} pending bookings`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
            </button>
            {(notif.unreadMessages > 0 || notif.pendingBookings > 0) && (
              <span className="op-admin-mobile-count">
                {(() => {
                  const total = notif.unreadMessages + notif.pendingBookings;
                  return total > 99 ? '99+' : total;
                })()}
              </span>
            )}
          </div>
          <HeaderUserMenu user={user} isAdmin={isAdmin} onLogout={handleLogout} />
        </div>
      </div>
      <nav className="op-admin-mobile-nav md:hidden" aria-label={`${isAdmin ? 'Admin' : 'Host'} workspace sections`}>
        <div className="op-admin-mobile-nav-scroll">
          {mobilePrimaryItems.map((item) => {
            const active = matchesMobilePrimary(item);
            return (
              <Link key={item.path} to={item.path} className={`op-admin-mobile-link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
                </svg>
                <span>{item.label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            className={`op-admin-mobile-link ${mobileMoreActive || mobileMoreOpen ? 'is-active' : ''}`}
            onClick={() => setMobileMoreOpen(true)}
            aria-expanded={mobileMoreOpen}
            aria-controls="admin-mobile-more-drawer"
          >
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={mobileMoreIcon} />
            </svg>
            <span>More</span>
          </button>
        </div>
      </nav>
      {mobileMoreOpen && (
        <div className="op-admin-mobile-more-backdrop md:hidden" onClick={() => setMobileMoreOpen(false)}>
          <section
            id="admin-mobile-more-drawer"
            className="op-admin-mobile-more-drawer"
            role="dialog"
            aria-modal="true"
            aria-label={`${isAdmin ? 'Admin' : 'Host'} workspace navigation`}
            onClick={(event) => event.stopPropagation()}
          >
            <header className="op-admin-mobile-more-head">
              <div>
                <strong>zuri.admin</strong>
                <span>{isAdmin ? 'Workspace navigation' : 'Host workspace'}</span>
              </div>
              <button type="button" onClick={() => setMobileMoreOpen(false)} aria-label="Close navigation">
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </header>
            <p className="op-admin-mobile-more-label">Workspace</p>
            <div className="op-admin-mobile-more-list">
              {mobileMoreItems.map(({ path, label, icon }) => {
                const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
                const displayLabel = mobileNavLabels[label] || label;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={active ? 'is-active' : ''}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileMoreOpen(false)}
                  >
                    <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={icon} />
                    </svg>
                    <span>{displayLabel}</span>
                    {path === '/admin/messages' && notif.unreadMessages > 0 && <small>{notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}</small>}
                    {path === '/admin/bookings' && notif.pendingBookings > 0 && <small>{notif.pendingBookings > 99 ? '99+' : notif.pendingBookings}</small>}
                  </Link>
                );
              })}
            </div>
            <div className="op-admin-mobile-more-footer">
              <Link to="/" onClick={() => setMobileMoreOpen(false)}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Client view
              </Link>
              <button type="button" onClick={handleLogout}>
                <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Sign Out
              </button>
            </div>
          </section>
        </div>
      )}

      {/* Main content */}
      <main
        className={`op-admin-main flex-1 transition-all duration-300 ${isMessageThreadRoute ? 'is-message-thread-route' : ''} ${
          collapsed ? 'md:ml-[72px]' : 'md:ml-[224px]'
        }`}
      >
        {/* Desktop header with notification bell and avatar dropdown */}
        <header className="hidden md:flex items-center justify-between gap-3 h-16 px-8 bg-white border-b border-[#D9D9D9] sticky top-0 z-[5]">
          <div className="flex items-center gap-3">
            {/* Bell - unread messages + pending bookings */}
            <div className="relative">
              <button
                onClick={() => { /* just a visual indicator for now */ }}
                className="p-2 rounded-full hover:bg-[#D9D9D9]/40 transition-colors text-[#0B0B45]"
                title={`${notif.unreadMessages} unread messages, ${notif.pendingBookings} pending bookings`}
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </button>
              {(notif.unreadMessages > 0 || notif.pendingBookings > 0) && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {(() => {
                    const t = notif.unreadMessages + notif.pendingBookings;
                    return t > 99 ? '99+' : t;
                  })()}
                </span>
              )}
            </div>
            <HeaderUserMenu user={user} isAdmin={isAdmin} onLogout={handleLogout} />
          </div>
        </header>
        <div className="op-admin-content p-4 md:p-8 pt-20 md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Dashboard Overview
// Dashboard Overview
function DashboardOverview() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [stats, setStats] = useState({ properties: 0, bookings: 0, promos: 0, revenue: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [landingStats, setLandingStats] = useState({ happyStays: '10', starRating: '5.0', satisfaction: '0' });
  const [savingLanding, setSavingLanding] = useState(false);
  const [landingMsg, setLandingMsg] = useState('');
  const [quickActionsOpen, setQuickActionsOpen] = useState(false);
  const quickRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClick(e) { if (quickRef.current && !quickRef.current.contains(e.target)) setQuickActionsOpen(false); }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    async function load() {
      try {
        const bookingsUrl = isAdmin ? '/admin/bookings' : '/bookings/host';
        const earningsUrl = isAdmin ? '/admin/analytics/properties' : '/bookings/host/earnings';
        const fetches = [
          apiClient.get('/properties/mine'),
          apiClient.get(bookingsUrl, { params: { limit: 5 } }),
          apiClient.get(earningsUrl),
        ];
        if (isAdmin) {
          fetches.push(apiClient.get('/promo'));
          fetches.push(apiClient.get('/admin/settings/landing-stats'));
        }
        const results = await Promise.all(fetches);
        const propsRes = results[0];
        const bookingsRes = results[1];
        const earningsRes = results[2];
        const bookings = bookingsRes.data.data || [];
        const totalRevenue = bookings.filter((b) => b.status !== 'CANCELLED').reduce((sum, b) => sum + b.total, 0);
        const totals = earningsRes.data.data?.totals || {};
        setStats({
          properties: propsRes.data.pagination?.total || 0,
          bookings: totals.bookings || bookingsRes.data.pagination?.total || 0,
          promos: results[3]?.data.data?.length || 0,
          revenue: totals.earnings || totalRevenue,
        });
        setRecentBookings(bookings);
        if (isAdmin && results[4]) {
          const ls = results[4].data.data || {};
          setLandingStats({ happyStays: String(ls.happyStays || '10'), starRating: String(ls.starRating || '5.0'), satisfaction: String(ls.satisfaction || '0') });
        }
      } catch { /* silent */ }
    }
    load();
  }, [isAdmin]);

  async function saveLandingStats(e) {
    e.preventDefault();
    setSavingLanding(true); setLandingMsg('');
    try {
      await apiClient.put('/admin/settings/landing-stats', { happyStays: Number(landingStats.happyStays), starRating: Number(landingStats.starRating), satisfaction: Number(landingStats.satisfaction) });
      setLandingMsg('Saved.');
    } catch { setLandingMsg('Save failed.'); }
    finally { setSavingLanding(false); }
  }

  const quickLinks = [
    ...(isAdmin ? [
      { to: '/admin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'View bookings' },
      { to: '/admin/users', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.65', label: 'Manage users' },
      { to: '/admin/properties/new', icon: 'M12 4v16m8-8H4', label: 'Add property' },
      { to: '/admin/promos', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z', label: 'Manage promos' },
    ] : [
      { to: '/admin/properties/new', icon: 'M12 4v16m8-8H4', label: 'Add property' },
      { to: '/admin/bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', label: 'View bookings' },
      { to: '/admin/earnings', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z', label: 'View earnings' },
    ]),
  ];

  const today = new Date().toDateString();
  const arrivals = recentBookings.filter((booking) => new Date(booking.checkIn).toDateString() === today);
  const departures = recentBookings.filter((booking) => new Date(booking.checkOut).toDateString() === today);
  const pending = recentBookings.filter((booking) => booking.status === 'PENDING');
  return <div className="op-admin-overview" data-openpencil-frame="0:6909">
    <div className="op-admin-heading"><div><p className="op-admin-eyebrow">ZURILOFTS · ADMIN · OPERATIONS</p><h1>Operations overview</h1><p>Arrivals, departures and priority work across every stay on the platform.</p></div>
      <div className="op-admin-quick" ref={quickRef}><button type="button" onClick={() => setQuickActionsOpen((open) => !open)} aria-expanded={quickActionsOpen}>Quick actions ⌄</button>
        {quickActionsOpen && <div className="op-admin-quick-menu" role="menu">{quickLinks.map((link) => <button key={link.to} role="menuitem" onClick={() => { setQuickActionsOpen(false); navigate(link.to); }}>{link.label}</button>)}</div>}
      </div>
    </div>
    <div className="op-admin-metrics">
      <article><span>ARRIVALS TODAY</span><strong>{arrivals.length}</strong><small>From recent bookings</small></article>
      <article><span>DEPARTURES</span><strong>{departures.length}</strong><small>From recent bookings</small></article>
      <article><span>NEED REVIEW</span><strong>{pending.length}</strong><small>Pending bookings</small></article>
      <article><span>ACTIVE BOOKINGS</span><strong>{stats.bookings}</strong><small>All bookings</small></article>
    </div>
    <div className="op-admin-overview-grid">
      <section className="op-admin-priority"><div className="op-admin-panel-heading"><h2>Priority queue</h2><span>{pending.length} open</span></div>
        {pending.length ? pending.map((booking) => <div className="op-admin-priority-row" key={booking.id}><div><strong>{booking.property?.title || 'Stay booking'}</strong><small>{booking.user?.firstName} {booking.user?.lastName} · {new Date(booking.checkIn).toLocaleDateString()}</small></div><span className="op-admin-urgent">Pending</span><Link to="/admin/bookings">Open</Link></div>) : <div className="op-admin-empty"><strong>No urgent bookings</strong><p>New bookings requiring review will appear here.</p><Link to="/admin/bookings">View all bookings</Link></div>}
      </section>
      <section className="op-admin-glance"><h2>Today at a glance</h2><p><span>Check-ins</span><strong>{arrivals.length}</strong></p><p><span>Check-outs</span><strong>{departures.length}</strong></p><p><span>Listings</span><strong>{stats.properties}</strong></p><Link to="/admin/properties">Open listings board</Link></section>
    </div>
    <div className="op-admin-secondary"><details><summary>Platform metrics</summary><div className="op-admin-secondary-metrics"><span>Revenue (KES) <strong>{stats.revenue.toLocaleString()}</strong></span><span>Active promos <strong>{stats.promos}</strong></span></div></details>
      {isAdmin && <details><summary>Landing page statistics</summary><p>Set a value to 0 to use live review and booking data.</p><form onSubmit={saveLandingStats} className="op-admin-stats-form">
        <label>Happy stays<TextInput type="number" min="0" value={landingStats.happyStays} onChange={(event) => setLandingStats({ ...landingStats, happyStays: event.target.value })} /></label>
        <label>Star rating<TextInput type="number" min="0" max="5" step="0.1" value={landingStats.starRating} onChange={(event) => setLandingStats({ ...landingStats, starRating: event.target.value })} /></label>
        <label>Satisfaction %<TextInput type="number" min="0" max="100" value={landingStats.satisfaction} onChange={(event) => setLandingStats({ ...landingStats, satisfaction: event.target.value })} /></label>
        <button type="submit" disabled={savingLanding}>{savingLanding ? 'Saving…' : 'Update'}</button>{landingMsg && <span role="status">{landingMsg}</span>}
      </form></details>}
    </div>
  </div>;
}
function AdminDashboard() {
  return <DashboardOverview />;
}

export { AdminLayout };
export default AdminDashboard;
