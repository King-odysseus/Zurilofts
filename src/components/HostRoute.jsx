import { Navigate } from 'react-router-dom';
import PropTypes from 'prop-types';
import { CircleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

// Guards the host workspace (/host/*). Only an approved HOST, or a plain USER
// who has expressed hosting intent (a host application, any status), is
// admitted - applicants land straight in the dashboard and can prepare draft
// listings while verification is still pending; only publishing and payouts are
// gated behind an APPROVED application (enforced server-side). ADMINS are
// intentionally excluded from the host workspace: they administer the platform
// through /admin routes and are redirected there rather than being treated as
// hosts or shown the Access Denied panel. Unauthenticated visitors are sent to
// /login; any other non-host/non-intent user sees the Access Denied panel.
function HostRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  const hasHostIntent = user?.hostApplicationStatus != null;

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5B6B82] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.role === 'ADMIN') {
    return <Navigate to="/admin" replace />;
  }

  if (user?.role !== 'HOST' && !hasHostIntent) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CircleAlert className="w-10 h-10 text-red-500" strokeWidth={2} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1F42] mb-2">Access Denied</h2>
          <p className="text-[#5B6B82]">You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}

HostRoute.propTypes = {
  children: PropTypes.node.isRequired,
};

export default HostRoute;
