import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar.jsx';
import Footer from '../components/Footer.jsx';
import NearbySection from '../components/NearbySection.jsx';
import { PLACES_TO_EAT, AREAS, EAT_CATEGORIES } from '../data/nearby.js';

function RestaurantsPage() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />
      <div className="pt-24 pb-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm text-[#6b7280] hover:text-[#C49A6C] transition-colors mb-6">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Back to Home
          </Link>
          <NearbySection
            title="Best Places to Eat in Nairobi"
            subtitle="Explore Nairobi's vibrant dining scene — from street food to fine dining."
            items={PLACES_TO_EAT}
            areaLabels={AREAS}
            categoryLabels={EAT_CATEGORIES}
            categories
          />
        </div>
      </div>
      <Footer />
    </div>
  );
}

export default RestaurantsPage;
