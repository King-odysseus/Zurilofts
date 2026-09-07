import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Hero from './components/Hero';
import Footer from './components/Footer';
import PropertyCardRow from './components/PropertyCardRow';
import apiClient from './api/client.js';
import { getRecentlyViewed } from './utils/recentlyViewed.js';
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
      } catch (err) { console.error('HomePage load error', err); }
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

  const marqueeItems = useMemo(() => {
    if (premiumProperties.length === 0) return [];

    let loopSegment = [...premiumProperties];
    while (loopSegment.length < 12) {
      loopSegment = [...loopSegment, ...premiumProperties];
    }

    loopSegment = loopSegment.slice(0, Math.max(12, premiumProperties.length));
    return [...loopSegment, ...loopSegment];
  }, [premiumProperties]);

  // Weekly-rotating masonry images from property pool
  const masonryImages = useMemo(() => {
    // ISO week number (1-53) as seed so layout rotates every Monday
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const daysSinceStart = Math.floor((now - startOfYear) / 86400000);
    const weekNumber = Math.ceil((daysSinceStart + startOfYear.getDay() + 1) / 7);

    // Collect all images from all properties (only user-uploaded, no stock fallback)
    let propImages = allProperties.flatMap((p) => p.images || []);

    if (propImages.length === 0) return [];

    // Cycle user images to fill 12 slots when fewer available
    while (propImages.length < 12) {
      propImages = [...propImages, ...propImages];
    }
    propImages = propImages.slice(0, 12);

    const offset = (weekNumber * 12) % propImages.length;
    return [...propImages.slice(offset), ...propImages.slice(0, offset)].slice(0, 12);
  }, [allProperties]);

  return (
    <>
      {/* Hero Section with integrated Navbar */}
      <Hero stats={heroStats} />

      {/* Our Listings Header */}
      <div className="pt-24 md:pt-32 pb-8 px-4 md:px-6 max-w-7xl mx-auto text-center">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0B0B45] mb-4">Our Listings</h2>
        <p className="text-cool-grey max-w-2xl mx-auto text-lg">
          Discover our carefully curated selection of premium furnished apartments
          in prime Nairobi locations. Each property is designed for comfort and convenience.
        </p>
      </div>

      {/* Recently viewed - renders nothing for a first-time visitor */}
      {recentlyViewed.length > 0 && (
        <div className="mb-12 md:mb-16">
          <PropertyCardRow title="Recently viewed" properties={recentlyViewed} align="center" />
        </div>
      )}

      {/* Auto-scrolling Premium Property Row - full-width */}
      {premiumProperties.length > 0 && (
        <div className="marquee-container w-full overflow-hidden pb-8 px-10 md:px-20 lg:px-32">
          <div className="marquee-track flex w-max">
            {marqueeItems.map((property, i) => (
              <a
                key={`${property.id}-${i}`}
                href={`/property/${property.id}`}
                className="flex-shrink-0 w-64 mr-6 group cursor-pointer no-underline"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl neu-card shadow-md mb-3">
                  <img
                    src={property.images?.[0] || property.coverImage || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80'}
                    alt={property.title}
                    loading="lazy"
                    decoding="async"
                    className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                  />
                  {/* Star rating badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full text-xs font-semibold text-[#0B0B45] shadow-sm">
                    <svg className="w-3.5 h-3.5 text-[#C49A6C] fill-current" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {property.rating || '5.0'}
                  </div>
                </div>
                {/* Name & Location */}
                <h3 className="text-sm font-semibold text-[#1f2937] truncate">{property.title}</h3>
                <div className="flex items-center text-[#6b7280] mt-0.5">
                  <svg className="w-3.5 h-3.5 mr-1 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="text-xs truncate">{property.location || 'Nairobi'}</span>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Experience Luxury Section */}
      <div className="text-center mb-10 mt-32 md:mt-44 px-4">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0B0B45]">Experience Luxury and Class</h2>
        <p className="text-cool-grey max-w-2xl mx-auto text-lg mt-3">
          At our lofts you get comfort delivered with a touch of luxury
        </p>
      </div>

      {/* Masonry Gallery - weekly rotation from property images */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[120px] md:auto-rows-[150px]">
          {/* Tall - col 1 rows 1-2 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[0]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
          {/* Small - col 2 row 1 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[1]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
          {/* Tall - col 3 rows 1-2 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[2]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
          {/* Small - col 4 row 1 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[3]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>

          {/* Small - col 2 row 2 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[4]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
          {/* Small - col 4 row 2 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[5]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>

          {/* Small - col 1 row 3 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[6]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
          {/* Tall - col 2 rows 3-4 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[7]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
          {/* Small - col 3 row 3 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[8]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
          {/* Tall - col 4 rows 3-4 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[9]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>

          {/* Small - col 1 row 4 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[10]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
          {/* Small - col 3 row 4 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[11]} alt="A curated loft apartment in Nairobi" loading="lazy" decoding="async" />
          </div>
        </div>
      </div>

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
