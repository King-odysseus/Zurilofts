import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import logoImg from '../assets/zurilofts-logo.png';

// Shared: both hosts and admins — routes gated by requireHost (or weaker).
const sharedNavItems = [
  { path: '/admin', label: 'Dashboard', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16', exact: true },
  { path: '/admin/properties', label: 'Properties', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
  { path: '/admin/earnings', label: 'Earnings', icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
  { path: '/admin/messages', label: 'Messages', icon: 'M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.86 9.86 0 01-4-.8L3 20l1.3-3.9A7.96 7.96 0 013 12c0-4.418 4.03-8 9-8s9 3.582 9 8z' },
  { path: '/admin/payouts', label: 'Payouts', icon: 'M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z' },
];

// Admin-only: backend is requireAdmin. Hosts must not see these — clicking
// them would 403. Separated from sharedNavItems so the host sidebar stays
// functional and doesn't invite users to dead-end pages.
const adminOnlyItems = [
  { path: '/admin/bookings', label: 'Bookings', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { path: '/admin/users', label: 'Users & Hosts', icon: 'M17 20h5v-2a4 4 0 00-3-3.87M9 20H4v-2a4 4 0 013-3.87m6-1.13a4 4 0 10-4-4 4 4 0 004 4zm6 0a4 4 0 10-3-6.65' },
  { path: '/admin/promos', label: 'Promo Codes', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' },
  { path: '/admin/guides', label: 'Guides', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { path: '/admin/feedback', label: 'Feedback', icon: 'M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.196-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z' },
];

// Avatar dropdown shown in the dashboard header — mirrors the client Navbar's
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
  const isAdmin = user?.role === 'ADMIN';
  const navItems = isAdmin ? [...sharedNavItems, ...adminOnlyItems] : sharedNavItems;

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
    <div className="min-h-screen bg-[#f8f9fa] flex">
      {/* Sidebar */}
      <aside
        className={`bg-[#0B0B45] text-white hidden md:flex flex-col fixed inset-y-0 left-0 z-10 transition-all duration-300 ${
          collapsed ? 'w-[88px]' : 'w-64'
        }`}
      >
        <div className={`flex ${collapsed ? 'flex-col items-center gap-2 pt-12 pb-2 px-2' : 'items-center justify-between pt-16 pb-4 px-6'}`}>
          <Link to="/" className="inline-block bg-white rounded-xl px-1.5 py-1">
            <img src={logoImg} alt="ZuriLofts" className={`w-auto ${collapsed ? 'h-7' : 'h-10'}`} />
          </Link>
          <button
            onClick={toggleSidebar}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <svg
              className={`w-5 h-5 transition-transform duration-300 ${collapsed ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
            </svg>
          </button>
        </div>
        {!collapsed && (
          <span className="block px-6 pb-4 text-[#C49A6C] text-xs font-semibold uppercase tracking-wider">
            {isAdmin ? 'Admin Panel' : 'Host Dashboard'}
          </span>
        )}
        <nav className={`flex-1 ${collapsed ? 'flex flex-col items-center' : 'px-3'}`}>
          {navItems.map(({ path, label, icon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <Link
                key={path}
                to={path}
                title={collapsed ? label : ''}
                aria-current={active ? 'page' : undefined}
                className={`flex items-center rounded-full mb-2 text-sm font-medium transition-all duration-200 ${
                  active
                    ? 'bg-[#C49A6C] text-white'
                    : 'text-white/70 hover:bg-white/10 hover:text-white'
                } ${collapsed ? 'justify-center w-11 h-11' : 'px-4 py-4'}`}
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
                {!collapsed && <span className="ml-3">{label}</span>}
              </Link>
            );
          })}
        </nav>
        <div className={`border-t border-white/10 ${collapsed ? 'p-3 flex flex-col items-center' : 'p-5'}`}>
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
      </aside>

      {/* Mobile nav */}
      <div className="md:hidden fixed top-0 w-full bg-[#0B0B45] z-10 p-4 flex items-center justify-between">
        <Link to="/" className="flex items-center space-x-2">
          <div className="bg-white rounded-lg px-2 py-1">
            <img src={logoImg} alt="ZuriLofts" className="h-6 w-auto" />
          </div>
          <span className="text-[#C49A6C] text-xs font-semibold uppercase tracking-wider">{isAdmin ? 'Admin' : 'Host'}</span>
        </Link>
        <div className="flex items-center space-x-2">
          {navItems.map(({ path, label, icon }) => (
            <Link
              key={path}
              to={path}
              className={`p-2 rounded-lg text-xs font-medium transition-colors ${
                location.pathname === path
                  ? 'bg-[#C49A6C] text-white'
                  : 'text-white/70'
              }`}
            >
              <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
              </svg>
              <span className="sr-only">{label}</span>
            </Link>
          ))}
          <Link
            to="/"
            className="p-2 rounded-lg text-xs font-medium text-white/70 hover:text-white transition-colors"
            title="Go back to client view"
          >
            <svg className="w-5 h-5 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            <span className="sr-only">Go back to client view</span>
          </Link>
          <div className="bg-white/95 rounded-full">
            <HeaderUserMenu user={user} isAdmin={isAdmin} onLogout={handleLogout} />
          </div>
        </div>
      </div>

      {/* Main content */}
      <main
        className={`flex-1 transition-all duration-300 ${
          collapsed ? 'md:ml-[88px]' : 'md:ml-64'
        }`}
      >
        {/* Desktop header with avatar dropdown */}
        <header className="hidden md:flex items-center justify-end h-16 px-8 bg-white border-b border-[#D9D9D9] sticky top-0 z-[5]">
          <HeaderUserMenu user={user} isAdmin={isAdmin} onLogout={handleLogout} />
        </header>
        <div className="p-4 md:p-8 pt-20 md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Dashboard Overview
function DashboardOverview() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [stats, setStats] = useState({ properties: 0, bookings: 0, promos: 0, revenue: 0 });
  const [recentBookings, setRecentBookings] = useState([]);
  const [landingStats, setLandingStats] = useState({ happyStays: '10', starRating: '5.0', satisfaction: '0' });
  const [savingLanding, setSavingLanding] = useState(false);
  const [landingMsg, setLandingMsg] = useState('');

  useEffect(() => {
    async function load() {
      try {
        // Admins read all data; hosts read only their own (scoped endpoints).
        // Hosts don't need promos or landing stats.
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
        const totalRevenue = bookings
          .filter((b) => b.status !== 'CANCELLED')
          .reduce((sum, b) => sum + b.total, 0);

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
          setLandingStats({
            happyStays: String(ls.happyStays || '10'),
            starRating: String(ls.starRating || '5.0'),
            satisfaction: String(ls.satisfaction || '0'),
          });
        }
      } catch {
        // silent
      }
    }
    load();
  }, [isAdmin]);

  async function saveLandingStats(e) {
    e.preventDefault();
    setSavingLanding(true);
    setLandingMsg('');
    try {
      await apiClient.put('/admin/settings/landing-stats', {
        happyStays: Number(landingStats.happyStays),
        starRating: Number(landingStats.starRating),
        satisfaction: Number(landingStats.satisfaction),
      });
      setLandingMsg('Saved.');
    } catch {
      setLandingMsg('Save failed.');
    } finally {
      setSavingLanding(false);
    }
  }

  const statCards = [
    { label: 'Total Properties', value: stats.properties, color: 'bg-[#0B0B45]', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
    { label: 'Active Bookings', value: stats.bookings, color: 'bg-[#C49A6C]', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
    ...(isAdmin ? [{ label: 'Active Promos', value: stats.promos, color: 'bg-green-600', icon: 'M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z' }] : []),
    { label: 'Active Revenue (KES)', value: stats.revenue.toLocaleString(), color: 'bg-purple-600', icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z' },
  ];

  return (
    <div>
      <h1 className="text-2xl font-bold text-[#0B0B45] mb-6">Dashboard</h1>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statCards.map(({ label, value, color, icon }) => (
          <div key={label} className="bg-white rounded-2xl p-5 shadow-md border border-[#D9D9D9]">
            <div className="flex items-center justify-between mb-3">
              <span className="text-sm text-[#6b7280]">{label}</span>
              <div className={`w-10 h-10 ${color} rounded-xl flex items-center justify-center`}>
                <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={icon} />
                </svg>
              </div>
            </div>
            <p className="text-2xl font-bold text-[#0B0B45]">{value}</p>
          </div>
        ))}
      </div>

      {/* Landing Page Stats Editor — admin only */}
      {isAdmin && (
      <div className="bg-white rounded-2xl shadow-md border border-[#D9D9D9] p-6 mb-6">
        <h2 className="text-lg font-bold text-[#0B0B45] mb-2">Landing Page Stats</h2>
        <p className="text-sm text-[#6b7280] mb-4">These appear in the hero section. Leave at 0 to use live data from reviews and bookings.</p>
        <form onSubmit={saveLandingStats} className="flex flex-wrap items-end gap-4">
          <div>
            <label className="block text-sm font-semibold text-[#1f2937] mb-1">Happy Stays</label>
            <input
              type="number"
              min="0"
              value={landingStats.happyStays}
              onChange={(e) => setLandingStats({ ...landingStats, happyStays: e.target.value })}
              className="w-32 px-3 py-2 rounded-xl border border-[#D9D9D9] text-[#1f2937] text-sm focus:outline-none focus:border-[#C49A6C]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1f2937] mb-1">Star Rating</label>
            <input
              type="number"
              min="0"
              max="5"
              step="0.1"
              value={landingStats.starRating}
              onChange={(e) => setLandingStats({ ...landingStats, starRating: e.target.value })}
              className="w-32 px-3 py-2 rounded-xl border border-[#D9D9D9] text-[#1f2937] text-sm focus:outline-none focus:border-[#C49A6C]"
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#1f2937] mb-1">Satisfaction %</label>
            <input
              type="number"
              min="0"
              max="100"
              value={landingStats.satisfaction}
              onChange={(e) => setLandingStats({ ...landingStats, satisfaction: e.target.value })}
              className="w-32 px-3 py-2 rounded-xl border border-[#D9D9D9] text-[#1f2937] text-sm focus:outline-none focus:border-[#C49A6C]"
            />
          </div>
          <button
            type="submit"
            disabled={savingLanding}
            className="bg-[#C49A6C] text-white font-semibold px-5 py-2 rounded-full text-sm hover:bg-[#b8895c] transition-all duration-200 disabled:opacity-50"
          >
            {savingLanding ? 'Saving...' : 'Update'}
          </button>
          {landingMsg && <span className="text-sm text-green-600 self-center">{landingMsg}</span>}
        </form>
      </div>
      )}

      {/* Recent Bookings */}
      <div className="bg-white rounded-2xl shadow-md border border-[#D9D9D9] p-6">
        <h2 className="text-lg font-bold text-[#0B0B45] mb-4">Recent Bookings</h2>
        {recentBookings.length === 0 ? (
          <p className="text-[#6b7280] text-sm">No bookings yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-[#D9D9D9]">
                  <th className="pb-3 font-semibold text-[#0B0B45]">Guest</th>
                  <th className="pb-3 font-semibold text-[#0B0B45]">Property</th>
                  <th className="pb-3 font-semibold text-[#0B0B45]">Dates</th>
                  <th className="pb-3 font-semibold text-[#0B0B45]">Total</th>
                  <th className="pb-3 font-semibold text-[#0B0B45]">Status</th>
                </tr>
              </thead>
              <tbody>
                {recentBookings.map((b) => (
                  <tr key={b.id} className="border-b border-[#D9D9D9]/50">
                    <td className="py-3">{b.user?.firstName} {b.user?.lastName}</td>
                    <td className="py-3">{b.property?.title}</td>
                    <td className="py-3 text-xs">{new Date(b.checkIn).toLocaleDateString()} — {new Date(b.checkOut).toLocaleDateString()}</td>
                    <td className="py-3 font-semibold">KES {b.total.toLocaleString()}</td>
                    <td className="py-3">
                      <span className={`px-2 py-1 rounded-full text-xs font-semibold ${
                        b.status === 'CONFIRMED' ? 'bg-green-100 text-green-700' :
                        b.status === 'CANCELLED' ? 'bg-red-100 text-red-700' :
                        'bg-yellow-100 text-yellow-700'
                      }`}>{b.status}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function AdminDashboard() {
  return <DashboardOverview />;
}

export { AdminLayout };
export default AdminDashboard;
