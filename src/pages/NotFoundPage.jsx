import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import { useAuth } from '../context/AuthContext.jsx';

function NotFoundPage() {
  const { isAuthenticated } = useAuth();
  return (
    <div className="min-h-screen bg-[#F7F4EF] flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="max-w-md rounded-2xl border border-[#E3E8EF] bg-white p-8 text-center shadow-[0_4px_16px_rgba(11,31,66,0.04)] sm:p-10">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.16em] text-[#C49A6C]">ZuriLofts</p>
          <h1 className="mb-2 text-2xl font-bold text-[#0B1F42]">This page is unavailable</h1>
          <p className="mb-6 text-sm text-[#5B6B82]">
            The page you are looking for may have been moved or no longer exists.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
            <Link
              to="/"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] bg-[#0B1F42] px-6 py-2.5 font-semibold text-white transition-all duration-200 hover:bg-[#07072E]"
            >
              Go to Home
            </Link>
            <Link
              to="/properties"
              className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#E3E8EF] bg-white px-6 py-2.5 font-semibold text-[#0B1F42] transition-all duration-200 hover:bg-[#F7F4EF]"
            >
              Explore stays
            </Link>
            {isAuthenticated && (
              <Link
                to="/trips"
                className="inline-flex min-h-[44px] items-center justify-center rounded-[10px] border border-[#E3E8EF] bg-white px-6 py-2.5 font-semibold text-[#0B1F42] transition-all duration-200 hover:bg-[#F7F4EF]"
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
