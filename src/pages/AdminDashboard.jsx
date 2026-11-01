import { Fragment, useState, useEffect, useRef } from 'react';
import BrandLogo from '../components/BrandLogo.jsx';
import PropTypes from 'prop-types';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';
import apiClient from '../api/client.js';
import SelectMenu from '../components/SelectMenu.jsx';
import ConfirmDialog from '../components/admin/ConfirmDialog.jsx';
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
  CalendarCheck,
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
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  Star,
  Users,
  Wallet,
  X,
} from 'lucide-react';
import ThemeToggle from '../components/ThemeToggle.jsx';
import LanguageSwitcher from '../components/LanguageSwitcher.jsx';

// ---------------------------------------------------------------------------
// Shared Tailwind recipes
// The shell (sidebar, mobile drawer, dashboard cards) repeats the same surfaces
// many times over, so the recipes live here: retyping them per element is how
// the old stylesheet drifted apart in the first place.
// ---------------------------------------------------------------------------
const NAV_LINK_BASE = 'flex items-center gap-3 rounded-lg text-sm font-medium transition-colors';
const NAV_LINK_ACTIVE = 'bg-primary font-semibold text-white';
const NAV_LINK_IDLE = 'text-white/80 hover:bg-white/10 hover:text-white';

const METRIC_CARD = 'rounded-xl bg-elevated shadow-md p-5';
const METRIC_LABEL = 'text-[11px] font-semibold uppercase tracking-wide text-muted';
const METRIC_VALUE = 'mt-2 block text-2xl font-bold text-navy';
const METRIC_NOTE = 'mt-1 block text-xs text-muted';

const PANEL = 'overflow-hidden rounded-xl bg-elevated shadow-md';
const PANEL_HEAD = 'flex flex-col gap-3 border-b border-border px-5 py-4 sm:flex-row sm:items-center sm:justify-between';
const PANEL_TITLE = 'text-base font-semibold text-navy';
const PANEL_SUBTITLE = 'text-xs text-muted';
const LIST_ROW = 'flex flex-col gap-3 border-b border-border px-5 py-4 last:border-0 sm:flex-row sm:items-center sm:justify-between';
const EMPTY_STATE = 'flex flex-col items-center gap-2 px-5 py-12 text-center';

const ICON_BUTTON = 'grid h-9 w-9 place-items-center rounded-lg text-muted transition-colors hover:bg-surface hover:text-navy';

// Dashboard content actions share one geometry: a 36px pill with 16px side
// padding and 13px/600 label. Flowbite's own size classes are merged out, and
// the hover is written as `enabled:hover:` so it replaces Flowbite's variant
// instead of stacking next to it. Primary is bronze with fixed navy ink (it
// must not flip in dark mode), secondary is white on the shared border token.
const BTN_BASE = 'h-9 w-fit rounded-full px-4 text-[13px] font-semibold';
const BTN_PRIMARY = `${BTN_BASE} bg-primary text-white enabled:hover:bg-[#16294B]`;
const BTN_SECONDARY = `${BTN_BASE} border border-border bg-white text-navy enabled:hover:bg-surface`;

// Status and count pills share one geometry so a badge never drifts from the
// pill beside it; only the tone (bronze for counts, red for attention) differs.
const PILL = 'inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold';

