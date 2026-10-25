import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import NearbySection from '../components/NearbySection.jsx';
import { PLACES_TO_VISIT, AREAS, PLACE_CATEGORIES } from '../data/nearby.js';

function PlacesPage() {
  return (
    <main className="op-public-page op-public-directory">
      <div className="op-content-container">
        <Link to="/" className="op-directory-back">
          <ChevronLeft className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          Back to Home
        </Link>
        <NearbySection
          title="Places to see in Nairobi"
          subtitle="Markets, galleries, trails and viewpoints, the spots locals actually send visitors to."
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
