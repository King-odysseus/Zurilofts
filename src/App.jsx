import { Suspense, lazy } from 'react';
import PropTypes from 'prop-types';
import { BrowserRouter, useLocation } from "react-router-dom";
import { GuestFooter, GuestHome, GuestStays } from './GuestDiscovery.jsx';
import RealPropertyPage from './components/PropertyPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import Navbar from './components/Navbar.jsx';
import Spinner from './components/Spinner.jsx';

// Only browsing (home, stays, a property) is in the first download. Everything
// else is fetched when its route is first opened, so a guest never pays to
// download the host and admin workspaces they cannot open.
const BookingPage = lazy(() => import('./pages/BookingPage.jsx'));
const LoginPage = lazy(() => import('./pages/LoginPage.jsx'));
const RegisterPage = lazy(() => import('./pages/RegisterPage.jsx'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback.jsx'));
const PlacesPage = lazy(() => import('./pages/PlacesPage.jsx'));
const RestaurantsPage = lazy(() => import('./pages/RestaurantsPage.jsx'));
const GuidesPage = lazy(() => import('./pages/GuidesPage.jsx'));
const GuideDetailPage = lazy(() => import('./pages/GuideDetailPage.jsx'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage.jsx'));
const TermsPage = lazy(() => import('./pages/TermsPage.jsx'));
const SharedShortlistPage = lazy(() => import('./pages/SharedShortlistPage.jsx'));
const BookingHistoryPage = lazy(() => import('./pages/BookingHistoryPage.jsx'));
const BookingDetailPage = lazy(() => import('./pages/BookingDetailPage.jsx'));
const ConversationPage = lazy(() => import('./pages/ConversationPage.jsx'));
const FavouritesPage = lazy(() => import('./pages/FavouritesPage.jsx'));
const InboxPage = lazy(() => import('./pages/InboxPage.jsx'));
const MessagesPage = lazy(() => import('./pages/MessagesPage.jsx'));
const ProfilePage = lazy(() => import('./pages/ProfilePage.jsx'));
const ShortlistDetailPage = lazy(() => import('./pages/ShortlistDetailPage.jsx'));
const ShortlistsPage = lazy(() => import('./pages/ShortlistsPage.jsx'));
const TripHubPage = lazy(() => import('./pages/TripHubPage.jsx'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback.jsx'));
const TrustPage = lazy(() => import('./pages/TrustPage.jsx'));
const WorkspaceRoutes = lazy(() => import('./WorkspaceRoutes.jsx'));
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
  // Keyed by BOOKING id (checkout at /booking/:propertyId is keyed by property).
  if (pathname.startsWith('/bookings/')) return <GuestShell><ProtectedRoute><BookingDetailPage /></ProtectedRoute></GuestShell>;
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
// A lazy route's chunk is fetched on first visit; this is what shows meanwhile.
function RouteFallback() {
  return <div className="flex min-h-[60vh] items-center justify-center"><Spinner /></div>;
}

export default function App() {
  return <BrowserRouter>
    <Suspense fallback={<RouteFallback />}><Shell /></Suspense>
  </BrowserRouter>;
}
