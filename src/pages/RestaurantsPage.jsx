import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import NearbySection from '../components/NearbySection.jsx';
import { PLACES_TO_EAT, AREAS, EAT_CATEGORIES } from '../data/nearby.js';

function RestaurantsPage() {
  return (
    <main className="min-h-[70vh] bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 md:py-10">
        <Link to="/" className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-primary-600">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
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
