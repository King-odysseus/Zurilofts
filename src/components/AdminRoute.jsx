import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

function AdminRoute({ children }) {
  const { user, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#6b7280] text-sm">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Allow both ADMIN (full access) and HOST (scoped access)
  if (user?.role !== 'ADMIN' && user?.role !== 'HOST') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-center">
          <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-10 h-10 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-bold text-[#0B0B45] mb-2">Access Denied</h2>
          <p className="text-[#6b7280]">You don&apos;t have permission to view this page.</p>
        </div>
      </div>
    );
  }

  return children;
}

export default AdminRoute;
