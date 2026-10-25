import { useState, useEffect, useRef } from 'react';
import BrandLogo from '../components/BrandLogo.jsx';
import PropTypes from 'prop-types';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
import { playMessageSound } from '../utils/notificationSound.js';
import {
  Accordion,
  AccordionContent,
  AccordionPanel,
  AccordionTitle,
  Button,
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
  ScrollText,
  Search,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  X,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';

// ---------------------------------------------------------------------------
// Shared Tailwind recipes
// The shell (sidebar, mobile drawer, dashboard cards) repeats the same surfaces
// many times over, so the recipes live here: retyping them per element is how
// the old stylesheet drifted apart in the first place.
// ---------------------------------------------------------------------------
const NAV_LINK_BASE = 'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors';
const NAV_LINK_ACTIVE = 'bg-primary font-semibold text-navy-bg';
const NAV_LINK_IDLE = 'text-white/80 hover:bg-white/10 hover:text-white';

const METRIC_CARD = 'rounded-xl border border-border bg-white p-5 shadow-sm';
const METRIC_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-muted';
const METRIC_VALUE = 'mt-2 block text-2xl font-bold text-navy';
const METRIC_NOTE = 'mt-1 block text-xs text-muted';

const PANEL = 'overflow-hidden rounded-xl border border-border bg-white shadow-sm';
const PANEL_HEAD = 'flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between';
const PANEL_TITLE = 'text-base font-semibold text-navy';
const PANEL_SUBTITLE = 'text-xs text-muted';
const LIST_ROW = 'flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between';
const EMPTY_STATE = 'flex flex-col items-center gap-2 px-5 py-12 text-center';

const ICON_BUTTON = 'grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-navy';

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

/**
 * Collapsed rail only: the nav label has no room in a 64px column, so it is
 * revealed as a tooltip. Flowbite's Tooltip positions itself with a fixed
 * strategy, which is what lets the flyout escape the sidebar's scroll container.
 */
function SidebarFlyout({ active, label, children }) {
  if (!active) return children;

  return (
    <Tooltip
      arrow
      className="rounded-xl border border-border bg-white px-3 py-2 text-sm font-medium text-navy shadow-lg"
      content={label}
      placement="right"
      style="light"
    >
      {children}
    </Tooltip>
  );
}

SidebarFlyout.propTypes = {
  active: PropTypes.bool,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};


function HeaderUserMenu({ user, onLogout }) {
  return (
    <Dropdown
      placement="bottom-end"
      className="w-60 border border-border shadow-lg"
      // The trigger is our own button: Flowbite's default inline wrapper has no
      // Tailwind hook on the element, so styling it through className is impossible.
      renderTrigger={() => (
        <button type="button" className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-surface">
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-xs font-bold text-navy-bg">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
            )}
          </span>
          <span className="text-sm font-semibold text-navy">{user?.firstName}</span>
        </button>
      )}
    >
      <DropdownHeader className="flex flex-col gap-0.5 px-3 py-2">
        <strong className="block w-full text-xs font-semibold text-navy">{user?.firstName} {user?.lastName}</strong>
        <span className="block w-full truncate text-[11px] text-muted">{user?.email}</span>
        <small className="block w-full text-[10px] font-bold uppercase tracking-wider text-primary-600">Admin</small>
      </DropdownHeader>
      <DropdownItem as={Link} to="/profile#info">My Profile</DropdownItem>
      <DropdownItem as={Link} to="/admin/messages">Messages</DropdownItem>
      <DropdownItem as={Link} to="/">Client view</DropdownItem>
      <DropdownDivider />
      <DropdownItem className="text-red-600" onClick={onLogout}>Sign Out</DropdownItem>
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


function AdminSearch() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], properties: [] });
  useEffect(() => {
    if (query.trim().length < 2) { setResults({ users: [], properties: [] }); return undefined; }
    let active = true;
    const timer = setTimeout(() => {
      apiClient.get('/admin/search', { params: { q: query } })
        .then((res) => { if (active) setResults(res.data?.data || { users: [], properties: [] }); })
        .catch(() => { if (active) setResults({ users: [], properties: [] }); });
    }, 250);
    return () => { active = false; clearTimeout(timer); };
  }, [query]);
  const hasResults = results.users.length > 0 || results.properties.length > 0;
  function go(path) { setQuery(''); navigate(path); }
  return (
    <div className="relative w-full max-w-md">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
      <TextInput type="search" sizing="sm" className="[&_input]:pl-9" placeholder="Search people and listings" aria-label="Search people and listings" value={query} onChange={(event) => setQuery(event.target.value)} />
      {query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl border border-border bg-white py-1 shadow-lg" role="listbox">
          {!hasResults && <p className="px-3 py-2 text-xs text-muted">No matches</p>}
          {results.users.map((u) => <button type="button" key={u.id} className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-surface" onClick={() => go(`/admin/users?search=${encodeURIComponent(u.email)}`)}><strong className="text-xs font-semibold text-navy">{u.firstName} {u.lastName}</strong><span className="text-[11px] text-muted">{u.email} · {u.role}</span></button>)}
          {results.properties.map((p) => <button type="button" key={p.id} className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-surface" onClick={() => go('/admin/properties')}><strong className="text-xs font-semibold text-navy">{p.title}</strong><span className="text-[11px] text-muted">{p.location} · {p.status}</span></button>)}
        </div>
      )}
    </div>
  );
}

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

  // Notification polling (unread messages; bookings are a host concern)
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

  // A message thread owns the phone viewport: the panel is sized to the screen,
  // so the outlet gutter drops its own padding and only clears the two fixed
  // bars (56px sticky header + 92px bottom nav) that frame it.
  const contentSpacing = isMessageThreadRoute
    ? 'pt-20 pb-[calc(92px_+_env(safe-area-inset-bottom))] lg:pt-6 lg:pb-6'
    : 'pt-6 pb-24 lg:pb-6';

  return (
    <div className="min-h-screen bg-surface text-charcoal">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-10 hidden flex-col border-r border-white/10 bg-navy-bg text-white transition-all duration-300 lg:flex ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        <div className={`flex shrink-0 items-center ${collapsed ? 'justify-center px-2 pb-4 pt-6' : 'justify-between px-5 pb-6 pt-6'}`}>
          <Link to="/" className="inline-flex items-center gap-2 text-white">
            <BrandLogo imgClassName="h-7 w-auto" />
            {!collapsed && <strong className="font-montserrat text-base font-bold tracking-tight">zuri.admin</strong>}
          </Link>
        </div>
        {!collapsed && (
          <span className="block shrink-0 px-6 pb-2 text-xs font-semibold uppercase tracking-wider text-primary">
            Workspace
          </span>
        )}
        <nav className={`flex min-h-0 flex-1 flex-col justify-between gap-3 overflow-y-auto pb-3 pt-3 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin] ${collapsed ? 'items-center px-2' : 'px-3'}`}>
          {navGroups.map((group) => (
            <div className="space-y-1.5" key={group.label}>
              {!collapsed && <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{group.label}</p>}
              {group.items.map(({ path, label, icon: NavIcon, exact }) => {
                const active = exact ? location.pathname === path : location.pathname.startsWith(path);
                return (
                  <SidebarFlyout key={path} active={collapsed} label={label}>
                    <Link
                      to={path}
                      aria-label={collapsed ? label : undefined}
                      aria-current={active ? 'page' : undefined}
                      className={`${NAV_LINK_BASE} ${active ? NAV_LINK_ACTIVE : NAV_LINK_IDLE} ${
                        collapsed ? 'h-11 w-11 justify-center' : 'px-3 py-2.5'
                      }`}
                    >
                      <div className="relative">
                        <NavIcon className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
                        {path === '/admin/messages' && notif.unreadMessages > 0 && (
                          <span className="absolute -right-2 -top-1.5 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                            {notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}
                          </span>
                        )}
                      </div>
                      {!collapsed && <span>{label}</span>}
                    </Link>
                  </SidebarFlyout>
                );
              })}
            </div>
          ))}
        </nav>
        <div className={`shrink-0 border-t border-white/10 ${collapsed ? 'flex flex-col items-center p-3' : 'px-5 py-5'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-navy-bg">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="text-sm">
                <p className="font-medium text-white">{user?.firstName}</p>
                <p className="text-xs text-white/50">Admin</p>
              </div>
            )}
          </div>
          <SidebarFlyout active={collapsed} label="Sign Out">
            <button
              type="button"
              onClick={handleLogout}
              aria-label={collapsed ? 'Sign Out' : undefined}
              className={`flex items-center text-white/60 transition-colors hover:text-white ${
                collapsed ? 'mt-3 h-10 w-10 justify-center text-base' : 'mt-3 text-[15px]'
              }`}
            >
              <LogOut className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              {!collapsed && <span className="ml-2.5">Sign Out</span>}
            </button>
          </SidebarFlyout>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          className="absolute left-full top-1/2 z-50 grid h-14 w-5 -translate-y-1/2 place-items-center rounded-r-lg bg-navy-bg text-white shadow-sm transition-colors hover:bg-white/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
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
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-2 border-b border-border bg-white px-4 lg:hidden">
        <div className="flex items-center">
          <Link to="/" className="inline-flex items-center gap-2">
            <BrandLogo imgClassName="h-6 w-auto" alt="" />
            <span className="flex flex-col leading-tight">
              <strong className="font-montserrat text-sm font-bold text-navy">zuri.admin</strong>
              <small className="text-[10px] uppercase tracking-wide text-muted">Workspace</small>
            </span>
          </Link>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle className={ICON_BUTTON} />
          <div className="relative">
            <button
              type="button"
              className={ICON_BUTTON}
              onClick={() => navigate('/admin/messages')}
              title={`${notif.unreadMessages} unread`}
              aria-label={`${notif.unreadMessages} unread messages`}
            >
              <Bell className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
            {notif.unreadMessages > 0 && (
              <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                {notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}
              </span>
            )}
          </div>
          <HeaderUserMenu user={user} onLogout={handleLogout} />
        </div>
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-30 flex items-center justify-around border-t border-border bg-white pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Admin workspace sections">
        {mobilePrimaryItems.map((item) => {
          const active = matchesMobilePrimary(item);
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${active ? 'text-primary-600' : 'text-muted hover:text-navy'}`}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" strokeWidth={1.5} aria-hidden="true" />
              <span>{item.label}</span>
            </Link>
          );
        })}
        <button
          type="button"
          className={`flex flex-1 flex-col items-center gap-1 py-2 text-[11px] font-medium transition-colors ${mobileMoreActive || mobileMoreOpen ? 'text-primary-600' : 'text-muted hover:text-navy'}`}
          onClick={() => setMobileMoreOpen(true)}
          aria-expanded={mobileMoreOpen}
          aria-controls="admin-mobile-more-drawer"
        >
          <Ellipsis className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          <span>More</span>
        </button>
      </nav>

      {/* Mobile "more" sheet: every section the bottom bar cannot fit */}
      {mobileMoreOpen && (
        <div
          id="admin-mobile-more-drawer"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label="Admin workspace navigation"
        >
          <button type="button" className="absolute inset-0 bg-navy-bg/40" aria-label="Close navigation" onClick={() => setMobileMoreOpen(false)} />
          <div className="absolute inset-y-0 left-0 flex w-72 flex-col bg-navy-bg p-4 text-white">
            <div className="flex items-center justify-between gap-2 border-b border-white/10 pb-3">
              <div className="inline-flex items-center gap-2">
                <BrandLogo imgClassName="h-6 w-auto" alt="" />
                <strong className="font-montserrat text-base font-bold tracking-tight">zuri.admin</strong>
              </div>
              <button
                type="button"
                className="grid h-9 w-9 place-items-center rounded-lg text-white/70 transition-colors hover:bg-white/10 hover:text-white"
                onClick={() => setMobileMoreOpen(false)}
                aria-label="Close navigation"
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <p className="px-1 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">Workspace navigation</p>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {mobileMoreItems.map(({ path, label, icon: NavIcon }) => {
                const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
                const displayLabel = mobileNavLabels[label] || label;
                return (
                  <Link
                    key={path}
                    to={path}
                    className={`${NAV_LINK_BASE} px-3 py-2.5 ${active ? NAV_LINK_ACTIVE : NAV_LINK_IDLE}`}
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setMobileMoreOpen(false)}
                  >
                    <NavIcon className="h-4 w-4 shrink-0" strokeWidth={1.5} aria-hidden="true" />
                    <span className="flex-1">{displayLabel}</span>
                    {path === '/admin/messages' && notif.unreadMessages > 0 && <small className="rounded-full bg-red-500 px-1.5 text-[10px] font-bold text-white">{notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}</small>}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className={`flex min-h-screen flex-1 flex-col transition-all duration-300 ${collapsed ? 'lg:pl-16' : 'lg:pl-64'}`}>
        {/* Desktop workspace header */}
        <header className="sticky top-0 z-30 hidden items-center justify-between gap-3 border-b border-border bg-white/95 px-4 py-3 backdrop-blur lg:flex lg:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary-50 text-navy" aria-hidden="true">
              <LayoutGrid className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="flex flex-col leading-tight">
              <small className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">Admin workspace</small>
              <strong className="text-sm font-semibold text-navy">{currentNavItem?.label || 'Dashboard'}</strong>
            </span>
          </div>
          <AdminSearch />
          <div className="flex items-center gap-2">
            <ThemeToggle className={ICON_BUTTON} />
            <div className="relative">
              <button
                type="button"
                className={ICON_BUTTON}
                onClick={() => navigate('/admin/messages')}
                title={`${notif.unreadMessages} unread messages`}
                aria-label={`${notif.unreadMessages} unread messages`}
              >
                <Bell className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
              {notif.unreadMessages > 0 && (
                <span className="absolute right-0 top-0 flex h-[18px] min-w-[18px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                  {notif.unreadMessages > 99 ? '99+' : notif.unreadMessages}
                </span>
              )}
            </div>
            <HeaderUserMenu user={user} onLogout={handleLogout} />
          </div>
        </header>
        <div className={`flex-1 px-4 lg:px-6 ${contentSpacing}`}>
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

  // Bars are scaled against the busiest day in the window, so a quiet week still
  // reads as a shape instead of a flat line at the bottom.
  const peakSignups = trend ? Math.max(1, ...trend.series.map((p) => p.signups)) : 1;

  return <div className="space-y-6" data-openpencil-frame="0:6909">
    <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · PEOPLE & PLATFORM</p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-3xl">Platform overview</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">Host applications, accounts and listing approvals that need a decision. Listings, bookings and money are managed by hosts.</p>
      </div>
      <div className="shrink-0">
        <Dropdown label="Quick actions" placement="bottom-end">
          {quickLinks.map((link) => <DropdownItem as={Link} key={link.to} to={link.to}>{link.label}</DropdownItem>)}
        </Dropdown>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <article className={METRIC_CARD}><span className={METRIC_LABEL}>HOST APPLICATIONS</span><strong className={METRIC_VALUE}>{summary.applicationsPending}</strong><small className={METRIC_NOTE}>Awaiting your review</small></article>
      <article className={METRIC_CARD}><span className={METRIC_LABEL}>ACCOUNTS</span><strong className={METRIC_VALUE}>{summary.accounts}</strong><small className={METRIC_NOTE}>Guests and hosts</small></article>
      <article className={METRIC_CARD}><span className={METRIC_LABEL}>LISTING APPROVALS</span><strong className={METRIC_VALUE}>{summary.listingsPending}</strong><small className={METRIC_NOTE}>Submitted by hosts</small></article>
      <article className={METRIC_CARD}><span className={METRIC_LABEL}>IDENTITY CHECKS</span><strong className={METRIC_VALUE}>{summary.verificationsPending}</strong><small className={METRIC_NOTE}>Awaiting review</small></article>
    </div>
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2.7fr)_minmax(245px,1fr)]">
      <section className={PANEL}>
        <div className={PANEL_HEAD}>
          <div>
            <h2 className={PANEL_TITLE}>Applications to review</h2>
          </div>
          <span className="inline-flex items-center self-start rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-700">{summary.applicationsPending} open</span>
        </div>
        {summary.applications.length ? summary.applications.map((application) => (
          <div className={LIST_ROW} key={application.id}>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold text-navy">{application.businessName || application.legalName || 'Host application'}</strong>
              <small className="mt-1 block truncate text-xs text-muted">{application.user?.email || application.contactEmail || 'No email yet'}
                {application.submittedAt ? ` · ${new Date(application.submittedAt).toLocaleDateString()}` : ''}</small>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-700">Submitted</span>
              <Button as={Link} to="/admin/host-applications" size="xs" color="light">Open</Button>
            </div>
          </div>
        )) : <div className={EMPTY_STATE}>
          <strong className="text-sm font-semibold text-navy">No applications waiting</strong>
          <p className={PANEL_SUBTITLE}>New host applications land here for review.</p>
          <Button as={Link} to="/admin/host-applications" size="sm" className="mt-2">Open host applications</Button>
        </div>}
      </section>
      <section className={PANEL}>
        <div className={PANEL_HEAD}>
          <h2 className={`${PANEL_TITLE} whitespace-nowrap`}>New sign-ups</h2>
          <SelectMenu
            sizing="sm"
            ariaLabel="Sign-up date range"
            value={String(trendDays)}
            onChange={(next) => setTrendDays(Number(next))}
            options={[{ value: '7', label: 'Last 7 days' }, { value: '30', label: 'Last 30 days' }, { value: '90', label: 'Last 90 days' }]}
            wrapperClassName="w-36 shrink-0"
          />
        </div>
        <div className="px-5 py-4">
          {trend ? <>
            <p className={PANEL_SUBTITLE}><strong className="mr-1 text-base font-bold text-navy">{trend.total}</strong>new accounts in the last {trend.days} days</p>
            {/* With no sign-ups every bar collapsed to a 4% stub, which read as a
                row of stray dots. Say so instead of drawing a chart with no data. */}
            {trend.total > 0 ? (
              <div className="mt-4 flex h-24 items-end gap-1" role="img" aria-label={`Daily sign-ups over the last ${trend.days} days`}>
                {trend.series.map((point) => <span key={point.date} title={`${point.date}: ${point.signups}`} className="flex-1 rounded-t bg-primary" style={{ height: `${Math.max(4, (point.signups / peakSignups) * 100)}%` }} />)}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                No sign-ups in the last {trend.days} days.
              </p>
            )}
          </> : <p className={PANEL_SUBTITLE}>Trend data is unavailable right now.</p>}
        </div>
      </section>
      <section className={PANEL}>
        <div className="border-b border-border px-5 py-4">
          <h2 className={PANEL_TITLE}>Platform at a glance</h2>
        </div>
        <div className="space-y-2 px-5 py-4">
          <p className="flex items-center justify-between text-xs text-muted"><span>Live listings</span><strong className="text-sm font-semibold text-navy">{summary.listingsLive}</strong></p>
          <p className="flex items-center justify-between text-xs text-muted"><span>Awaiting approval</span><strong className="text-sm font-semibold text-navy">{summary.listingsPending}</strong></p>
          <p className="flex items-center justify-between text-xs text-muted"><span>Identity checks</span><strong className="text-sm font-semibold text-navy">{summary.verificationsPending}</strong></p>
        </div>
        <div className="px-5 pb-5">
          <Button as={Link} to="/admin/properties" fullSized>Open listing approvals</Button>
        </div>
      </section>
    </div>
    <div>
      <Accordion alwaysOpen className="overflow-hidden rounded-xl border border-border bg-white shadow-sm">
        <AccordionPanel>
          <AccordionTitle className="text-navy">Landing page statistics</AccordionTitle>
          <AccordionContent>
            <p className={PANEL_SUBTITLE}>Set a value to 0 to use live review and booking data.</p>
            <form onSubmit={saveLandingStats} className="mt-3 flex flex-wrap items-end gap-3">
              <label className="grid gap-1 text-xs font-semibold text-navy">Happy stays<TextInput type="number" min="0" className="w-32" value={landingStats.happyStays} onChange={(event) => setLandingStats({ ...landingStats, happyStays: event.target.value })} /></label>
              <label className="grid gap-1 text-xs font-semibold text-navy">Star rating<TextInput type="number" min="0" max="5" step="0.1" className="w-32" value={landingStats.starRating} onChange={(event) => setLandingStats({ ...landingStats, starRating: event.target.value })} /></label>
              <label className="grid gap-1 text-xs font-semibold text-navy">Satisfaction %<TextInput type="number" min="0" max="100" className="w-32" value={landingStats.satisfaction} onChange={(event) => setLandingStats({ ...landingStats, satisfaction: event.target.value })} /></label>
              <Button type="submit" size="sm" disabled={savingLanding}>{savingLanding ? 'Saving...' : 'Update'}</Button>
              {landingMsg && <span role="status" className="text-xs font-semibold text-primary-700">{landingMsg}</span>}
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
