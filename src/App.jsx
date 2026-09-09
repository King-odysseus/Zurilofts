import { useState, useEffect, useMemo, useCallback, Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import './index.css';
import Navbar from './components/Navbar';
import { SearchBar } from './components/Hero';
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
import MobileBottomNav from './components/MobileBottomNav.jsx';
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
// Property-type chips backed by the real `type` filter PropertiesPage
// already supports - no invented categories without matching inventory.
const HOME_TYPE_CHIPS = [
  { key: 'all', label: 'All stays' },
  { key: 'apartment', label: 'Apartments' },
  { key: 'studio', label: 'Studios' },
  { key: 'penthouse', label: 'Penthouses' },
];

function HomePage() {
  const navigate = useNavigate();
  const [allProperties, setAllProperties] = useState([]);
  const [recentlyViewed, setRecentlyViewed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeType, setActiveType] = useState('all');

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const propsRes = await apiClient.get('/properties');
      setAllProperties(propsRes.data.data || []);
    } catch (err) {
      console.error('HomePage load error', err);
      setError('We couldn\'t load properties right now. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

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

  // Stable (non-auto-moving) inventory grid, filtered to the active category
  // chip when one other than "all" is selected. Real filtering on real data,
  // not decorative pills.
  const gridProperties = useMemo(() => {
    const list = activeType === 'all' ? allProperties : allProperties.filter((p) => p.type === activeType);
    return list.slice(0, 12);
  }, [allProperties, activeType]);

  return (
    <>
      {/* Compact search-first discovery header */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <Navbar solid />
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-24 text-center md:px-6 md:pb-10 md:pt-28">
          <h1 className="text-2xl font-bold text-[#222222] md:text-3xl">Find your place in Nairobi</h1>
          <p className="mx-auto mt-2 max-w-xl text-sm text-[#6b7280] md:text-base">
            Premium furnished apartments in Nairobi&apos;s most desirable neighbourhoods.
          </p>
          <div className="mx-auto mt-7 max-w-4xl text-left">
            <SearchBar discovery />
          </div>
        </div>
      </section>

      {/* Property-type chips (real filter) + Filters/Show map access */}
      <section className="border-b border-[#E5E7EB] bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-4 md:px-6">
          <div className="flex flex-wrap gap-2">
            {HOME_TYPE_CHIPS.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveType(key)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB] ${
                  activeType === key ? 'bg-[#2563EB] text-white' : 'border border-[#E5E7EB] bg-white text-[#222222] hover:bg-[#F7F7F5]'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => navigate('/properties')}
              className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#222222] hover:bg-[#F7F7F5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
            </button>
            <button
              type="button"
              onClick={() => navigate('/properties?view=map')}
              className="flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#E5E7EB] bg-white px-3.5 py-1.5 text-xs font-medium text-[#222222] hover:bg-[#F7F7F5] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#2563EB]"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
              </svg>
              Show map
            </button>
          </div>
        </div>
      </section>

      {/* Stable inventory grid - no automatic movement, no filler duplication */}
      <section className="mx-auto max-w-7xl px-4 py-10 md:px-6 md:py-14">
        {loading && (
          <div className="flex justify-center py-16"><Spinner /></div>
        )}
        {!loading && error && (
          <div className="rounded-[14px] border border-[#E5E7EB] bg-white p-8 text-center">
            <p className="text-sm text-[#6b7280]">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#C49A6C] px-6 text-sm font-semibold text-white hover:bg-[#B8895C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Try again
            </button>
          </div>
        )}
        {!loading && !error && gridProperties.length === 0 && (
          <div className="rounded-[14px] border border-[#E5E7EB] bg-white p-8 text-center">
            <p className="text-sm text-[#6b7280]">No stays match this category yet.</p>
          </div>
        )}
        {!loading && !error && gridProperties.length > 0 && (
          <div className="grid grid-cols-1 gap-x-6 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
            {gridProperties.map((property) => (
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

      {/* Compact value section - keeps the marquee and hero presentation intact. */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 mt-16 md:mt-20" aria-label="Why stay with ZuriLofts">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
          {[
            { title: 'Verified stays', copy: 'Thoughtfully reviewed apartments in Nairobi neighbourhoods you can trust.', icon: 'M5 13l4 4L19 7' },
            { title: 'Ready to live', copy: 'Comfortable, furnished spaces with the essentials already taken care of.', icon: 'M3 10h18M5 10v10h14V10M8 10V7a4 4 0 018 0v3' },
            { title: 'Local support', copy: 'A responsive team is here before, during, and after your stay.', icon: 'M18 8A6 6 0 106 8c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4' },
          ].map((item) => (
            <div key={item.title} className="rounded-[14px] border border-[#E5E7EB] bg-white p-5 md:p-6 shadow-sm">
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-full bg-[#2563EB]/10 text-[#2563EB]">
                <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.8} d={item.icon} /></svg>
              </div>
              <h3 className="text-base font-bold text-[#222222]">{item.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-[#6b7280]">{item.copy}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Recommended Places to Visit - local exploration follows the main
          inventory rather than a decorative masonry gallery. */}
      <section className="max-w-7xl mx-auto px-4 md:px-6 mt-16 md:mt-20">
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

      <div className="mt-16 md:mt-20">
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
      <MobileBottomNav />
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
