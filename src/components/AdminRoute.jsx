import { Navigate } from 'react-router-dom';
import { TriangleAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';

function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();

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

  // Admin control centre is ADMIN-only. Hosts have their own workspace under
  // /host/* and must never reach /admin/*.
  if (user?.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <TriangleAlert className="w-10 h-10 text-red-500" strokeWidth={2} aria-hidden="true" />
          </div>
          <h2 className="text-xl font-bold text-[#0B1F42] mb-2">Access Denied</h2>
          <p className="text-[#5B6B82]">You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminRoute;
