import PropTypes from 'prop-types';
import { BrowserRouter, useLocation } from "react-router-dom";
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
import WorkspaceRoutes from './WorkspaceRoutes.jsx';
import Navbar from './components/Navbar.jsx';
function Home() { return <GuestHome />; }
function Explore() { return <GuestStays />; }
function GuestShell({ children }) {
  return <div className="zl-app">
    <Navbar />
    {children}
    <GuestFooter />
  </div>;
}
GuestShell.propTypes = { children: PropTypes.node.isRequired };

function Shell() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/host') || pathname.startsWith('/admin')) return <WorkspaceRoutes />;
  if (pathname.startsWith('/booking/')) return <BookingPage />;
  if (pathname === '/login') return <LoginPage />;
  if (pathname === '/register') return <RegisterPage />;
  if (pathname === '/payment/callback') return <GuestShell><PaymentCallback /></GuestShell>;
  if (pathname === '/trips') return <GuestShell><ProtectedRoute><TripHubPage /></ProtectedRoute></GuestShell>;
  if (pathname === '/booking-history' || pathname === '/bookings') return <GuestShell><ProtectedRoute><BookingHistoryPage /></ProtectedRoute></GuestShell>;
  if (pathname === '/inbox') return <GuestShell><ProtectedRoute><InboxPage /></ProtectedRoute></GuestShell>;
  if (pathname.startsWith('/inbox/')) return <GuestShell><ProtectedRoute><ConversationPage /></ProtectedRoute></GuestShell>;
  if (pathname === '/messages') return <GuestShell><ProtectedRoute><MessagesPage /></ProtectedRoute></GuestShell>;
  if (pathname === '/profile') return <GuestShell><ProtectedRoute><ProfilePage /></ProtectedRoute></GuestShell>;
  if (pathname === '/auth/callback') return <OAuthCallback />;
  if (pathname === '/verify-identity') return <GuestShell><ProtectedRoute><TrustPage /></ProtectedRoute></GuestShell>;
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
  return <GuestShell>{content}</GuestShell>;
}
export default function App() { return <BrowserRouter><Shell /></BrowserRouter>; }
