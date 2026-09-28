import { useState } from "react";
import { BrowserRouter, Link, useLocation, useNavigate } from "react-router-dom";
import { Avatar, Dropdown, DropdownDivider, DropdownItem } from "flowbite-react";
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


function Header({ menu }) {
  const { setLang, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  return <header className="zl-header">
    <Link to="/" className="zl-brand"><img src={logo} alt="ZuriLofts" /><span>ZuriLofts</span></Link>
    <nav className="zl-desktop-nav" aria-label="Main navigation">
      <Link to="/properties">{t('nav.stays')}</Link><Link to="/places">{t('nav.places')}</Link><Link to="/restaurants">{t('nav.restaurants')}</Link><Link to="/guides">{t('nav.guides')}</Link>
    </nav>
    <div className="zl-header-actions">
      <Link className="zl-header-search" to="/properties">⌕ <span>{t('nav.searchStays')}</span></Link>
      {isAuthenticated && <Link className="zl-header-auth-link" to="/profile">{t('nav.myProfile')}</Link>}
      <Dropdown
        inline
        theme={{ inlineWrapper: 'zl-header-icon-button' }}
        label={<><span className="sr-only">{t('nav.language')}</span><span className="zl-header-action-icon" aria-hidden="true"><svg fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M12 21a9 9 0 100-18 9 9 0 000 18z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d="M3.6 9h16.8M3.6 15h16.8M12 3c2.2 2.45 3.3 5.45 3.3 9S14.2 18.55 12 21c-2.2-2.45-3.3-5.45-3.3-9S9.8 5.45 12 3z" /></svg></span></>}
        arrowIcon={false}
        placement="bottom-end"
        aria-label={t('nav.language')}
      >
        {languageOptions.map((option) => <DropdownItem key={option.value} onClick={() => setLang(option.value)}>{option.label}</DropdownItem>)}
      </Dropdown>
      {!isAuthenticated && (
        <Dropdown
          inline
          theme={{ inlineWrapper: 'zl-header-avatar-button' }}
          label={<><span className="sr-only">Open account menu</span><Avatar placeholderInitials="?" rounded size="sm" className="zl-header-avatar" /></>}
          arrowIcon={false}
          placement="bottom-end"
          aria-label="Open account menu"
        >
          <DropdownItem onClick={() => navigate('/login')}>{t('nav.signIn')}</DropdownItem>
          <DropdownItem onClick={() => navigate('/register')}>{t('nav.createAccount')}</DropdownItem>
          <DropdownDivider />
          <DropdownItem onClick={() => navigate('/register?role=HOST')}>{t('nav.becomeHost')}</DropdownItem>
        </Dropdown>
      )}
      <Link className="zl-icon-btn" to="/favourites" aria-label={t('nav.saved')}>♡</Link>
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
