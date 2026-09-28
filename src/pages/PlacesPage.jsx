import { Link } from 'react-router-dom';
import NearbySection from '../components/NearbySection.jsx';
import { PLACES_TO_VISIT, AREAS, PLACE_CATEGORIES } from '../data/nearby.js';

function PlacesPage() {
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
          title="Places to see in Nairobi"
          subtitle="Markets, galleries, trails and viewpoints — the spots locals actually send visitors to."
          items={PLACES_TO_VISIT}
          areaLabels={AREAS}
          categoryLabels={PLACE_CATEGORIES}
          categories
        />
      </div>
    </main>
  );
}

export default PlacesPage;
