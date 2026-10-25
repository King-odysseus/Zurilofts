import { useState, useEffect, useRef } from 'react';
import BrandLogo from '../components/BrandLogo.jsx';
import PropTypes from 'prop-types';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import { playMessageSound } from '../utils/notificationSound.js';
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
  Bell,
  BookOpen,
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
  Users,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

// Admin scope is people and the platform. Listings appear only as the approval
// queue: hosts own create, edit, calendar, pricing, money and discounts, so
// those screens (and their nav entries) do not belong here.
const adminNavGroups = [
  {
    label: 'Overview',
    items: [
      { path: '/admin', label: 'Dashboard', icon: LayoutGrid, exact: true },
    ],
  },
  {
    label: 'People',
    items: [
      { path: '/admin/users', label: 'Users & Hosts', icon: Users },
      { path: '/admin/host-applications', label: 'Host Applications', icon: FileText },
      { path: '/admin/trust-safety', label: 'Trust & Safety', icon: ShieldCheck },
      { path: '/admin/messages', label: 'Messages', icon: MessageCircle },
    ],
  },
  {
    label: 'Platform',
    items: [
      { path: '/admin/properties', label: 'Listing approvals', icon: House },
      { path: '/admin/addons', label: 'Add-ons', icon: SlidersHorizontal },
      { path: '/admin/guides', label: 'Guides', icon: BookOpen },
      { path: '/admin/feedback', label: 'Feedback', icon: Star },
      { path: '/admin/governance', label: 'Governance', icon: ScrollText },
    ],
  },
];