// Admin scope is people and the platform. Listings appear only as the approval
// queue: hosts own create, edit, calendar, pricing, money and discounts, so
// those screens (and their nav entries) do not belong here.
// `label` holds a dictionary key, not display text: the same arrays feed the
// sidebar, the phone bar and the "more" sheet, so each surface resolves the key
// with t() where it renders.
const adminNavGroups = [
  {
    label: 'admin.groupOverview',
    items: [
      { path: '/admin', label: 'admin.navDashboard', icon: LayoutGrid, exact: true },
    ],
  },
  {
    label: 'admin.groupPeople',
    items: [
      { path: '/admin/users', label: 'admin.navUsers', icon: Users },
      { path: '/admin/host-applications', label: 'admin.navHostApplications', icon: FileText },
      { path: '/admin/trust-safety', label: 'admin.navTrustSafety', icon: ShieldCheck },
      { path: '/admin/messages', label: 'admin.navMessages', icon: MessageCircle },
    ],
  },
  {
    label: 'admin.groupPlatform',
    items: [
      { path: '/admin/revenue', label: 'admin.navRevenue', icon: Wallet },
      { path: '/admin/bookings', label: 'admin.navReservations', icon: CalendarCheck },
      { path: '/admin/listings', label: 'admin.navListingApprovals', icon: House },
      { path: '/admin/addons', label: 'admin.navAddons', icon: SlidersHorizontal },
      { path: '/admin/guides', label: 'admin.navGuides', icon: BookOpen },
      { path: '/admin/feedback', label: 'admin.navReviews', icon: Star },
      { path: '/admin/governance', label: 'admin.navGovernance', icon: ScrollText },
    ],
  },
  {
    // Last because it is about the admin's own account, not the platform. Without
    // this entry the page is only reachable from the avatar menu, which is the
    // one place a moderator looks last when hunting for settings.
    label: 'admin.groupAccount',
    items: [
      { path: '/admin/settings', label: 'admin.navAccountSettings', icon: Settings, exact: true },
    ],
  },
];

