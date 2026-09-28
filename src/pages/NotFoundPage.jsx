import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';

function NotFoundPage() {
  return (
    <div className="min-h-screen bg-white flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-6xl font-bold text-[#0B0B45] mb-4">404</h1>
          <h2 className="text-xl font-bold text-[#1f2937] mb-2">Page Not Found</h2>
          <p className="text-[#6b7280] mb-6">The page you are looking for does not exist.</p>
          <Link
            to="/"
            className="inline-block bg-[#C49A6C] text-white px-6 py-2.5 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200"
          >
            Go Home
          </Link>
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default NotFoundPage;
