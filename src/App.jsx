import { useState } from "react";
import { BrowserRouter, Link, useLocation } from "react-router-dom";
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
import ProtectedRoute from './components/ProtectedRoute.jsx';
import WorkspaceRoutes from './WorkspaceRoutes.jsx';
import Dropdown from './components/Dropdown.jsx';
import { useAuth } from './context/AuthContext.jsx';
import { useLanguage } from './context/LanguageContext.jsx';
import { languageOptions } from './i18n/translations.js';


function Header({ menu }) {
  const { lang, setLang, t } = useLanguage();
  const { isAuthenticated } = useAuth();
  return <header className="zl-header">
    <Link to="/" className="zl-brand"><img src={logo} alt="ZuriLofts" /><span>ZuriLofts</span></Link>
    <nav className="zl-desktop-nav" aria-label="Main navigation">
      <Link to="/properties">{t('nav.stays')}</Link><Link to="/places">{t('nav.places')}</Link><Link to="/restaurants">{t('nav.restaurants')}</Link><Link to="/guides">{t('nav.guides')}</Link>
    </nav>
    <div className="zl-header-actions">
      <Link className="zl-header-search" to="/properties">⌕ <span>{t('nav.searchStays')}</span></Link>
      <Link className="zl-host-link" to="/host/today">{t('nav.becomeHost')}</Link>
      {isAuthenticated ? <Link className="zl-header-auth-link" to="/profile">{t('nav.myProfile')}</Link> : <><Link className="zl-header-auth-link" to="/login">{t('nav.signIn')}</Link><Link className="zl-header-register" to="/register">{t('nav.createAccount')}</Link></>}
      <Dropdown value={lang} onChange={setLang} options={languageOptions} ariaLabel={t('nav.language')} triggerClassName="zl-header-language" menuClassName="zl-header-language-menu" />
      <Link className="zl-icon-btn" to="/favourites" aria-label={t('nav.saved')}>♡</Link>
      <button className="zl-menu-btn" onClick={menu} aria-label="Open menu">☰</button>
    </div>
  </header>;
}
function MobileNav() { return <nav className="zl-mobile-nav" aria-label="Mobile navigation"><Link to="/properties"><span>⌕</span><small>Explore</small></Link><Link to="/favourites"><span>♡</span><small>Saved</small></Link><Link to="/trips"><span>♧</span><small>Trips</small></Link><Link to="/inbox"><span>◌</span><small>Inbox</small></Link><Link to="/profile"><span>♙</span><small>Profile</small></Link></nav>; }
function Home() { return <GuestHome />; }
function Explore() { return <GuestStays />; }
function Trust() { return <main className="zl-page"><div className="zl-page-heading"><div><p className="zl-overline">TRUST & RECOVERY</p><h1>Keep your account secure.</h1><p>Review the information that helps protect every booking.</p></div></div><div className="op-trust-grid">{[["Identity verification", "Verified", "Your government ID and selfie have been reviewed."], ["Travel documents", "Add document", "Keep booking documents available in your account."], ["Password & security", "Secure", "Use a strong password and protect your sign-in."], ["Account recovery", "Ready", "Keep a recovery method up to date."]].map(([title, action, text]) => <section className="zl-panel" key={title}><p className="zl-overline">ACCOUNT SAFETY</p><h2>{title}</h2><p>{text}</p><button className="ui-btn-secondary">{action}</button></section>)}</div></main>; }
function Shell() {
  const { pathname } = useLocation();
  const [menu, setMenu] = useState(false);
  const { user, isAuthenticated } = useAuth();
  const { lang, setLang, t } = useLanguage();
  if (pathname.startsWith('/host') || pathname.startsWith('/admin')) return <WorkspaceRoutes />;
  if (pathname.startsWith('/property/')) return <RealPropertyPage />;
  if (pathname.startsWith('/booking/')) return <BookingPage />;
  if (pathname === '/login') return <LoginPage />;
  if (pathname === '/register') return <RegisterPage />;
  if (pathname === '/payment/callback') return <PaymentCallback />;
  if (pathname === '/places') return <PlacesPage />;
  if (pathname === '/restaurants') return <RestaurantsPage />;
  if (pathname === '/guides') return <GuidesPage />;
  if (pathname.startsWith('/guides/')) return <GuideDetailPage />;
  if (pathname === '/privacy') return <PrivacyPage />;
  if (pathname === '/terms') return <TermsPage />;
  if (pathname.startsWith('/s/')) return <SharedShortlistPage />;
  if (pathname === '/trips') return <ProtectedRoute><TripHubPage /></ProtectedRoute>;
  if (pathname === '/booking-history') return <ProtectedRoute><BookingHistoryPage /></ProtectedRoute>;
  if (pathname === '/inbox') return <ProtectedRoute><InboxPage /></ProtectedRoute>;
  if (pathname.startsWith('/inbox/')) return <ProtectedRoute><ConversationPage /></ProtectedRoute>;
  if (pathname === '/messages') return <ProtectedRoute><MessagesPage /></ProtectedRoute>;
  if (pathname === '/profile') return <ProtectedRoute><ProfilePage /></ProtectedRoute>;
  if (pathname === '/favourites') return <ProtectedRoute><FavouritesPage /></ProtectedRoute>;
  if (pathname === '/shortlists') return <ProtectedRoute><ShortlistsPage /></ProtectedRoute>;
  if (pathname.startsWith('/shortlists/')) return <ProtectedRoute><ShortlistDetailPage /></ProtectedRoute>;
  if (pathname === '/auth/callback') return <OAuthCallback />;
  let content;
  if (pathname === '/') content = <Home />;
  else if (pathname === '/properties') content = <Explore />;
  else if (pathname === '/verify-identity') content = <Trust />;
  else return <NotFoundPage />;
  const closeMenu = () => setMenu(false);
  return <div className="zl-app">
    <Header menu={() => setMenu(true)} />
    {content}
    {(pathname === '/' || pathname === '/properties') && <GuestFooter />}
    <MobileNav />
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
        <Dropdown value={lang} onChange={setLang} options={languageOptions} ariaLabel={t('nav.language')} triggerClassName="zl-menu-language" />
      </aside>
    </div>}
  </div>;
}
export default function App() { return <BrowserRouter><Shell /></BrowserRouter>; }
