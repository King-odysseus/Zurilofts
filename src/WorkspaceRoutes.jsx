import { Route, Routes } from 'react-router-dom';
import AdminRoute from './components/AdminRoute.jsx';
import HostRoute from './components/HostRoute.jsx';
import HostLayout from './components/HostLayout.jsx';
import ProtectedRoute from './components/ProtectedRoute.jsx';
import AdminDashboard, { AdminLayout } from './pages/AdminDashboard.jsx';
import AdminListingReview from './pages/AdminListingReview.jsx';
import AdminPropertyForm from './pages/AdminPropertyForm.jsx';
import AdminCalendar from './pages/AdminCalendar.jsx';
import AdminBookings from './pages/AdminBookings.jsx';
import AdminEarningsPage from './pages/AdminEarningsPage.jsx';
import AdminUsers from './pages/AdminUsers.jsx';
import AdminHostApplications from './pages/AdminHostApplications.jsx';
import AdminPromos from './pages/AdminPromos.jsx';
import AdminAddOns from './pages/AdminAddOns.jsx';
import AdminFeedback from './pages/AdminFeedback.jsx';
import AdminMessages from './pages/AdminMessages.jsx';
import AdminGuides from './pages/AdminGuides.jsx';
import AdminPayoutsPage from './pages/AdminPayoutsPage.jsx';
import HostApplicationPage from './pages/HostApplicationPage.jsx';
import HostCalendarPage from './pages/HostCalendarPage.jsx';
import HostEarningsPage from './pages/HostEarningsPage.jsx';
import HostListingsPage from './pages/HostListingsPage.jsx';
import HostTodayPage from './pages/HostTodayPage.jsx';
import HostPayouts from './pages/HostPayouts.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const hostPage = (page) => <HostRoute><HostLayout>{page}</HostLayout></HostRoute>;

export default function WorkspaceRoutes() {
  return <Routes>
    <Route path="/host/application" element={<ProtectedRoute><HostApplicationPage /></ProtectedRoute>} />
    <Route path="/host/today" element={hostPage(<HostTodayPage />)} />
    <Route path="/host/calendar" element={hostPage(<HostCalendarPage />)} />
    <Route path="/host/calendar/:id" element={hostPage(<HostCalendarPage />)} />
    <Route path="/host/listings" element={hostPage(<HostListingsPage />)} />
    <Route path="/host/earnings" element={hostPage(<HostEarningsPage />)} />
    <Route path="/host/properties/new" element={hostPage(<AdminPropertyForm />)} />
    <Route path="/host/properties/:id/edit" element={hostPage(<AdminPropertyForm />)} />
    <Route path="/host/payouts" element={hostPage(<HostPayouts />)} />
    <Route path="/admin" element={<AdminRoute><AdminLayout /></AdminRoute>}>
      <Route index element={<AdminDashboard />} />
      <Route path="properties" element={<AdminListingReview />} />
      <Route path="properties/new" element={<AdminPropertyForm />} />
      <Route path="properties/:id/edit" element={<AdminPropertyForm />} />
      <Route path="properties/:id/calendar" element={<AdminCalendar />} />
      <Route path="bookings" element={<AdminBookings />} />
      <Route path="earnings" element={<AdminEarningsPage />} />
      <Route path="users" element={<AdminUsers />} />
      <Route path="host-applications" element={<AdminHostApplications />} />
      <Route path="promos" element={<AdminPromos />} />
      <Route path="addons" element={<AdminAddOns />} />
      <Route path="feedback" element={<AdminFeedback />} />
      <Route path="messages" element={<AdminMessages />} />
      <Route path="messages/:userId" element={<AdminMessages />} />
      <Route path="guides" element={<AdminGuides />} />
      <Route path="payouts" element={<AdminPayoutsPage />} />
    </Route>
    <Route path="*" element={<NotFoundPage />} />
  </Routes>;
}
