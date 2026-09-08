import { useState, useEffect, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import './index.css';
import Hero from './components/Hero';
import Footer from './components/Footer';
import PropertyCardRow from './components/PropertyCardRow';
import PropertyCard from './components/PropertyCard';
import apiClient from './api/client.js';
import { getRecentlyViewed } from './utils/recentlyViewed.js';
import { firstImage } from './utils/images.js';
import NearbySection from './components/NearbySection.jsx';
import { PLACES_TO_VISIT, PLACES_TO_EAT, AREAS, PLACE_CATEGORIES, EAT_CATEGORIES } from './data/nearby.js';

import CookieConsent from './components/CookieConsent';
import PushNotificationPrompt from './components/PushNotificationPrompt';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import Spinner from './components/Spinner.jsx';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import HostRoute from './components/HostRoute';
import HostLayout from './components/HostLayout';

// Eager imports stay limited to what the home route needs (plus shared chrome).
// Every other page is code-split and pulls its chunk in on first navigation.
const PropertyPage = lazy(() => import('./components/PropertyPage'));
const PropertiesPage = lazy(() => import('./pages/PropertiesPage'));
const BookingPage = lazy(() => import('./pages/BookingPage'));
const PrivacyPage = lazy(() => import('./pages/PrivacyPage'));
const TermsPage = lazy(() => import('./pages/TermsPage'));
const PlacesPage = lazy(() => import('./pages/PlacesPage'));
const GuidesPage = lazy(() => import('./pages/GuidesPage'));
const GuideDetailPage = lazy(() => import('./pages/GuideDetailPage'));
const RestaurantsPage = lazy(() => import('./pages/RestaurantsPage'));
const LoginPage = lazy(() => import('./pages/LoginPage'));
const RegisterPage = lazy(() => import('./pages/RegisterPage'));
const OAuthCallback = lazy(() => import('./pages/OAuthCallback'));
const ProfilePage = lazy(() => import('./pages/ProfilePage'));
const MessagesPage = lazy(() => import('./pages/MessagesPage'));
const TripHubPage = lazy(() => import('./pages/TripHubPage.jsx'));
const HostTodayPage = lazy(() => import('./pages/HostTodayPage.jsx'));
const HostApplicationPage = lazy(() => import('./pages/HostApplicationPage.jsx'));
const IdentityVerificationPage = lazy(() => import('./pages/IdentityVerificationPage.jsx'));
const DisputeThreadPage = lazy(() => import('./pages/DisputeThreadPage.jsx'));
const ShortlistsPage = lazy(() => import('./pages/ShortlistsPage.jsx'));
const ShortlistDetailPage = lazy(() => import('./pages/ShortlistDetailPage.jsx'));
const SharedShortlistPage = lazy(() => import('./pages/SharedShortlistPage.jsx'));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'));
const HostPayouts = lazy(() => import('./pages/HostPayouts'));
const FavouritesPage = lazy(() => import('./pages/FavouritesPage'));
const BookingHistoryPage = lazy(() => import('./pages/BookingHistoryPage'));
const InboxPage = lazy(() => import('./pages/InboxPage'));
const ConversationPage = lazy(() => import('./pages/ConversationPage'));

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminLayout = lazy(() => import('./pages/AdminDashboard.jsx').then(m => ({ default: m.AdminLayout })));
const AdminProperties = lazy(() => import('./pages/AdminProperties.jsx'));
const AdminPropertyForm = lazy(() => import('./pages/AdminPropertyForm.jsx'));
const AdminCalendar = lazy(() => import('./pages/AdminCalendar.jsx'));
const AdminBookings = lazy(() => import('./pages/AdminBookings.jsx'));
const AdminEarnings = lazy(() => import('./pages/AdminEarnings.jsx'));
const AdminPromos = lazy(() => import('./pages/AdminPromos.jsx'));
const AdminAddOns = lazy(() => import('./pages/AdminAddOns.jsx'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback.jsx'));
const AdminMessages = lazy(() => import('./pages/AdminMessages.jsx'));
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'));
const AdminGuides = lazy(() => import('./pages/AdminGuides.jsx'));
const AdminPayouts = lazy(() => import('./pages/AdminPayouts.jsx'));
const AdminHostApplications = lazy(() => import('./pages/AdminHostApplications.jsx'));
const AdminIdentityVerifications = lazy(() => import('./pages/AdminIdentityVerifications.jsx'));
const AdminDisputes = lazy(() => import('./pages/AdminDisputes.jsx'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback.jsx'));

// Home page component
function HomePage() {
  const [premiumProperties, setPremiumProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [heroStats, setHeroStats] = useState(null);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [propsRes, statsRes] = await Promise.all([
          apiClient.get('/properties'),
          apiClient.get('/reviews/summary'),
        ]);
        const properties = propsRes.data.data || [];
        setPremiumProperties(properties.filter(p => p.rating >= 3.0));
        setAllProperties(properties);
        const d = statsRes.data.data;
        setHeroStats({ rating: d.averageRating || 5.0, stays: d.happyStays || d.confirmedStays || 0, satisfaction: d.satisfaction || 100 });
      } catch (err) {
        console.error('HomePage load error', err);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Resolve stored recently-viewed ids against the loaded property list so the
  // cards render with full data. Renders nothing when storage is empty.
  useEffect(() => {
    if (allProperties.length === 0) return;
    const byId = new Map(allProperties.map((p) => [p.id, p]));
    const viewed = getRecentlyViewed()
      .map((entry) => byId.get(entry.id))
      .filter(Boolean)
      .slice(0, 4);
    setRecentlyViewed(viewed);
  }, [allProperties]);

  return (
    <>
      {/* Hero Section with integrated Navbar */}
      <Hero stats={heroStats} />

      {/* Stays guests love */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-24 pb-12">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl md:text-3xl font-bold text-[#222222]">Stays guests love</h2>
            <p className="text-[#6b7280] mt-2 max-w-2xl text-base md:text-lg">
              A hand-picked selection of our highest-rated furnished apartments in prime Nairobi locations.
            </p>
          </div>
          <Link
            to="/properties"
            className="inline-flex items-center justify-center h-11 px-5 rounded-full border-2 border-[#2563EB] text-[#2563EB] font-semibold text-sm hover:bg-[#2563EB] hover:text-white transition-colors duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
          >
            View all stays
          </Link>
        </div>

        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5" aria-label="Loading stays">
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-white rounded-[14px] border border-[#E5E7EB] overflow-hidden">
                <div className="aspect-[4/3] bg-[#F7F7F5] animate-pulse" />
                <div className="p-4 space-y-3">
                  <div className="h-4 w-3/4 bg-[#F7F7F5] animate-pulse rounded" />
                  <div className="h-3 w-1/2 bg-[#F7F7F5] animate-pulse rounded" />
                  <div className="h-10 w-full bg-[#F7F7F5] animate-pulse rounded" />
                </div>
              </div>
            ))}
          </div>
        ) : premiumProperties.length === 0 ? (
          <div className="bg-white rounded-[14px] border border-[#E5E7EB] py-16 px-6 text-center">
            <p className="text-[#222222] font-semibold mb-2">No stays available right now</p>
            <p className="text-[#6b7280] max-w-md mx-auto">
              We&apos;re refreshing our collection. Check back shortly for new premium stays in Nairobi.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
            {premiumProperties.slice(0, 8).map((property) => (
              <PropertyCard key={property.id} property={{ ...property, image: firstImage(property) }} />
            ))}
          </div>
        )}
      </section>

      {/* Recently viewed - renders nothing for a first-time visitor */}
      {recentlyViewed.length > 0 && (
        <div className="mb-12 md:mb-16">
          <PropertyCardRow title="Recently viewed" properties={recentlyViewed} align="center" />
        </div>
      )}

      {/* Recommended Places to Visit */}
      <section className="max-w-7xl mx-auto px-4 md:px-6">
        <NearbySection
          title="Places to Visit in Nairobi"
          subtitle="Discover the best shopping, nature, culture, and entertainment spots near your stay."
          items={PLACES_TO_VISIT}
          areaLabels={AREAS}
          categoryLabels={PLACE_CATEGORIES}
          categories
          viewMoreLink="/places"
          maxCards={9}
        />
        <NearbySection
          title="Best Places to Eat in Nairobi"
          subtitle="Explore Nairobi's vibrant dining scene - from street food to fine dining."
          items={PLACES_TO_EAT}
          areaLabels={AREAS}
          categoryLabels={EAT_CATEGORIES}
          categories
          viewMoreLink="/restaurants"
          maxCards={9}
        />
      </section>

      <div className="mt-32 md:mt-48">
        <Footer />
      </div>
    </>
  );
}

function Loading() {
  return <div className="min-h-screen flex items-center justify-center bg-canvas"><Spinner /></div>;
}

/** Suspense boundary for code-split route pages. */
function Lazy({ children }) {
  return <Suspense fallback={<Loading />}>{children}</Suspense>;
}

function Page({ title, children }) {
  useEffect(() => { document.title = title ? `${title} | ZuriLofts` : 'ZuriLofts | Premium Short-let Apartments'; }, [title]);
  return children;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      {/* Telegram-backed support chat, disabled for now. The component and its
          /api/chat endpoints are untouched - re-enable by restoring <ChatWidget />. */}
      <CookieConsent />
      <PushNotificationPrompt />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Page><HomePage /></Page>} />
          <Route path="/properties" element={<Page title="Properties"><Lazy><PropertiesPage /></Lazy></Page>} />
          <Route path="/property/:id" element={<Lazy><PropertyPage /></Lazy>} />
          <Route path="/booking/:id" element={<Page title="Booking"><Lazy><ProtectedRoute><BookingPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/login" element={<Page title="Login"><Lazy><LoginPage /></Lazy></Page>} />
          <Route path="/register" element={<Page title="Register"><Lazy><RegisterPage /></Lazy></Page>} />
          <Route path="/auth/callback" element={<Lazy><OAuthCallback /></Lazy>} />
          <Route path="/profile" element={<Page title="Profile"><Lazy><ProtectedRoute><ProfilePage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/messages" element={<Page title="Messages"><Lazy><ProtectedRoute><MessagesPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/inbox" element={<Page title="Inbox"><Lazy><ProtectedRoute><InboxPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/inbox/:conversationId" element={<Page title="Conversation"><Lazy><ProtectedRoute><ConversationPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/trips" element={<Page title="Trips"><Lazy><ProtectedRoute><TripHubPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/verify-identity" element={<Page title="Verify Identity"><Lazy><ProtectedRoute><IdentityVerificationPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/disputes/new" element={<Page title="Report an Issue"><Lazy><ProtectedRoute><DisputeThreadPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/disputes/:id" element={<Page title="Dispute"><Lazy><ProtectedRoute><DisputeThreadPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/host/application" element={<Page title="Host Application"><Lazy><ProtectedRoute><HostApplicationPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/host/today" element={<Page title="Host Today"><Lazy><HostRoute><HostTodayPage /></HostRoute></Lazy></Page>} />
          <Route path="/host/calendar" element={<Page title="Host Calendar"><Lazy><HostRoute><HostLayout><AdminCalendar /></HostLayout></HostRoute></Lazy></Page>} />
          <Route path="/host/calendar/:id" element={<Page title="Host Calendar"><Lazy><HostRoute><HostLayout><AdminCalendar /></HostLayout></HostRoute></Lazy></Page>} />
          <Route path="/host/listings" element={<Page title="Host Listings"><Lazy><HostRoute><HostLayout><AdminProperties /></HostLayout></HostRoute></Lazy></Page>} />
          <Route path="/host/earnings" element={<Page title="Host Earnings"><Lazy><HostRoute><HostLayout><AdminEarnings /></HostLayout></HostRoute></Lazy></Page>} />
          <Route path="/host/properties/new" element={<Page title="Add Property"><Lazy><HostRoute><HostLayout><AdminPropertyForm /></HostLayout></HostRoute></Lazy></Page>} />
          <Route path="/host/properties/:id/edit" element={<Page title="Edit Property"><Lazy><HostRoute><HostLayout><AdminPropertyForm /></HostLayout></HostRoute></Lazy></Page>} />
          <Route path="/privacy" element={<Page title="Privacy Policy"><Lazy><PrivacyPage /></Lazy></Page>} />
          <Route path="/terms" element={<Page title="Terms of Service"><Lazy><TermsPage /></Lazy></Page>} />
          <Route path="/favourites" element={<Page title="Favourites"><Lazy><FavouritesPage /></Lazy></Page>} />
          <Route path="/bookings" element={<Page title="My Bookings"><Lazy><ProtectedRoute><BookingHistoryPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/places" element={<Page title="Places"><Lazy><PlacesPage /></Lazy></Page>} />
          <Route path="/guides" element={<Page title="Travel Guides"><Lazy><GuidesPage /></Lazy></Page>} />
          <Route path="/guides/:slug" element={<Page title="Guide"><Lazy><GuideDetailPage /></Lazy></Page>} />
          <Route path="/restaurants" element={<Page title="Restaurants"><Lazy><RestaurantsPage /></Lazy></Page>} />
          <Route path="/payment/callback" element={<Lazy><Page title="Payment"><ProtectedRoute><PaymentCallback /></ProtectedRoute></Page></Lazy>} />
          <Route path="/admin" element={<Suspense fallback={<Loading />}><AdminRoute><AdminLayout /></AdminRoute></Suspense>}>
            <Route index element={<Suspense fallback={<Loading />}><AdminDashboard /></Suspense>} />
            <Route path="properties" element={<Suspense fallback={<Loading />}><AdminProperties /></Suspense>} />
            <Route path="properties/new" element={<Suspense fallback={<Loading />}><AdminPropertyForm /></Suspense>} />
            <Route path="properties/:id/edit" element={<Suspense fallback={<Loading />}><AdminPropertyForm /></Suspense>} />
            <Route path="properties/:id/calendar" element={<Suspense fallback={<Loading />}><AdminCalendar /></Suspense>} />
            <Route path="bookings" element={<Suspense fallback={<Loading />}><AdminBookings /></Suspense>} />
            <Route path="earnings" element={<Suspense fallback={<Loading />}><AdminEarnings /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<Loading />}><AdminUsers /></Suspense>} />
            <Route path="host-applications" element={<Suspense fallback={<Loading />}><AdminHostApplications /></Suspense>} />
            <Route path="identity-verifications" element={<Suspense fallback={<Loading />}><AdminIdentityVerifications /></Suspense>} />
            <Route path="disputes" element={<Suspense fallback={<Loading />}><AdminDisputes /></Suspense>} />
            <Route path="promos" element={<Suspense fallback={<Loading />}><AdminPromos /></Suspense>} />
            <Route path="addons" element={<Suspense fallback={<Loading />}><AdminAddOns /></Suspense>} />
            <Route path="feedback" element={<Suspense fallback={<Loading />}><AdminFeedback /></Suspense>} />
            <Route path="messages" element={<Suspense fallback={<Loading />}><AdminMessages /></Suspense>} />
            <Route path="guides" element={<Suspense fallback={<Loading />}><AdminGuides /></Suspense>} />
            <Route path="payouts" element={<Suspense fallback={<Loading />}><AdminPayouts /></Suspense>} />
          </Route>
          <Route path="/shortlists" element={<Page title="My Shortlists"><Lazy><ProtectedRoute><ShortlistsPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/shortlists/:id" element={<Page title="Shortlist"><Lazy><ProtectedRoute><ShortlistDetailPage /></ProtectedRoute></Lazy></Page>} />
          <Route path="/s/:token" element={<Page title="Shared Shortlist"><Lazy><SharedShortlistPage /></Lazy></Page>} />
          <Route path="/host/payouts" element={<Page title="Host Payouts"><Lazy><HostRoute><HostLayout><HostPayouts /></HostLayout></HostRoute></Lazy></Page>} />
          <Route path="*" element={<Lazy><NotFoundPage /></Lazy>} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
