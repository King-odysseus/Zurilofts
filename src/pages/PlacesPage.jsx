import { Link } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import NearbySection from '../components/NearbySection.jsx';
import { PLACES_TO_VISIT, AREAS, PLACE_CATEGORIES } from '../data/nearby.js';
import { useLanguage } from '../context/LanguageContext.jsx';

function PlacesPage() {
  const { t } = useLanguage();
  return (
    <main className="op-public-page op-public-directory">
      <div className="op-content-container pt-2 sm:pt-4">
        <Link to="/" className="op-directory-back">
          <ChevronLeft className="w-4 h-4" strokeWidth={2} aria-hidden="true" />
          {t('discovery.backToHome')}
        </Link>
        <NearbySection
          title={t('discovery.placesTitle')}
          subtitle={t('discovery.placesSubtitle')}
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
