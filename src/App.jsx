import { useState } from "react";
import { BrowserRouter, Link, useLocation, useNavigate } from "react-router-dom";
import { Dropdown, DropdownDivider, DropdownItem } from "flowbite-react";
import logo from "./assets/zurilofts-logo.png";
import { GuestFooter, GuestHome, GuestStays } from './GuestDiscovery.jsx';
import RealPropertyPage from './components/PropertyPage.jsx';
import BookingPage from './pages/BookingPage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import PaymentCallback from './pages/PaymentCallback.jsx';
import PlacesPage from './pages/PlacesPage.jsx';
import RestaurantsPage from './pages/RestaurantsPage.jsx';
import GuidesPage from './pages/GuidesPage.jsx';
import GuideDetailPage from './pages/GuideDetailPage.jsx';
import PrivacyPage from './pages/PrivacyPage.jsx';
import TermsPage from './pages/TermsPage.jsx';
import SharedShortlistPage from './pages/SharedShortlistPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import BookingHistoryPage from './pages/BookingHistoryPage.jsx';
import ConversationPage from './pages/ConversationPage.jsx';
import FavouritesPage from './pages/FavouritesPage.jsx';
import InboxPage from './pages/InboxPage.jsx';
import MessagesPage from './pages/MessagesPage.jsx';
import ProfilePage from './pages/ProfilePage.jsx';
import ShortlistDetailPage from './pages/ShortlistDetailPage.jsx';
import ShortlistsPage from './pages/ShortlistsPage.jsx';
import TripHubPage from './pages/TripHubPage.jsx';
import OAuthCallback from './pages/OAuthCallback.jsx';
import TrustPage from './pages/TrustPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import MobileBottomNav from './components/MobileBottomNav.jsx';
import WorkspaceRoutes from './WorkspaceRoutes.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useLanguage } from './context/LanguageContext.jsx';
import { languageOptions } from './i18n/translations.js';

const headerDropdownTheme = {
  floating: {
    style: {
      auto: 'border-0 bg-white text-[#0B1F42] shadow-[0_16px_40px_rgba(11,31,66,0.16)]',
    },
  },
};

function SearchIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="m21 21-4.35-4.35m1.35-5.65a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>;
}

function HeartIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" /></svg>;
}

function TranslateIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M4 5h9M8.5 3v2m2.2 0c-.8 3.3-2.7 5.9-5.7 7.8M6.2 8.7c1.2 2 3 3.4 5.4 4.2M14 21l4-10 4 10m-6.7-3.3h5.4" /></svg>;
}

function UserIcon() {
  return <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM5 21a7 7 0 0114 0" /></svg>;
}


