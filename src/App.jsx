import { useState, useEffect, useMemo, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import './index.css';
import Hero from './components/Hero';
import Footer from './components/Footer';
import PropertyPage from './components/PropertyPage';
import apiClient from './api/client.js';
import ContactPage from './pages/ContactPage';
import PropertiesPage from './pages/PropertiesPage';
import BookingPage from './pages/BookingPage';
import PrivacyPage from './pages/PrivacyPage';
import TermsPage from './pages/TermsPage';
import PlacesPage from './pages/PlacesPage';
import GuidesPage from './pages/GuidesPage';
import GuideDetailPage from './pages/GuideDetailPage';
import RestaurantsPage from './pages/RestaurantsPage';
import NearbySection from './components/NearbySection.jsx';
import { PLACES_TO_VISIT, PLACES_TO_EAT, AREAS, PLACE_CATEGORIES, EAT_CATEGORIES } from './data/nearby.js';


import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import OAuthCallback from './pages/OAuthCallback';
import ProfilePage from './pages/ProfilePage';
import MessagesPage from './pages/MessagesPage';
import ProtectedRoute from './components/ProtectedRoute';
import AdminRoute from './components/AdminRoute';
import ChatWidget from './components/ChatWidget';
import CookieConsent from './components/CookieConsent';
import ScrollToTop from './components/ScrollToTop';
import ErrorBoundary from './components/ErrorBoundary';
import Spinner from './components/Spinner.jsx';
import NotFoundPage from './pages/NotFoundPage';
import HostPayouts from './pages/HostPayouts';
import FavouritesPage from './pages/FavouritesPage';
import BookingHistoryPage from './pages/BookingHistoryPage';

const AdminDashboard = lazy(() => import('./pages/AdminDashboard.jsx'));
const AdminLayout = lazy(() => import('./pages/AdminDashboard.jsx').then(m => ({ default: m.AdminLayout })));
const AdminProperties = lazy(() => import('./pages/AdminProperties.jsx'));
const AdminPropertyForm = lazy(() => import('./pages/AdminPropertyForm.jsx'));
const AdminCalendar = lazy(() => import('./pages/AdminCalendar.jsx'));
const AdminBookings = lazy(() => import('./pages/AdminBookings.jsx'));
const AdminEarnings = lazy(() => import('./pages/AdminEarnings.jsx'));
const AdminPromos = lazy(() => import('./pages/AdminPromos.jsx'));
const AdminFeedback = lazy(() => import('./pages/AdminFeedback.jsx'));
const AdminMessages = lazy(() => import('./pages/AdminMessages.jsx'));
const AdminUsers = lazy(() => import('./pages/AdminUsers.jsx'));
const AdminPayouts = lazy(() => import('./pages/AdminPayouts.jsx'));
const PaymentCallback = lazy(() => import('./pages/PaymentCallback.jsx'));

// Home page component
function HomePage() {
  const [premiumProperties, setPremiumProperties] = useState([]);
  const [allProperties, setAllProperties] = useState([]);
  const [heroStats, setHeroStats] = useState(null);

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

  const marqueeItems = useMemo(() =>
    premiumProperties.length > 0
      ? [...premiumProperties, ...premiumProperties, ...premiumProperties, ...premiumProperties]
      : []
  , [premiumProperties]);

  // Weekly-rotating masonry images from property pool
  const masonryImages = useMemo(() => {
    // ISO week number (1–53) as seed so layout rotates every Monday
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

      {/* Auto-scrolling Premium Property Row — full-width */}
      {premiumProperties.length > 0 && (
        <div className="marquee-container w-full overflow-hidden pb-8 px-10 md:px-20 lg:px-32">
          <div className="marquee-track flex gap-6 w-max">
            {marqueeItems.map((property, i) => (
              <a
                key={`${property.id}-${i}`}
                href={`/property/${property.id}`}
                className="flex-shrink-0 w-64 group cursor-pointer no-underline"
              >
                {/* Image */}
                <div className="relative aspect-[4/3] overflow-hidden rounded-2xl shadow-sm shadow-md mb-3">
                  <img
                    src={property.images?.[0] || property.coverImage || 'https://images.unsplash.com/photo-1600607687939-ce8a6c25118c?w=600&q=80'}
                    alt={property.title}
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

      {/* Masonry Gallery — weekly rotation from property images */}
      <div className="max-w-7xl mx-auto px-4 md:px-6 mb-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 auto-rows-[120px] md:auto-rows-[150px]">
          {/* Tall — col 1 rows 1-2 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[0]} alt="Property photo" />
          </div>
          {/* Small — col 2 row 1 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[1]} alt="Property photo" />
          </div>
          {/* Tall — col 3 rows 1-2 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[2]} alt="Property photo" />
          </div>
          {/* Small — col 4 row 1 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[3]} alt="Property photo" />
          </div>

          {/* Small — col 2 row 2 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[4]} alt="Property photo" />
          </div>
          {/* Small — col 4 row 2 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[5]} alt="Property photo" />
          </div>

          {/* Small — col 1 row 3 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[6]} alt="Property photo" />
          </div>
          {/* Tall — col 2 rows 3-4 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[7]} alt="Property photo" />
          </div>
          {/* Small — col 3 row 3 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[8]} alt="Property photo" />
          </div>
          {/* Tall — col 4 rows 3-4 */}
          <div className="row-span-2 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[9]} alt="Property photo" />
          </div>

          {/* Small — col 1 row 4 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[10]} alt="Property photo" />
          </div>
          {/* Small — col 3 row 4 */}
          <div className="row-span-1 col-span-1 overflow-hidden rounded-xl">
            <img className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={masonryImages[11]} alt="Property photo" />
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
          subtitle="Explore Nairobi's vibrant dining scene — from street food to fine dining."
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
  return <div className="min-h-screen flex items-center justify-center bg-[#f8f9fa]"><Spinner /></div>;
}

function Page({ title, children }) {
  useEffect(() => { document.title = title ? `${title} — ZuriLofts` : 'ZuriLofts — Premium Short-let Apartments'; }, [title]);
  return children;
}

function App() {
  return (
    <Router>
      <ScrollToTop />
      <ChatWidget />
      <CookieConsent />
      <ErrorBoundary>
        <Routes>
          <Route path="/" element={<Page><HomePage /></Page>} />
          <Route path="/properties" element={<Page title="Properties"><PropertiesPage /></Page>} />
          <Route path="/property/:id" element={<PropertyPage />} />
          <Route path="/booking/:id" element={<Page title="Booking"><ProtectedRoute><BookingPage /></ProtectedRoute></Page>} />
          <Route path="/contact" element={<Page title="Contact"><ContactPage /></Page>} />
          <Route path="/login" element={<Page title="Login"><LoginPage /></Page>} />
          <Route path="/register" element={<Page title="Register"><RegisterPage /></Page>} />
          <Route path="/auth/callback" element={<OAuthCallback />} />
          <Route path="/profile" element={<Page title="Profile"><ProtectedRoute><ProfilePage /></ProtectedRoute></Page>} />
          <Route path="/messages" element={<Page title="Messages"><ProtectedRoute><MessagesPage /></ProtectedRoute></Page>} />
          <Route path="/privacy" element={<Page title="Privacy Policy"><PrivacyPage /></Page>} />
          <Route path="/terms" element={<Page title="Terms of Service"><TermsPage /></Page>} />
          <Route path="/favourites" element={<Page title="Favourites"><FavouritesPage /></Page>} />
          <Route path="/bookings" element={<Page title="My Bookings"><ProtectedRoute><BookingHistoryPage /></ProtectedRoute></Page>} />
          <Route path="/places" element={<Page title="Places"><PlacesPage /></Page>} />
          <Route path="/guides" element={<Page title="Travel Guides"><GuidesPage /></Page>} />
          <Route path="/guides/:slug" element={<Page title="Guide"><GuideDetailPage /></Page>} />
          <Route path="/restaurants" element={<Page title="Restaurants"><RestaurantsPage /></Page>} />
          <Route path="/payment/callback" element={<Suspense fallback={<Loading />}><Page title="Payment"><ProtectedRoute><PaymentCallback /></ProtectedRoute></Page></Suspense>} />
          <Route path="/admin" element={<Suspense fallback={<Loading />}><AdminRoute><AdminLayout /></AdminRoute></Suspense>}>
            <Route index element={<Suspense fallback={<Loading />}><AdminDashboard /></Suspense>} />
            <Route path="properties" element={<Suspense fallback={<Loading />}><AdminProperties /></Suspense>} />
            <Route path="properties/new" element={<Suspense fallback={<Loading />}><AdminPropertyForm /></Suspense>} />
            <Route path="properties/:id/edit" element={<Suspense fallback={<Loading />}><AdminPropertyForm /></Suspense>} />
            <Route path="properties/:id/calendar" element={<Suspense fallback={<Loading />}><AdminCalendar /></Suspense>} />
            <Route path="bookings" element={<Suspense fallback={<Loading />}><AdminBookings /></Suspense>} />
            <Route path="earnings" element={<Suspense fallback={<Loading />}><AdminEarnings /></Suspense>} />
            <Route path="users" element={<Suspense fallback={<Loading />}><AdminUsers /></Suspense>} />
            <Route path="promos" element={<Suspense fallback={<Loading />}><AdminPromos /></Suspense>} />
            <Route path="feedback" element={<Suspense fallback={<Loading />}><AdminFeedback /></Suspense>} />
            <Route path="messages" element={<Suspense fallback={<Loading />}><AdminMessages /></Suspense>} />
            <Route path="guides" element={<Suspense fallback={<Loading />}><AdminGuides /></Suspense>} />
            <Route path="payouts" element={<Suspense fallback={<Loading />}><AdminPayouts /></Suspense>} />
          </Route>
          <Route path="/host/payouts" element={<Page title="Host Payouts"><ProtectedRoute><HostPayouts /></ProtectedRoute></Page>} />
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </ErrorBoundary>
    </Router>
  );
}

export default App;