const adminMobilePrimaryItems = [
  { path: '/admin', label: 'Overview', icon: LayoutGrid, exact: true },
  { path: '/admin/host-applications', label: 'Hosts', icon: FileText },
  { path: '/admin/users', label: 'People', icon: Users, matchPaths: ['/admin/users', '/admin/trust-safety'] },
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


function HeaderUserMenu({ user, onLogout }) {
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
        <small>Admin</small>
      </DropdownHeader>
      <DropdownItem as={Link} to="/profile#info">My Profile</DropdownItem>
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
  const isMessageThreadRoute = /^\/admin\/messages\/[^/]+$/.test(location.pathname);
  const navGroups = adminNavGroups;
  const navItems = navGroups.flatMap((group) => group.items);
  const mobilePrimaryItems = adminMobilePrimaryItems;
  const mobilePrimaryPaths = new Set(mobilePrimaryItems.map((item) => item.path));
  const mobileMoreItems = navItems.filter((item) => !mobilePrimaryPaths.has(item.path));
  const mobileNavLabels = {
    'Users & Hosts': 'Users',
    'Host Applications': 'Hosts',
    'Listing approvals': 'Approvals',
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

  // ── Notification polling (unread messages; bookings are a host concern) ──
  const [notif, setNotif] = useState({ unreadMessages: 0 });
  const lastNotifRef = useRef({ unreadMessages: 0 });

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const r = await apiClient.get('/notifications');
        if (!active) return;
        const d = r.data.data || {};
        const prev = lastNotifRef.current;

        // Play sound only when the unread count increased
        if (d.unreadMessages > prev.unreadMessages) playMessageSound();

        lastNotifRef.current = { unreadMessages: d.unreadMessages ?? 0 };
        setNotif({ unreadMessages: d.unreadMessages ?? 0 });
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
            <BrandLogo imgClassName="h-7 w-7 object-contain" />
            {!collapsed && <strong>zuri.admin</strong>}
          </Link>
        </div>
        {!collapsed && (
          <span className="block px-6 pb-4 text-[#C49A6C] text-xs font-semibold uppercase tracking-wider">
            Workspace
          </span>
        )}
        <nav className={`min-h-0 flex-1 overflow-y-auto gap-2 ${collapsed ? 'flex flex-col items-center' : 'px-3'}`}>
          {navGroups.map((group) => (
            <div className="op-admin-nav-group" key={group.label}>
              {!collapsed && <p className="op-admin-nav-group-label">{group.label}</p>}
              {group.items.map(({ path, label, icon: NavIcon, exact }) => {
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
                      </div>
                      {!collapsed && <span className="ml-2">{label}</span>}
                    </Link>
                  </SidebarFlyout>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={`op-admin-sidebar-account border-t border-white/10 ${collapsed ? 'flex flex-col items-center p-3' : 'p-5'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'space-x-3'}`}>
            <div className="w-8 h-8 bg-[#C49A6C] rounded-full flex items-center justify-center text-xs font-bold text-white">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="text-sm">
                <p className="font-medium">{user?.firstName}</p>
                <p className="text-white/50 text-xs">Admin</p>
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
            <BrandLogo imgClassName="h-6 w-6 object-contain" alt="" />
            <span>
              <strong>zuri.admin</strong>
              <small>Workspace</small>
            </span>
          </Link>
        </div>
        <div className="op-admin-mobile-actions">
          <ThemeToggle className="op-admin-mobile-theme" />
          <div className="relative">
            <button
              className="op-admin-mobile-bell"
              title={`${notif.unreadMessages} unread`}
              aria-label={`${notif.unreadMessages} unread messages`}
            >
              <Bell className="w-5 h-5" strokeWidth={2} aria-hidden="true" />
            </button>
            {notif.unreadMessages > 0 && (
              <span className="op-admin-mobile-count">
                {notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}
              </span>
            )}
          </div>
          <HeaderUserMenu user={user} onLogout={handleLogout} />
        </div>
      </div>
      <nav className="op-admin-mobile-nav md:hidden" aria-label="Admin workspace sections">
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
        aria-label="Admin workspace navigation"
      >
        <DrawerHeader
          className="op-admin-mobile-more-head"
          title="zuri.admin"
          titleIcon={() => <BrandLogo imgClassName="h-6 w-6 object-contain" alt="" />}
        />
        <p className="op-admin-mobile-more-label">Workspace navigation</p>
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
              <small>Admin workspace</small>
              <strong>{currentNavItem?.label || 'Dashboard'}</strong>
            </span>
          </div>
          <div className="op-admin-shell-actions">
            <ThemeToggle className="op-admin-shell-icon-button" />
            <div className="op-admin-shell-bell-wrap">
              <button
                type="button"
                className="op-admin-shell-icon-button"
                onClick={() => navigate('/admin/messages')}
                title={`${notif.unreadMessages} unread messages`}
                aria-label={`${notif.unreadMessages} unread messages`}
              >
                <Bell strokeWidth={2} aria-hidden="true" />
              </button>
              {notif.unreadMessages > 0 && (
                <span className="op-admin-shell-count">
                  {notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}
                </span>
              )}
            </div>
            <HeaderUserMenu user={user} onLogout={handleLogout} />
          </div>
        </header>
        <div className="op-admin-content p-4 md:p-8 pt-20 md:pt-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

// Admin overview: the numbers are accounts, applications and approvals.
// Bookings, earnings, payouts and discounts belong to the host workspace, so
// they are deliberately absent here.
function DashboardOverview() {
  const [summary, setSummary] = useState({
    applications: [],
    applicationsPending: 0,
    accounts: 0,
    listingsLive: 0,
    listingsPending: 0,
    verificationsPending: 0,
  });
  const [landingStats, setLandingStats] = useState({ happyStays: '10', starRating: '5.0', satisfaction: '0' });
  const [trendDays, setTrendDays] = useState(30);
  const [trend, setTrend] = useState(null);
  const [savingLanding, setSavingLanding] = useState(false);
  const [landingMsg, setLandingMsg] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      // Every list endpoint reports its own filtered total in `pagination`, so the
      // counts stay accurate without downloading whole tables. One failing panel
      // must not blank the others, hence the per-request fallbacks.
      const [applicationsRes, accountsRes, pendingListingsRes, liveListingsRes, verificationsRes, landingRes] =
        await Promise.all([
          apiClient.get('/admin/host-applications', { params: { status: 'SUBMITTED', limit: 5 } }).catch(() => null),
          apiClient.get('/admin/users', { params: { limit: 1 } }).catch(() => null),
          apiClient.get('/admin/properties', { params: { status: 'PENDING_REVIEW', limit: 1 } }).catch(() => null),
          apiClient.get('/admin/properties', { params: { status: 'PUBLISHED', limit: 1 } }).catch(() => null),
          apiClient.get('/admin/identity-verifications', { params: { status: 'SUBMITTED', limit: 1 } }).catch(() => null),
          apiClient.get('/admin/settings/landing-stats').catch(() => null),
        ]);
      if (!active) return;

      setSummary({
        applications: applicationsRes?.data?.data || [],
        applicationsPending: applicationsRes?.data?.pagination?.total ?? 0,
        accounts: accountsRes?.data?.pagination?.total ?? 0,
        listingsLive: liveListingsRes?.data?.pagination?.total ?? 0,
        listingsPending: pendingListingsRes?.data?.pagination?.total ?? 0,
        verificationsPending: verificationsRes?.data?.pagination?.total ?? 0,
      });

      const landing = landingRes?.data?.data;
      if (landing) {
        setLandingStats({
          happyStays: String(landing.happyStays ?? '10'),
          starRating: String(landing.starRating ?? '5.0'),
          satisfaction: String(landing.satisfaction ?? '0'),
        });
      }
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiClient.get('/admin/stats/signups', { params: { days: trendDays } })
      .then((res) => { if (active) setTrend(res.data?.data || null); })
      .catch(() => { if (active) setTrend(null); });
    return () => { active = false; };
  }, [trendDays]);

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
    { to: '/admin/host-applications', label: 'Review host applications' },
    { to: '/admin/users', label: 'Manage accounts' },
    { to: '/admin/properties', label: 'Open listing approvals' },
    { to: '/admin/trust-safety', label: 'Open trust and safety' },
  ];

  return <div className="op-admin-overview" data-openpencil-frame="0:6909">
    <div className="op-admin-heading"><div><p className="op-admin-eyebrow">ZURILOFTS · ADMIN · PEOPLE & PLATFORM</p><h1>Platform overview</h1><p>Host applications, accounts and listing approvals that need a decision. Listings, bookings and money are managed by hosts.</p></div>
      <div className="op-admin-quick">
        <Dropdown inline label="Quick actions" placement="bottom-end" className="op-admin-quick-menu">
          {quickLinks.map((link) => <DropdownItem as={Link} key={link.to} to={link.to}>{link.label}</DropdownItem>)}
        </Dropdown>
      </div>
    </div>
    <div className="op-admin-metrics">
      <article><span>HOST APPLICATIONS</span><strong>{summary.applicationsPending}</strong><small>Awaiting your review</small></article>
      <article><span>ACCOUNTS</span><strong>{summary.accounts}</strong><small>Guests and hosts</small></article>
      <article><span>LISTING APPROVALS</span><strong>{summary.listingsPending}</strong><small>Submitted by hosts</small></article>
      <article><span>IDENTITY CHECKS</span><strong>{summary.verificationsPending}</strong><small>Awaiting review</small></article>
    </div>
    <div className="op-admin-overview-grid">
      <section className="op-admin-priority"><div className="op-admin-panel-heading"><h2>Applications to review</h2><span>{summary.applicationsPending} open</span></div>
        {summary.applications.length ? summary.applications.map((application) => (
          <div className="op-admin-priority-row" key={application.id}>
            <div>
              <strong>{application.businessName || application.legalName || 'Host application'}</strong>
              <small>{application.user?.email || application.contactEmail || 'No email yet'}
                {application.submittedAt ? ` · ${new Date(application.submittedAt).toLocaleDateString()}` : ''}</small>
            </div>
            <span className="op-admin-urgent">Submitted</span>
            <Link to="/admin/host-applications">Open</Link>
          </div>
        )) : <div className="op-admin-empty"><strong>No applications waiting</strong><p>New host applications land here for review.</p><Link to="/admin/host-applications">Open host applications</Link></div>}
      </section>
      <section className="op-admin-trend">
        <div className="op-admin-panel-heading"><h2>New sign-ups</h2>
          <select aria-label="Sign-up date range" value={trendDays} onChange={(event) => setTrendDays(Number(event.target.value))}>
            <option value={7}>Last 7 days</option><option value={30}>Last 30 days</option><option value={90}>Last 90 days</option>
          </select>
        </div>
        {trend ? <>
          <p><strong>{trend.total}</strong> new accounts in the last {trend.days} days</p>
          <div className="op-admin-trend-bars" role="img" aria-label={`Daily sign-ups over the last ${trend.days} days`}>
            {trend.series.map((point) => <span key={point.date} title={`${point.date}: ${point.signups}`} style={{ height: `${Math.max(4, (point.signups / Math.max(1, ...trend.series.map((p) => p.signups))) * 100)}%` }} />)}
          </div>
        </> : <p>Trend data is unavailable right now.</p>}
      </section>
      <section className="op-admin-glance"><h2>Platform at a glance</h2><p><span>Live listings</span><strong>{summary.listingsLive}</strong></p><p><span>Awaiting approval</span><strong>{summary.listingsPending}</strong></p><p><span>Identity checks</span><strong>{summary.verificationsPending}</strong></p><Link to="/admin/properties">Open listing approvals</Link></section>
    </div>
    <div className="op-admin-secondary">
      <Accordion alwaysOpen className="op-admin-accordion">
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
      </Accordion>
    </div>
  </div>;
}

function AdminDashboard() {
  return <DashboardOverview />;
}

export { AdminLayout };
export default AdminDashboard;
