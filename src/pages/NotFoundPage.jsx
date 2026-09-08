import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext.jsx';

function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-[#F7F7F5] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center max-w-md rounded-[14px] border border-[#E5E7EB] bg-white p-8 sm:p-10 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#6b7280] mb-3">ZuriLofts</p>
          <h1 className="text-2xl font-bold text-[#222222] mb-2">This page is unavailable</h1>
          <p className="text-sm text-[#6b7280] mb-6">
            The page you are looking for may have been moved or no longer exists.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex items-center justify-center min-h-[44px] bg-[#C49A6C] text-white px-6 py-2.5 rounded-lg font-semibold hover:bg-[#B8895C] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Go to Home
            </Link>
            <Link
              to="/properties"
              className="inline-flex items-center justify-center min-h-[44px] bg-white text-[#222222] px-6 py-2.5 rounded-lg font-semibold border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
            >
              Explore stays
            </Link>
            {isAuthenticated && (
              <Link
                to="/trips"
                className="inline-flex items-center justify-center min-h-[44px] bg-white text-[#222222] px-6 py-2.5 rounded-lg font-semibold border border-[#E5E7EB] hover:bg-[#F7F7F5] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#2563EB]"
              >
                Go to Trips
              </Link>
            )}
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default NotFoundPage;
