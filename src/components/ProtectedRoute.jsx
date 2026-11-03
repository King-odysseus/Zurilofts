import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { rememberPostAuthPath } from '../utils/authIntent.js';

function ProtectedRoute({ children }) {
  const { isAuthenticated, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#C5A28C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5B6B82] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // The query and the section anchor are part of the destination: a filtered
    // list or a deep link into a page is often the whole reason for the link,
    // and returning to the bare path loses it.
    const destination = `${location.pathname}${location.search}${location.hash}`;
    rememberPostAuthPath(destination);
    return <Navigate to={`/login?returnUrl=${encodeURIComponent(destination)}`} replace />;
  }

  return children;
}

export default ProtectedRoute;
