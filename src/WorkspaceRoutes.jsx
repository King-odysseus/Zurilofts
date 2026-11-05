import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import AdminRoute from './components/AdminRoute.jsx';
import HostRoute from './components/HostRoute.jsx';
import HostLayout from './components/HostLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminDashboard, { AdminLayout } from './pages/AdminDashboard.jsx';
import AdminRevenue from './pages/AdminRevenue.jsx';
import AdminListingReview from './pages/AdminListingReview.jsx';
import AdminListingDetail from './pages/AdminListingDetail.jsx';
import AdminListingPreviewPage from './pages/AdminListingPreviewPage.jsx';
import AdminSettings from './pages/AdminSettings.jsx';
import AdminPropertyForm from './pages/AdminPropertyForm.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminHostApplications from './pages/AdminHostApplications.jsx';
import AdminHostApplicationReview from './pages/AdminHostApplicationReview.jsx';
import AdminAddOns from './pages/AdminAddOns.jsx';
import AdminFeedback from './pages/AdminFeedback.jsx';
import AdminMessages from './pages/AdminMessages.jsx';
import AdminGuides from './pages/AdminGuides.jsx';
import AdminTrustSafety from './pages/AdminTrustSafety.jsx';
import AdminGovernance from './pages/AdminGovernance.jsx';
import AdminIncidents from './pages/AdminIncidents.jsx';
import AdminBookings from './pages/AdminBookings.jsx';
import HostApplicationPage from './pages/HostApplicationPage.jsx';
import HostArrivalGuidePage from './pages/HostArrivalGuidePage.jsx';
import HostCalendarPage from './pages/HostCalendarPage.jsx';
import HostEarningsPage from './pages/HostEarningsPage.jsx';
import HostInboxPage from './pages/HostInboxPage.jsx';
import HostListingsPage from './pages/HostListingsPage.jsx';
import HostListingPreviewPage from './pages/HostListingPreviewPage.jsx';
import HostVerificationPage from './pages/HostVerificationPage.jsx';
import HostTodayPage from './pages/HostTodayPage.jsx';
import HostPayouts from './pages/HostPayouts.jsx';
import HostReservationsPage from './pages/HostReservationsPage.jsx';
import HostReservationDetailPage from './pages/HostReservationDetailPage.jsx';
import HostSettingsPage from './pages/HostSettingsPage.jsx';
import HostInsightsPage from './pages/HostInsightsPage.jsx';
import HostPromosPage from './pages/HostPromosPage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const hostPage = (page) => <HostRoute><HostLayout>{page}</HostLayout></HostRoute>;

// The host editor and the admin listing screens used to sit under
// /host/properties and /admin/properties. Those addresses are in bookmarks and
// in links already sent, so they map onto the renamed paths instead of
// resolving to nothing. The listing id is carried over, so a saved editor link
// still opens the same listing rather than the index.
function LegacyListingPath() {
  const { pathname, search } = useLocation();
  const target = pathname.startsWith('/host/')
    ? pathname.replace('/host/properties', '/host/listings')
    : pathname.replace('/admin/properties', '/admin/listings');
  return <Navigate to={`${target}${search}`} replace />;
}