const adminMobilePrimaryItems = [
  { path: '/admin', label: 'admin.groupOverview', icon: LayoutGrid, exact: true },
  { path: '/admin/host-applications', label: 'admin.mobileHosts', icon: FileText },
  { path: '/admin/users', label: 'admin.groupPeople', icon: Users, matchPaths: ['/admin/users', '/admin/trust-safety'] },
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
      className="z-[70] whitespace-nowrap rounded-lg border-0 bg-navy-bg px-2.5 py-1.5 text-xs font-semibold text-white shadow-lg"
      content={label}
      placement="right"
      style="dark"
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
  const { t } = useLanguage();
  return (
    <Dropdown
      placement="bottom-end"
      className="w-60 shadow-lg"
      // The trigger is our own button: Flowbite's default inline wrapper has no
      // Tailwind hook on the element, so styling it through className is impossible.
      renderTrigger={() => (
        <button type="button" className="flex items-center gap-2 rounded-lg p-1.5 transition-colors hover:bg-surface">
          <span className="grid h-8 w-8 shrink-0 place-items-center overflow-hidden rounded-full bg-primary text-xs font-bold text-white">
            {user?.avatar ? (
              <img src={user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
            ) : (
              <>{user?.firstName?.[0]}{user?.lastName?.[0]}</>
            )}
          </span>
          <span className="hidden max-w-[9rem] truncate text-sm font-semibold text-navy sm:inline">{user?.firstName}</span>
        </button>
      )}
    >
      <DropdownHeader className="flex flex-col gap-0.5 px-3 py-2">
        <strong className="block w-full text-xs font-semibold text-navy">{user?.firstName} {user?.lastName}</strong>
        <span className="block w-full truncate text-[11px] text-muted">{user?.email}</span>
        <small className="block w-full text-[10px] font-bold uppercase tracking-wider text-primary-600">{t('admin.adminRole')}</small>
      </DropdownHeader>
      <DropdownItem as={Link} to="/admin/settings">{t('admin.navAccountSettings')}</DropdownItem>
      <DropdownItem as={Link} to="/admin/messages">{t('admin.navMessages')}</DropdownItem>
      {/* The public site is a different product surface: a fresh tab keeps the
          workspace (and any half-finished review) exactly where it was. A plain
          anchor is deliberate: DropdownItem swallows the target on a Link, which
          turned this into a same-tab jump out of the admin workspace. */}
      <DropdownItem as="a" href="/" target="_blank" rel="noreferrer">{t('admin.menuPublicSite')}</DropdownItem>
      <DropdownDivider />
      <DropdownItem className="text-red-600" onClick={onLogout}>{t('admin.signOut')}</DropdownItem>
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
  const { t } = useLanguage();
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
    <div className="relative w-full max-w-md [&_input]:border-0 [&_input]:bg-surface [&_input]:pl-9">
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={1.8} aria-hidden="true" />
      <TextInput type="search" sizing="sm" placeholder={t('admin.searchPlaceholder')} aria-label={t('admin.searchPlaceholder')} value={query} onChange={(event) => setQuery(event.target.value)} />
      {query.trim().length >= 2 && (
        <div className="absolute inset-x-0 top-full z-40 mt-1 overflow-hidden rounded-xl bg-elevated py-1 shadow-lg" role="listbox">
          {!hasResults && <p className="px-3 py-2 text-xs text-muted">{t('admin.noMatches')}</p>}
          {results.users.map((u) => <button type="button" key={u.id} className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-surface" onClick={() => go(`/admin/users?search=${encodeURIComponent(u.email)}`)}><strong className="text-xs font-semibold text-navy">{u.firstName} {u.lastName}</strong><span className="text-[11px] text-muted">{u.email} · {u.role}</span></button>)}
          {results.properties.map((p) => <button type="button" key={p.id} className="flex w-full flex-col gap-0.5 px-3 py-2 text-left transition-colors hover:bg-surface" onClick={() => go(`/admin/listings/${p.id}`)}><strong className="text-xs font-semibold text-navy">{p.title}</strong><span className="text-[11px] text-muted">{p.location} · {p.status}</span></button>)}
        </div>
      )}
    </div>
  );
}

function AdminLayout() {
  const { t } = useLanguage();
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
  // Short forms for the phone bar and the "more" sheet: each full nav key maps
  // to the label that fits in that space.
  const mobileNavLabels = {
    'admin.navUsers': 'admin.shortUsers',
    'admin.navHostApplications': 'admin.mobileHosts',
    'admin.navListingApprovals': 'admin.shortListingApprovals',
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
    // Named timer, not t: t is the translate function from useLanguage here.
    const timer = setInterval(poll, 25000);
    return () => { active = false; clearInterval(timer); };
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

  // The admin workspace is the one shell with its own phone bar (it does not use
  // MobileBottomNav), so it must clear that bar itself. The two numbers below are
  // one contract: the bar's 58px height plus the page's 24px py-6 gutter. The bar
  // carries the matching min-h-[58px], so change them together.
  const contentSpacing = isMessageThreadRoute
    ? 'pt-20 pb-[calc(92px_+_env(safe-area-inset-bottom))] lg:pt-6 lg:pb-6'
    : 'pt-6 pb-[calc(58px_+_env(safe-area-inset-bottom))] lg:pb-6';

  return (
    <div className="min-h-screen bg-canvas text-charcoal">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-10 hidden flex-col border-r border-white/10 bg-navy-bg text-white transition-all duration-300 lg:flex ${
          collapsed ? 'w-16' : 'w-64'
        }`}
      >
        {/* Brand sits in its own band: more room above than below so it reads as the top of the column, and a hairline closes the band so the Workspace label below starts a new section instead of floating under the logo. */}
        <div className={`flex shrink-0 items-center border-b border-white/10 ${collapsed ? 'justify-center px-2 pb-5 pt-7' : 'justify-between px-6 pb-5 pt-7'}`}>
          {/* The brand stays inside the workspace: an admin who clicks the logo
              wants the dashboard, not the guest home page. */}
          <Link to="/admin" className="inline-flex items-center gap-2 text-white">
            <BrandLogo imgClassName="h-7 w-auto" />
            {!collapsed && <strong className="font-montserrat text-base font-bold tracking-tight">zuri.admin</strong>}
          </Link>
        </div>
        {!collapsed && (
          <span className="block shrink-0 px-6 pb-1 pt-4 text-xs font-semibold uppercase tracking-wider text-primary">
            {t('admin.workspace')}
          </span>
        )}
        {/* Rows sit close together so the menu reads as one block. The breathing room lives in each group label's top padding instead of in stretched gaps, so sections stay distinct without the column going sparse. */}
        {/* Children are flat (label, items, label, items), so justify-between shares
            the leftover height across twelve small gaps rather than pooling it into
            one band above the account block, which reached 111px at 900px tall and
            411px at 1200px. */}
        <nav className={`flex min-h-0 flex-1 flex-col gap-0.5 overflow-y-auto pb-4 pt-1 [scrollbar-color:rgba(255,255,255,0.22)_transparent] [scrollbar-width:thin] ${collapsed ? 'items-center px-2' : 'justify-between px-3'}`}>
          {navGroups.map((group, groupIndex) => (
            <Fragment key={group.label}>
              {collapsed ? (groupIndex > 0 && <span className="my-2.5 h-px w-6 bg-white/15" aria-hidden="true" />) : (<p className="px-3 pb-1.5 pt-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/40">{t(group.label)}</p>)}
              {group.items.map(({ path, label, icon: NavIcon, exact }) => {
                const active = exact ? location.pathname === path : location.pathname.startsWith(path);
                const text = t(label);
                return (
                  <SidebarFlyout key={path} active={collapsed} label={text}>
                    <Link
                      to={path}
                      aria-label={collapsed ? text : undefined}
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
                      {!collapsed && <span>{text}</span>}
                    </Link>
                  </SidebarFlyout>
                );
              })}
            </Fragment>
          ))}
        </nav>
        <div className={`shrink-0 border-t border-white/10 ${collapsed ? 'flex flex-col items-center p-3' : 'px-5 py-5'}`}>
          <div className={`flex items-center ${collapsed ? 'justify-center' : 'gap-3'}`}>
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-white">
              {user?.firstName?.[0]}{user?.lastName?.[0]}
            </div>
            {!collapsed && (
              <div className="text-sm">
                <p className="font-medium text-white">{user?.firstName}</p>
                <p className="text-xs text-white/50">{t('admin.adminRole')}</p>
              </div>
            )}
          </div>
          <SidebarFlyout active={collapsed} label={t('admin.signOut')}>
            <button
              type="button"
              onClick={handleLogout}
              aria-label={collapsed ? t('admin.signOut') : undefined}
              className={`flex items-center text-white/60 transition-colors hover:text-white ${
                collapsed ? 'mt-3 h-10 w-10 justify-center text-base' : 'mt-3 text-[15px]'
              }`}
            >
              <LogOut className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              {!collapsed && <span className="ml-2.5">{t('admin.signOut')}</span>}
            </button>
          </SidebarFlyout>
        </div>
        <button
          type="button"
          onClick={toggleSidebar}
          // This handle sits at left-full: it hangs outside the navy column, over the
          // white page. A translucent hover (bg-white/10) replaces the navy fill
          // instead of lightening it, so over white the handle vanished. The hover
          // must stay an opaque navy.
          className="absolute left-full top-1/2 z-50 grid h-14 w-5 -translate-y-1/2 place-items-center rounded-r-lg bg-navy-bg text-white shadow-sm transition-colors hover:bg-navy-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          aria-expanded={!collapsed}
          aria-label={collapsed ? t('admin.expandSidebar') : t('admin.collapseSidebar')}
          title={collapsed ? t('admin.expandSidebarShort') : t('admin.collapseSidebarShort')}
        >
          {collapsed
            ? <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
            : <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />}
        </button>
      </aside>

      {/* Mobile header and floating section nav.
          Everything in this row must be able to shrink: the logo lockup, the
          wordmark and a long admin first name are all content-sized, and at 320px
          (or with a long translated wordmark) they used to push the page wider
          than the screen. */}
      <div className="sticky top-0 z-30 flex h-14 items-center justify-between gap-1.5 border-b border-border bg-elevated px-3 sm:gap-2 sm:px-4 lg:hidden">
        <div className="flex min-w-0 items-center">
          <Link to="/admin" className="flex min-w-0 items-center gap-2">
            <BrandLogo imgClassName="h-6 w-auto shrink-0" alt="" />
            <span className="flex min-w-0 flex-col leading-tight">
              <strong className="truncate font-montserrat text-sm font-bold text-navy">zuri.admin</strong>
              <small className="truncate text-[10px] uppercase tracking-wide text-muted">{t('admin.workspace')}</small>
            </span>
          </Link>
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          <ThemeToggle className={ICON_BUTTON} />
          <LanguageSwitcher triggerClassName={ICON_BUTTON} />
          <div className="relative">
            <button
              type="button"
              className={ICON_BUTTON}
              onClick={() => navigate('/admin/messages')}
              title={t('admin.unread', { count: notif.unreadMessages })}
              aria-label={t('admin.unreadMessages', { count: notif.unreadMessages })}
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
      {/* min-h-[58px] is half of the clearance contract in contentSpacing. */}
      <nav className="fixed inset-x-0 bottom-0 z-30 flex min-h-[58px] items-center justify-around border-t border-border bg-elevated pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label={t('admin.adminWorkspaceSections')}>
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
              <span>{t(item.label)}</span>
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
          <span>{t('common.more')}</span>
        </button>
      </nav>

      {/* Mobile "more" sheet: every section the bottom bar cannot fit */}
      {mobileMoreOpen && (
        <div
          id="admin-mobile-more-drawer"
          className="fixed inset-0 z-50 lg:hidden"
          role="dialog"
          aria-modal="true"
          aria-label={t('admin.adminWorkspaceNav')}
        >
          <button type="button" className="absolute inset-0 bg-navy-bg/40" aria-label={t('admin.closeNav')} onClick={() => setMobileMoreOpen(false)} />
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
                aria-label={t('admin.closeNav')}
              >
                <X className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <p className="px-1 pb-2 pt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/50">{t('admin.workspaceNav')}</p>
            <div className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto">
              {mobileMoreItems.map(({ path, label, icon: NavIcon }) => {
                const active = location.pathname === path || location.pathname.startsWith(`${path}/`);
                const displayLabel = t(mobileNavLabels[label] || label);
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
        <header className="sticky top-0 z-30 hidden items-center justify-between gap-3 border-b border-border bg-elevated/95 px-4 py-3 backdrop-blur lg:flex lg:px-6">
          <div className="flex items-center gap-3">
            <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/15 text-navy" aria-hidden="true">
              <LayoutGrid className="h-4 w-4" strokeWidth={2} />
            </span>
            <span className="flex flex-col leading-tight">
              <small className="text-[10px] font-semibold uppercase tracking-[0.14em] text-muted">{t('admin.adminWorkspace')}</small>
              <strong className="text-sm font-semibold text-navy">{t(currentNavItem?.label || 'admin.navDashboard')}</strong>
            </span>
          </div>
          <AdminSearch />
          <div className="flex items-center gap-2">
            <ThemeToggle className={ICON_BUTTON} />
          <LanguageSwitcher triggerClassName={ICON_BUTTON} />
            <div className="relative">
              <button
                type="button"
                className={ICON_BUTTON}
                onClick={() => navigate('/admin/messages')}
                title={t('admin.unreadMessages', { count: notif.unreadMessages })}
                aria-label={t('admin.unreadMessages', { count: notif.unreadMessages })}
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
  const { t } = useLanguage();
  const [summary, setSummary] = useState({
    applications: [],
    applicationsPending: 0,
    accounts: 0,
    listingsLive: 0,
    listingsPending: 0,
    verificationsPending: 0,
  });
  const [landingStats, setLandingStats] = useState({ starRating: '5.0', satisfaction: '0' });
  // Happy stays is not editable, so it is read from the public summary instead.
  const [liveStays, setLiveStays] = useState(null);
  const [trendDays, setTrendDays] = useState(30);
  const [trend, setTrend] = useState(null);
  const [savingLanding, setSavingLanding] = useState(false);
  const [landingMsg, setLandingMsg] = useState('');
  // A failed fetch used to render as a zero, so an outage looked like "no
  // accounts, nothing pending". These record which panels could not be read.
  const [summaryFailed, setSummaryFailed] = useState(false);
  const [trendError, setTrendError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      // Every list endpoint reports its own filtered total in `pagination`, so the
      // counts stay accurate without downloading whole tables. One failing panel
      // must not blank the others, hence the per-request fallbacks.
      const [applicationsRes, accountsRes, pendingListingsRes, liveListingsRes, verificationsRes, landingRes, staysRes] =
        await Promise.all([
          apiClient.get('/admin/host-applications', { params: { status: 'SUBMITTED', limit: 5 } }).catch(() => null),
          apiClient.get('/admin/users', { params: { limit: 1 } }).catch(() => null),
          apiClient.get('/admin/properties', { params: { status: 'PENDING_REVIEW', limit: 1 } }).catch(() => null),
          apiClient.get('/admin/properties', { params: { status: 'PUBLISHED', limit: 1 } }).catch(() => null),
          apiClient.get('/admin/identity-verifications', { params: { status: 'SUBMITTED', limit: 1 } }).catch(() => null),
          apiClient.get('/admin/settings/landing-stats').catch(() => null),
          apiClient.get('/reviews/summary').catch(() => null),
        ]);
      if (!active) return;

      // Anything that failed to load is named rather than counted as zero.
      setSummaryFailed(!applicationsRes || !accountsRes || !pendingListingsRes || !liveListingsRes || !verificationsRes);

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
          starRating: String(landing.starRating ?? '5.0'),
          satisfaction: String(landing.satisfaction ?? '0'),
        });
      }

      // Read from the same public summary the landing page uses, so the figure
      // shown to an admin is exactly the one a visitor sees.
      const stays = staysRes?.data?.data?.happyStays;
      setLiveStays(typeof stays === 'number' ? stays : null);
    }
    load();
    return () => { active = false; };
  }, []);

  useEffect(() => {
    let active = true;
    apiClient.get('/admin/stats/signups', { params: { days: trendDays } })
      .then((res) => { if (active) { setTrend(res.data?.data || null); setTrendError(''); } })
      .catch((cause) => {
        if (!active) return;
        // Keep the failure visible: an empty chart is indistinguishable from a
        // day with genuinely no signups.
        setTrend(null);
        setTrendError(cause.response?.data?.error || t('admin.trendError'));
      });
    return () => { active = false; };
  }, [trendDays, t]);

  // Submitting the form asks first; the dialog is what actually calls the API,
  // because these figures publish straight to the marketing page.
  function saveLandingStats(e) {
    if (e) e.preventDefault();
    setLandingConfirm(true);
  }

  async function publishLandingStats() {
    setSavingLanding(true); setLandingMsg('');
    try {
      await apiClient.put('/admin/settings/landing-stats', { starRating: Number(landingStats.starRating), satisfaction: Number(landingStats.satisfaction) });
      setLandingMsg(t('admin.saved'));
    } catch (err) { setLandingMsg(err.response?.data?.error || t('admin.saveFailed')); }
    finally { setSavingLanding(false); setLandingConfirm(false); }
  }

  const [landingConfirm, setLandingConfirm] = useState(false);

  const quickLinks = [
    { to: '/admin/host-applications', label: 'admin.quickReviewApplications' },
    { to: '/admin/users', label: 'admin.quickManageAccounts' },
    { to: '/admin/listings', label: 'admin.quickOpenApprovals' },
    { to: '/admin/trust-safety', label: 'admin.quickOpenTrustSafety' },
  ];

  // Bars are scaled against the busiest day in the window, so a quiet week still
  // reads as a shape instead of a flat line at the bottom.
  const peakSignups = trend ? Math.max(1, ...trend.series.map((p) => p.signups)) : 1;

  return <div className="space-y-8">
    <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{t('admin.platformOverview')}</h1>
        <p className="mt-1 max-w-3xl text-sm leading-relaxed text-muted">{t('admin.platformOverviewLede')}</p>
      </div>
      <div className="shrink-0">
        <Dropdown
          label={t('admin.quickActions')}
          placement="bottom-end"
          // Flowbite's default trigger has no Tailwind hook on the element, so the
          // pill is rendered by us: same pattern as the header user menu above.
          renderTrigger={() => (
            <button type="button" className={BTN_SECONDARY}>{t('admin.quickActions')}</button>
          )}
        >
          {quickLinks.map((link) => <DropdownItem as={Link} key={link.to} to={link.to}>{t(link.label)}</DropdownItem>)}
        </Dropdown>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
      <article className={METRIC_CARD}><span className={METRIC_LABEL}>{t('admin.metricHostApplications')}</span><strong className={METRIC_VALUE}>{summary.applicationsPending}</strong><small className={METRIC_NOTE}>{t('admin.noteAwaitingReview')}</small></article>
      <article className={METRIC_CARD}><span className={METRIC_LABEL}>{t('admin.metricAccounts')}</span><strong className={METRIC_VALUE}>{summary.accounts}</strong><small className={METRIC_NOTE}>{t('admin.noteGuestsAndHosts')}</small></article>
      <article className={METRIC_CARD}><span className={METRIC_LABEL}>{t('admin.metricListingApprovals')}</span><strong className={METRIC_VALUE}>{summary.listingsPending}</strong><small className={METRIC_NOTE}>{t('admin.noteSubmittedByHosts')}</small></article>
      <article className={METRIC_CARD}><span className={METRIC_LABEL}>{t('admin.metricIdentityChecks')}</span><strong className={METRIC_VALUE}>{summary.verificationsPending}</strong><small className={METRIC_NOTE}>{t('admin.noteAwaitingReviewShort')}</small></article>
    </div>
    {summaryFailed && (
      <p className="rounded-lg border border-[#FECDCA] bg-[#FEF3F2] px-4 py-3 text-center text-sm font-medium text-[#B42318] dark:border-[#B42318]/40 dark:bg-[#B42318]/15 dark:text-[#FECDCA]" role="alert">
        {t('admin.figuresFailed')}
      </p>
    )}
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,2.7fr)_minmax(245px,1fr)]">
      <section className={PANEL}>
        <div className={PANEL_HEAD}>
          <div>
            <h2 className={PANEL_TITLE}>{t('admin.applicationsToReview')}</h2>
          </div>
          <span className={`self-start ${PILL} bg-primary-50 text-primary-700`}>{t('admin.openCount', { count: summary.applicationsPending })}</span>
        </div>
        {summary.applications.length ? summary.applications.map((application) => (
          <div className={LIST_ROW} key={application.id}>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm font-semibold text-navy">{application.businessName || application.legalName || t('admin.hostApplicationFallback')}</strong>
              <small className="mt-1 block truncate text-xs text-muted">{application.user?.email || application.contactEmail || t('admin.noEmailYet')}
                {application.submittedAt ? ` · ${new Date(application.submittedAt).toLocaleDateString()}` : ''}</small>
            </div>
            <div className="flex items-center gap-3">
              <span className={`${PILL} bg-red-50 text-red-700`}>{t('admin.submitted')}</span>
              <Button as={Link} to="/admin/host-applications" size="sm" color="light" className={BTN_SECONDARY}>{t('admin.open')}</Button>
            </div>
          </div>
        )) : <div className={EMPTY_STATE}>
          <strong className="text-sm font-semibold text-navy">{t('admin.noApplicationsWaiting')}</strong>
          <p className={PANEL_SUBTITLE}>{t('admin.noApplicationsHint')}</p>
          <Button as={Link} to="/admin/host-applications" size="sm" className={`mt-2 ${BTN_PRIMARY}`}>{t('admin.openHostApplications')}</Button>
        </div>}
      </section>
      <section className={PANEL}>
        <div className={PANEL_HEAD}>
          <h2 className={`${PANEL_TITLE} whitespace-nowrap`}>{t('admin.newSignups')}</h2>
          <SelectMenu
            sizing="sm"
            ariaLabel={t('admin.signupRange')}
            value={String(trendDays)}
            onChange={(next) => setTrendDays(Number(next))}
            options={[{ value: '7', label: t('admin.last7Days') }, { value: '30', label: t('admin.last30Days') }, { value: '90', label: t('admin.last90Days') }]}
            wrapperClassName="w-36 shrink-0"
          />
        </div>
        <div className="px-5 py-4">
          {trend ? <>
            <p className={PANEL_SUBTITLE}><strong className="mr-1 text-base font-bold text-navy">{trend.total}</strong>{t('admin.newAccountsSuffix', { days: trend.days })}</p>
            {/* With no sign-ups every bar collapsed to a 4% stub, which read as a
                row of stray dots. Say so instead of drawing a chart with no data. */}
            {trend.total > 0 ? (
              <div className="mt-4 flex h-24 items-end gap-1" role="img" aria-label={t('admin.dailySignups', { days: trend.days })}>
                {trend.series.map((point) => <span key={point.date} title={`${point.date}: ${point.signups}`} className="flex-1 rounded-t bg-primary" style={{ height: `${Math.max(4, (point.signups / peakSignups) * 100)}%` }} />)}
              </div>
            ) : (
              <p className="mt-4 rounded-lg border border-dashed border-border px-4 py-6 text-center text-xs text-muted">
                {t('admin.noSignups', { days: trend.days })}
              </p>
            )}
          </> : <p className={PANEL_SUBTITLE} role={trendError ? 'alert' : undefined}>{trendError || t('admin.trendUnavailable')}</p>}
        </div>
      </section>
      <section className={PANEL}>
        <div className={PANEL_HEAD}>
          <h2 className={PANEL_TITLE}>{t('admin.platformGlance')}</h2>
        </div>
        <div className="space-y-3 px-5 py-4">
          <p className="flex items-center justify-between text-xs text-muted"><span>{t('admin.liveListings')}</span><strong className="text-sm font-semibold text-navy">{summary.listingsLive}</strong></p>
          <p className="flex items-center justify-between text-xs text-muted"><span>{t('admin.awaitingApproval')}</span><strong className="text-sm font-semibold text-navy">{summary.listingsPending}</strong></p>
          <p className="flex items-center justify-between text-xs text-muted"><span>{t('admin.identityChecks')}</span><strong className="text-sm font-semibold text-navy">{summary.verificationsPending}</strong></p>
        </div>
        <div className="px-5 pb-5">
          <Button as={Link} to="/admin/listings" size="sm" className={BTN_PRIMARY}>{t('admin.quickOpenApprovals')}</Button>
        </div>
      </section>
    </div>
    <div>
      {/* `!border-0` is deliberate: the accordion's own theme still draws a
          hairline, and this component ignores a theme override for it, so the
          only place the outline can be cleared is here. The shadow carries the
          elevation instead. */}
      <Accordion alwaysOpen className="overflow-hidden rounded-xl bg-elevated shadow-md !border-0">
        <AccordionPanel>
          <AccordionTitle className="bg-elevated text-navy [&>button]:bg-elevated">{t('admin.landingStats')}</AccordionTitle>
          <AccordionContent>
            <p className={PANEL_SUBTITLE}>{t('admin.landingStatsHint')}</p>
            {/* These numbers are published on the marketing page, so the form
                says so and asks before overwriting them. */}
            <p className="mt-3 rounded-lg border border-[#FEDF89] bg-[#FFFAEB] px-3 py-2 text-xs leading-relaxed text-[#B54708] dark:border-[#B54708]/40 dark:bg-[#B54708]/15 dark:text-[#FEDF89]">
              {t('admin.landingStatsWarning')}
            </p>
            <form onSubmit={saveLandingStats} className="mt-5 flex flex-wrap items-end gap-5">
              {/* Deliberately not a field: it is a live count, so a box would invite typing. */}
              <div className="grid w-28 gap-1 text-xs font-semibold text-navy">
                <span>{t('admin.happyStays')}</span>
                <strong aria-label={t('admin.happyStaysAria')} className="flex min-h-[44px] items-center text-lg font-bold text-navy">
                  {liveStays === null ? '...' : liveStays}
                </strong>
              </div>
              <label className="grid gap-1 text-xs font-semibold text-navy">{t('admin.starRating')}<TextInput type="number" min="0" max="5" step="0.1" className="w-32" value={landingStats.starRating} onChange={(event) => setLandingStats({ ...landingStats, starRating: event.target.value })} /></label>
              <label className="grid gap-1 text-xs font-semibold text-navy">{t('admin.satisfaction')}<TextInput type="number" min="0" max="100" className="w-32" value={landingStats.satisfaction} onChange={(event) => setLandingStats({ ...landingStats, satisfaction: event.target.value })} /></label>
              <Button type="submit" size="sm" className={BTN_PRIMARY} disabled={savingLanding}>{savingLanding ? t('common.saving') : t('admin.update')}</Button>
              {landingMsg && <span role="status" className="text-xs font-semibold text-primary-700">{landingMsg}</span>}
            </form>
            <ConfirmDialog
              open={landingConfirm}
              title={t('admin.publishConfirmTitle')}
              description={t('admin.publishConfirmBody', { rating: landingStats.starRating, satisfaction: landingStats.satisfaction })}
              confirmLabel={t('admin.publish')}
              cancelLabel={t('common.cancel')}
              tone="warning"
              busy={savingLanding}
              onConfirm={() => { publishLandingStats(); }}
              onCancel={() => setLandingConfirm(false)}
            />
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
