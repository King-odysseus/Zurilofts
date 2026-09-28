import { Link } from 'react-router-dom';
import NearbySection from '../components/NearbySection.jsx';
import { PLACES_TO_EAT, AREAS, EAT_CATEGORIES } from '../data/nearby.js';

function RestaurantsPage() {
  return (
    <main className="op-public-page op-public-directory">
      <div className="op-content-container">
        <Link to="/" className="op-directory-back">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Home
        </Link>
        <NearbySection
          title="Best Places to Eat in Nairobi"
          subtitle="Explore Nairobi's vibrant dining scene - from street food to fine dining."
          items={PLACES_TO_EAT}
          areaLabels={AREAS}
          categoryLabels={EAT_CATEGORIES}
          categories
        />
      </div>
    </main>
  );
}

export default RestaurantsPage;