export default function WorkspaceRoutes() {
  return <Routes>
    <Route path="/host/application" element={<ProtectedRoute><HostLayout><HostApplicationPage /></HostLayout></ProtectedRoute>} />
    <Route path="/host/today" element={hostPage(<HostTodayPage />)} />
    <Route path="/host/calendar" element={hostPage(<HostCalendarPage />)} />
    <Route path="/host/calendar/:id" element={hostPage(<HostCalendarPage />)} />
    <Route path="/host/listings" element={hostPage(<HostListingsPage />)} />
    {/* The host's own read of the listing, not the traveller page: same content,
        host chrome, and no way to book a stay they own. */}
    <Route path="/host/listings/:id/preview" element={hostPage(<HostListingPreviewPage />)} />
    {/* Host messages are their own inbox: guests writing about a stay. The
        traveller inbox at /inbox is the other side of the same table. */}
    <Route path="/host/inbox" element={hostPage(<HostInboxPage />)} />
    <Route path="/host/inbox/:conversationId" element={hostPage(<HostInboxPage />)} />
    <Route path="/host/reservations" element={hostPage(<HostReservationsPage />)} />
    <Route path="/host/reservations/:id" element={hostPage(<HostReservationDetailPage />)} />
    <Route path="/host/insights" element={hostPage(<HostInsightsPage />)} />
    <Route path="/host/earnings" element={hostPage(<HostEarningsPage />)} />
    <Route path="/host/listings/new" element={hostPage(<AdminPropertyForm />)} />
    <Route path="/host/listings/:id/edit" element={hostPage(<AdminPropertyForm />)} />
    <Route path="/host/listings/:id/arrival-guide" element={hostPage(<HostArrivalGuidePage />)} />
    {/* Old host addresses, kept alive for bookmarks and sent links. */}
    <Route path="/host/properties/*" element={<LegacyListingPath />} />
    <Route path="/host/payouts" element={hostPage(<HostPayouts />)} />
    <Route path="/host/discounts" element={hostPage(<HostPromosPage />)} />
    <Route path="/host/settings" element={hostPage(<HostSettingsPage />)} />
    <Route path="/host/verification" element={hostPage(<HostVerificationPage />)} />
    <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
      <Route index element={<AdminDashboard />} />
      <Route path="revenue" element={<AdminRevenue />} />
      {/* Listings are host-owned. Admin keeps the approval queue only, so the
          old create/edit/calendar screens redirect instead of resolving. */}
      <Route path="listings" element={<AdminListingReview />} />
      {/* One listing, reviewed in place. The public guest page is the wrong
          context for a moderator: it carries the booking widget and none of the
          review controls, and leaving /admin loses the workspace entirely. */}
      <Route path="listings/:id" element={<AdminListingDetail />} />
      <Route path="listings/:id/preview" element={<AdminListingPreviewPage />} />
      {/* Old admin addresses. The id is preserved where there is one, so a
          bookmarked review page reopens the same listing. */}
      <Route path="properties" element={<LegacyListingPath />} />
      <Route path="properties/:id" element={<LegacyListingPath />} />
      <Route path="properties/:id/preview" element={<LegacyListingPath />} />
      <Route path="properties/new" element={<Navigate to="/admin/listings" replace />} />
      <Route path="properties/:id/edit" element={<Navigate to="/admin/listings" replace />} />
      <Route path="properties/:id/calendar" element={<Navigate to="/admin/listings" replace />} />
      {/* Bookings are host-owned day to day, but a reservation that needs
          confirming, cancelling or refunding is an admin decision, so the
          platform keeps a cross-host list. Money and discounts stay with hosts. */}
      <Route path="bookings" element={<AdminBookings />} />
      <Route path="earnings" element={<Navigate to="/admin" replace />} />
      <Route path="payouts" element={<Navigate to="/admin" replace />} />
      <Route path="promos" element={<Navigate to="/admin" replace />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="host-applications" element={<AdminHostApplications />} />
      {/* One application, reviewed on its own page: a full record, the decision
          and the reply to the host do not fit in a dialog, and a returned
          application has to be reopenable from a link. */}
      <Route path="host-applications/:id" element={<AdminHostApplicationReview />} />
      <Route path="trust-safety" element={<AdminTrustSafety />} />
      <Route path="identity-verifications" element={<Navigate to="/admin/trust-safety" replace />} />
      <Route path="disputes" element={<Navigate to="/admin/trust-safety" replace />} />
      <Route path="governance" element={<AdminGovernance />} />
      <Route path="incidents" element={<AdminIncidents />} />
      <Route path="audit" element={<Navigate to="/admin/governance" replace />} />
      <Route path="addons" element={<AdminAddOns />} />
      <Route path="feedback" element={<AdminFeedback />} />
      <Route path="messages" element={<AdminMessages />} />
      <Route path="messages/:userId" element={<AdminMessages />} />
      <Route path="guides" element={<AdminGuides />} />
      {/* The admin's own account, kept inside the workspace instead of sending
          them to /profile, which is the traveller account page. */}
      <Route path="settings" element={<AdminSettings />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