function Header({ menu }) {
  const { setLang, t } = useLanguage();
  const { user, isAuthenticated, logout } = useAuth();
  const navigate = useNavigate();
  const initials = `${user?.firstName?.[0] || user?.name?.[0] || 'G'}${user?.lastName?.[0] || ''}`.toUpperCase();
  return <header className="zl-header">
    <Link to="/" className="zl-brand"><img src={logo} alt="ZuriLofts" /><span>ZuriLofts</span></Link>
    <nav className="zl-desktop-nav" aria-label="Main navigation">
      <Link to="/properties">{t('nav.stays')}</Link><Link to="/places">{t('nav.places')}</Link><Link to="/restaurants">{t('nav.restaurants')}</Link><Link to="/guides">{t('nav.guides')}</Link>
    </nav>
    <div className="zl-header-actions">
      <Link className="zl-header-search" to="/properties"><SearchIcon /><span>{t('nav.searchStays')}</span></Link>
      <Link className="zl-icon-btn" to="/favourites" aria-label={t('nav.saved')}><HeartIcon /></Link>
      <Dropdown
        inline
        theme={{ inlineWrapper: 'zl-header-icon-button', ...headerDropdownTheme }}
        label={<><span className="sr-only">{t('nav.language')}</span><span className="zl-header-action-icon" aria-hidden="true"><TranslateIcon /></span></>}
        arrowIcon={false}
        placement="bottom-end"
        aria-label={t('nav.language')}
      >
        {languageOptions.map((option) => <DropdownItem key={option.value} onClick={() => setLang(option.value)}>{option.label}</DropdownItem>)}
      </Dropdown>
      <Dropdown
        inline
        theme={{ inlineWrapper: 'zl-header-avatar-button', ...headerDropdownTheme }}
        label={<><span className="sr-only">Open account menu</span><span className="zl-header-avatar-icon" aria-hidden="true">{isAuthenticated ? initials : <UserIcon />}</span></>}
        arrowIcon={false}
        placement="bottom-end"
        aria-label="Open account menu"
      >
        {isAuthenticated ? (
          <>
            <DropdownItem onClick={() => navigate('/profile')}>{t('nav.myProfile')}</DropdownItem>
            <DropdownItem onClick={() => navigate('/trips')}>Trips</DropdownItem>
            <DropdownItem onClick={() => navigate('/favourites')}>{t('nav.saved')}</DropdownItem>
            {(user?.role === 'HOST' || user?.role === 'ADMIN') && <>
              <DropdownDivider />
              <DropdownItem onClick={() => navigate(user.role === 'ADMIN' ? '/admin' : '/host/today')}>
                {user.role === 'ADMIN' ? 'Admin workspace' : 'Host workspace'}
              </DropdownItem>
            </>}
            <DropdownDivider />
            <DropdownItem onClick={async () => { await logout(); navigate('/'); }}>Sign out</DropdownItem>
          </>
        ) : (
          <>
          <DropdownItem onClick={() => navigate('/login')}>{t('nav.signIn')}</DropdownItem>
          <DropdownItem onClick={() => navigate('/register')}>{t('nav.createAccount')}</DropdownItem>
          <DropdownDivider />
          <DropdownItem onClick={() => navigate('/register?role=HOST')}>{t('nav.becomeHost')}</DropdownItem>
          </>
        )}
      </Dropdown>
      <button className="zl-menu-btn" onClick={menu} aria-label="Open menu">☰</button>
    </div>
  </header>;
}
function Home() { return <GuestHome />; }
function Explore() { return <GuestStays />; }
function Shell() {
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useLanguage();
  if (pathname.startsWith('/host') || pathname.startsWith('/admin')) return <WorkspaceRoutes />;
  if (pathname.startsWith('/booking/')) return <BookingPage />;
  if (pathname === '/login') return <LoginPage />;
  if (pathname === '/register') return <RegisterPage />;
  if (pathname === '/payment/callback') return <PaymentCallback />;
  if (pathname === '/trips') return <ProtectedRoute><TripHubPage /></ProtectedRoute>;
  if (pathname === '/booking-history') return <ProtectedRoute><BookingHistoryPage /></ProtectedRoute>;
  if (pathname === '/inbox') return <ProtectedRoute><InboxPage /></ProtectedRoute>;
  if (pathname.startsWith('/inbox/')) return <ProtectedRoute><ConversationPage /></ProtectedRoute>;
  if (pathname === '/messages') return <ProtectedRoute><MessagesPage /></ProtectedRoute>;
  if (pathname === '/profile') return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
  if (pathname === '/auth/callback') return <OAuthCallback />;
  if (pathname === '/verify-identity') return <ProtectedRoute><TrustPage /></ProtectedRoute>;
  let content;
  if (pathname === '/') content = <Home />;
  else if (pathname === '/properties') content = <Explore />;
  else if (pathname.startsWith('/property/')) content = <RealPropertyPage />;
  else if (pathname === '/places') content = <PlacesPage />;
  else if (pathname === '/restaurants') content = <RestaurantsPage />;
  else if (pathname === '/guides') content = <GuidesPage />;
  else if (pathname.startsWith('/guides/')) content = <GuideDetailPage />;
  else if (pathname === '/privacy') content = <PrivacyPage />;
  else if (pathname === '/terms') content = <TermsPage />;
  else if (pathname.startsWith('/s/')) content = <SharedShortlistPage />;
  else if (pathname === '/favourites') content = <ProtectedRoute><FavouritesPage /></ProtectedRoute>;
  else if (pathname === '/shortlists') content = <ProtectedRoute><ShortlistsPage /></ProtectedRoute>;
  else if (pathname.startsWith('/shortlists/')) content = <ProtectedRoute><ShortlistDetailPage /></ProtectedRoute>;
  else content = <NotFoundPage />;
  const closeMenu = () => setMenu(false);
  return <div className="zl-app">
    <Header menu={() => setMenu(true)} />
    {content}
    <GuestFooter />
    <MobileBottomNav />
    {menu && <div className="zl-modal-backdrop" onClick={closeMenu}>
      <aside className="zl-menu-modal" onClick={(event) => event.stopPropagation()} aria-label="Site menu">
        <div className="zl-modal-top">
          {isAuthenticated && <span className="zl-avatar">{(user?.firstName || user?.name || 'G').slice(0, 1).toUpperCase()}</span>}
          <strong>{isAuthenticated ? (user?.firstName || user?.name || t('nav.myProfile')) : 'ZuriLofts'}</strong>
          <button className="zl-icon-btn" onClick={closeMenu} aria-label="Close menu">×</button>
        </div>
        <div className="zl-modal-links">
          <Link to="/properties" onClick={closeMenu}>{t('nav.stays')}</Link>
          <Link to="/places" onClick={closeMenu}>{t('nav.places')}</Link>
          <Link to="/restaurants" onClick={closeMenu}>{t('nav.restaurants')}</Link>
          <Link to="/guides" onClick={closeMenu}>{t('nav.guides')}</Link>
          <Link to="/host/today" onClick={closeMenu}>{t('nav.becomeHost')}</Link>
          {isAuthenticated ? <Link to="/profile" onClick={closeMenu}>{t('nav.myProfile')}</Link> : <>
            <Link to="/login" onClick={closeMenu}>{t('nav.signIn')}</Link>
            <Link to="/register" onClick={closeMenu}>{t('nav.createAccount')}</Link>
          </>}
        </div>
        <label className="zl-menu-language-label">{t('nav.language')}</label>
        <Dropdown
          inline
          theme={{ inlineWrapper: 'zl-menu-language' }}
          label={languageOptions.find((option) => option.value === lang)?.label || t('nav.language')}
          placement="top-start"
          aria-label={t('nav.language')}
        >
          {languageOptions.map((option) => (
            <DropdownItem key={option.value} onClick={() => setLang(option.value)}>
              {option.label}
            </DropdownItem>
          ))}
        </Dropdown>
      </aside>
    </div>}
  </div>;
}
export default function App() { return <BrowserRouter><Shell /></BrowserRouter>; }
