import { useState, useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { playMessageSound, playBookingSound } from '../utils/notificationSound.js';
import logoImg from '../assets/zurilofts-logo.png';
import {
  Accordion,
  AccordionContent,
  AccordionPanel,
  AccordionTitle,
  Drawer,
  DrawerHeader,
  DrawerItems,
  Dropdown,
  DropdownDivider,
  DropdownHeader,
  DropdownItem,
  TextInput,
  Tooltip,
} from 'flowbite-react';
import {
  Banknote,
  BarChart3,
  Bell,
  BookOpen,
  Building2,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Ellipsis,
  FileText,
  House,
  LayoutGrid,
  LogOut,
  MessageCircle,
  SlidersHorizontal,
  ScrollText,
  ShieldCheck,
  Star,
  Tag,
  Users,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import '../admin-design.css';

// Shared: both hosts and admins - routes gated by requireHost (or weaker).
const sharedNavItems = [
  { path: '/admin', label: 'Dashboard', icon: LayoutGrid, exact: true },
  { path: '/admin/properties', label: 'Properties', icon: House },
  { path: '/admin/earnings', label: 'Earnings', icon: BarChart3 },
];

// Admin-only: backend is requireAdmin. Hosts must not see these - clicking
// them would 403. Separated from sharedNavItems so the host sidebar stays
// functional and doesn't invite users to dead-end pages.
const adminOnlyItems = [
  { path: '/admin/bookings', label: 'Bookings', icon: CalendarDays },
  { path: '/admin/users', label: 'Users & Hosts', icon: Users },
  { path: '/admin/host-applications', label: 'Host Applications', icon: FileText },
  { path: '/admin/trust-safety', label: 'Trust & Safety', icon: ShieldCheck },
  { path: '/admin/governance', label: 'Governance', icon: ScrollText },
  { path: '/admin/promos', label: 'Promo Codes', icon: Tag },
  { path: '/admin/addons', label: 'Add-ons', icon: SlidersHorizontal },
  { path: '/admin/guides', label: 'Guides', icon: BookOpen },
  { path: '/admin/feedback', label: 'Feedback', icon: Star },
  { path: '/admin/messages', label: 'Messages', icon: MessageCircle },
  { path: '/admin/payouts', label: 'Payouts', icon: Banknote },
];

const adminMobilePrimaryItems = [
  { path: '/admin', label: 'Overview', icon: LayoutGrid, exact: true },
  { path: '/admin/properties', label: 'Listings', icon: Building2 },
  { path: '/admin/users', label: 'People', icon: Users, matchPaths: ['/admin/users', '/admin/host-applications'] },
];

const hostMobilePrimaryItems = [
  { path: '/admin', label: 'Overview', icon: LayoutGrid, exact: true },
  { path: '/admin/properties', label: 'Listings', icon: Building2 },
  { path: '/admin/earnings', label: 'Earnings', icon: BarChart3 },
];


function SidebarFlyout({ active, label, target = 'control', children }) {
  if (!active) return children;

  return (
    <Tooltip
      arrow
      className="op-admin-sidebar-flyout"
      content={label}
      placement="right"
      style="light"
      theme={{ target: target === 'nav' ? 'mx-auto block w-11' : 'block w-full' }}
    >
      {children}
    </Tooltip>
  );
}

SidebarFlyout.propTypes = {
  active: PropTypes.bool,
  label: PropTypes.string.isRequired,
  target: PropTypes.oneOf(['control', 'nav']),
  children: PropTypes.node.isRequired,
};


function HeaderUserMenu({ user, isAdmin, onLogout }) {
  return (
    <Dropdown
      inline
      placement="bottom-end"
      className="op-admin-avatar-menu"
      theme={{ inlineWrapper: 'op-admin-avatar-trigger' }}
      label={(
        <>
          <span className="op-admin-avatar-trigger-avatar">
          {user?.avatar ? (
              <img src={user.avatar} alt="" />
          ) : (
            <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
          )}
          </span>
          <span className="op-admin-avatar-name">{user?.firstName}</span>
        </>
      )}
    >
      <DropdownHeader className="op-admin-avatar-header">
        <strong>{user?.firstName} {user?.lastName}</strong>
        <span>{user?.email}</span>
        <small>{isAdmin ? 'Admin' : 'Host'}</small>
      </DropdownHeader>
      <DropdownItem as={Link} to="/profile#info">My Profile</DropdownItem>
      {user?.role !== 'HOST' && <DropdownItem as={Link} to="/host/application">Become a host</DropdownItem>}
      <DropdownItem as={Link} to="/admin/messages">Messages</DropdownItem>
      <DropdownItem as={Link} to="/">Client view</DropdownItem>
      <DropdownDivider />
      <DropdownItem className="op-admin-dropdown-danger" onClick={onLogout}>Sign Out</DropdownItem>
    </Dropdown>
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
  const currentNavItem = [...navItems]
    .filter(({ path, exact }) => (exact
      ? location.pathname === path
      : location.pathname === path || location.pathname.startsWith(`${path}/`)))
    .sort((a, b) => b.path.length - a.path.length)[0];

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
        <nav className={`min-h-0 flex-1 overflow-y-auto gap-2 ${collapsed ? 'flex flex-col items-center' : 'px-3'}`}>
          {navItems.map(({ path, label, icon: NavIcon, exact }) => {
            const active = exact ? location.pathname === path : location.pathname.startsWith(path);
            return (
              <SidebarFlyout key={path} active={collapsed} label={label} target="nav">
                <Link
                  to={path}
                  aria-label={collapsed ? label : undefined}
                  aria-current={active ? 'page' : undefined}
                  className={`op-admin-nav-link flex items-center rounded-lg text-sm font-medium transition-all duration-200 ${
                    active
                      ? 'bg-[#E8EDF7] text-[#0B1F42]'
                      : 'text-[#414D63] hover:bg-[#F7F4EF]'
                  } ${collapsed ? 'justify-center w-11 h-11' : 'px-3 py-2'}`}
                >
                  <div className="relative">
                    <NavIcon className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
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
                  {!collapsed && <span className="ml-2">{label}</span>}
                </Link>
              </SidebarFlyout>
            );
          })}
        </nav>
        <div className={`op-admin-sidebar-account border-t border-white/10 ${collapsed ? 'flex flex-col items-center p-3' : 'p-5'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
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
          <SidebarFlyout active={collapsed} label="Sign Out">
            <button
              type="button"
              onClick={handleLogout}
              aria-label={collapsed ? 'Sign Out' : undefined}
              className={`flex items-center text-white/60 hover:text-white transition-colors mt-3 ${
                collapsed ? 'justify-center w-full text-base' : 'text-[15px]'
              }`}
            >
              <LogOut className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
              {!collapsed && <span className="ml-2.5">Sign Out</span>}
            </button>
          </SidebarFlyout>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className={`op-admin-sidebar-toggle ${collapsed ? 'is-collapsed' : 'is-expanded'}`}
          aria-expanded={!collapsed}
          aria-label={collapsed ? 'Expand admin sidebar' : 'Collapse admin sidebar'}
          title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            : <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
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
              <Bell className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
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
            const Icon = item.icon;
            return (
              <Link key={item.path} to={item.path} className={`op-admin-mobile-link ${active ? 'is-active' : ''}`} aria-current={active ? 'page' : undefined}>
                <Icon strokeWidth={1.5} aria-hidden="true" />
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
            <Ellipsis strokeWidth={2} aria-hidden="true" />
            <span>More</span>
          </button>
        </div>
      </nav>
      <Drawer
        id="admin-mobile-more-drawer"
        open={mobileMoreOpen}
        onClose={() => setMobileMoreOpen(false)}
        position="bottom"
        edge
        backdrop
        className="op-admin-flowbite-drawer md:hidden"
        theme={{ root: { backdrop: 'op-admin-flowbite-drawer-backdrop' } }}
        aria-label={`${isAdmin ? 'Admin' : 'Host'} workspace navigation`}
      >
        <DrawerHeader
          className="op-admin-mobile-more-head"
          title="zuri.admin"
          titleIcon={() => <img src={logoImg} alt="" />}
        />
        <p className="op-admin-mobile-more-label">{isAdmin ? 'Workspace navigation' : 'Host workspace'}</p>
        <DrawerItems className="op-admin-mobile-more-list">
          {mobileMoreItems.map(({ path, label, icon: NavIcon }) => {
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
                <NavIcon strokeWidth={1.5} aria-hidden="true" />
                <span>{displayLabel}</span>
                {path === '/admin/messages' && notif.unreadMessages > 0 && <small>{notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}</small>}
                {path === '/admin/bookings' && notif.pendingBookings > 0 && <small>{notif.pendingBookings > 99 ? '99+' : notif.pendingBookings}</small>}
              </Link>
            );
          })}
        </DrawerItems>
      </Drawer>

      {/* Main content */}
      <main
        className={`op-admin-main flex-1 transition-all duration-300 ${isMessageThreadRoute ? 'is-message-thread-route' : ''} ${
          collapsed ? 'md:ml-[72px]' : 'md:ml-[224px]'
        }`}
      >
        {/* Desktop workspace header */}
        <header className="op-admin-shell-header hidden md:flex">
          <div className="op-admin-shell-context">
            <span className="op-admin-shell-icon" aria-hidden="true">
              <LayoutGrid strokeWidth={2} />
            </span>
            <span className="op-admin-shell-copy">
              <small>{isAdmin ? 'Admin workspace' : 'Host workspace'}</small>
              <strong>{currentNavItem?.label || 'Dashboard'}</strong>
            </span>
          </div>
          <div className="op-admin-shell-actions">
            <ThemeToggle className="op-admin-shell-icon-button" />
            <div className="op-admin-shell-bell-wrap">
              <button
                type="button"
                className="op-admin-shell-icon-button"
                onClick={() => navigate(notif.pendingBookings > 0 ? '/admin/bookings' : '/admin/messages')}
                title={`${notif.unreadMessages} unread messages, ${notif.pendingBookings} pending bookings`}
                aria-label={`${notif.unreadMessages} unread messages and ${notif.pendingBookings} pending bookings`}
              >
                <Bell strokeWidth={2} aria-hidden="true" />
              </button>
              {(notif.unreadMessages > 0 || notif.pendingBookings > 0) && (
                <span className="op-admin-shell-count">
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
      <div className="op-admin-quick">
        <Dropdown inline label="Quick actions" placement="bottom-end" className="op-admin-quick-menu">
          {quickLinks.map((link) => <DropdownItem as={Link} key={link.to} to={link.to}>{link.label}</DropdownItem>)}
        </Dropdown>
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
    <div className="op-admin-secondary">
      <Accordion alwaysOpen className="op-admin-accordion">
        <AccordionPanel>
          <AccordionTitle>Platform metrics</AccordionTitle>
          <AccordionContent>
            <div className="op-admin-secondary-metrics"><span>Revenue (KES) <strong>{stats.revenue.toLocaleString()}</strong></span><span>Active promos <strong>{stats.promos}</strong></span></div>
          </AccordionContent>
        </AccordionPanel>
        {isAdmin && (
          <AccordionPanel>
            <AccordionTitle>Landing page statistics</AccordionTitle>
            <AccordionContent>
              <p>Set a value to 0 to use live review and booking data.</p>
              <form onSubmit={saveLandingStats} className="op-admin-stats-form">
                <label>Happy stays<TextInput type="number" min="0" value={landingStats.happyStays} onChange={(event) => setLandingStats({ ...landingStats, happyStays: event.target.value })} /></label>
                <label>Star rating<TextInput type="number" min="0" max="5" step="0.1" value={landingStats.starRating} onChange={(event) => setLandingStats({ ...landingStats, starRating: event.target.value })} /></label>
                <label>Satisfaction %<TextInput type="number" min="0" max="100" value={landingStats.satisfaction} onChange={(event) => setLandingStats({ ...landingStats, satisfaction: event.target.value })} /></label>
                <button type="submit" disabled={savingLanding}>{savingLanding ? 'Saving…' : 'Update'}</button>{landingMsg && <span role="status">{landingMsg}</span>}
              </form>
            </AccordionContent>
          </AccordionPanel>
        )}
      </Accordion>
    </div>
  </div>;
}
function AdminDashboard() {
  return <DashboardOverview />;
}

export { AdminLayout };
export default AdminDashboard;
