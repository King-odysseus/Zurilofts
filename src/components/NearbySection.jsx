import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Dropdown from './Dropdown.jsx';
import Spinner from './Spinner.jsx';

const NearbyMap = lazy(() => import('./NearbyMap.jsx'));

/** Card for a single place or restaurant */
function NearbyCard({ item, areaLabels }) {
  const mapsUrl = `https://www.google.com/maps/dir/?api=1&destination=${item.lat},${item.lng}`;
  return (
    <div className="neu-card overflow-hidden transition-shadow duration-300 group">
      <div className="h-48 overflow-hidden relative">
        <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-2xl" src={item.image} alt={item.name} />
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Get directions in Google Maps"
           className="absolute bottom-2 right-2 bg-white/90 backdrop-blur-sm rounded-full p-2 shadow-md hover:bg-[#C49A6C] hover:text-white transition-all duration-200 z-10">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
      </div>
      <div className="p-5">
        <span className="inline-block bg-[#C49A6C]/10 text-[#C49A6C] text-xs font-semibold px-2 py-0.5 rounded-full mb-2 uppercase tracking-wide">
          {areaLabels[item.area] || item.area}
        </span>
        <h3 className="text-lg font-bold text-[#0B0B45] mb-2">{item.name}</h3>
        <p className="text-charcoal text-sm leading-relaxed">{item.desc}</p>
      </div>
    </div>
  );
}

NearbyCard.propTypes = {
  item: PropTypes.object.isRequired,
  areaLabels: PropTypes.object.isRequired,
};

function NearbySection({ title, subtitle, items, areaLabels, categoryLabels, categories, viewMoreLink, maxCards }) {
  const [areaFilter, setAreaFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'

  const filtered = items.filter((item) => {
    const areaMatch = areaFilter === 'all' || item.area === areaFilter;
    const catMatch = categoryFilter === 'all' || item.category === categoryFilter;
    return areaMatch && catMatch;
  });

  const visible = maxCards ? filtered.slice(0, maxCards) : filtered;
  const hasMore = maxCards && filtered.length > maxCards;

  const areaOptions = Object.entries(areaLabels).map(([k, v]) => ({ value: k, label: v }));
  const catOptions = categories && Object.entries(categoryLabels).map(([k, v]) => ({ value: k, label: v }));

  return (
    <div className="mt-32 md:mt-44 mb-16">
      {/* Centered Header */}
      <div className="text-center mb-8 px-4 md:px-0">
        <h2 className="text-3xl md:text-4xl font-bold text-[#0B0B45]">{title}</h2>
        <p className="text-cool-grey max-w-2xl mx-auto text-base md:text-lg mt-3 px-2 md:px-0">{subtitle}</p>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-10 px-4 md:px-0">
        <Dropdown
          value={areaFilter}
          onChange={setAreaFilter}
          options={areaOptions}
          triggerClassName=" w-full sm:w-auto px-4 py-2 bg-white text-[#1f2937] rounded-xl text-sm min-w-[160px] border border-[#D9D9D9]"
          ariaLabel="Filter by area"
        />
        {catOptions && (
          <Dropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={catOptions}
            triggerClassName=" w-full sm:w-auto px-4 py-2 bg-white text-[#1f2937] rounded-xl text-sm min-w-[160px] border border-[#D9D9D9]"
            ariaLabel="Filter by category"
          />
        )}
        {/* Map/Grid toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'grid' ? 'bg-[#C49A6C] text-white' : 'bg-[#f0f0f0] text-[#6b7280]'}`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`p-2 rounded-lg transition-colors ${viewMode === 'map' ? 'bg-[#C49A6C] text-white' : 'bg-[#f0f0f0] text-[#6b7280]'}`}
            aria-label="Map view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Grid or Map */}
      {filtered.length === 0 ? (
        <p className="text-center text-[#6b7280] py-12">Nothing matches those filters — try a different area or category.</p>
      ) : viewMode === 'map' ? (
        <Suspense fallback={<div className="flex items-center justify-center py-24"><Spinner /></div>}>
          <NearbyMap items={filtered} title={title} />
        </Suspense>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {visible.map((item, i) => (
              <NearbyCard key={i} item={item} areaLabels={areaLabels} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-10">
              <Link
                to={viewMoreLink}
                className="inline-flex items-center gap-2 px-8 py-3 rounded-full border-2 border-[#0B0B45] text-[#0B0B45] font-semibold hover:bg-[#0B0B45] hover:text-white transition-all duration-200"
              >
                View All {filtered.length} Places
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                </svg>
              </Link>
            </div>
          )}
        </>
      )}
    </div>
  );
}

NearbySection.propTypes = {
  title: PropTypes.string.isRequired,
  subtitle: PropTypes.string.isRequired,
  items: PropTypes.array.isRequired,
  areaLabels: PropTypes.object.isRequired,
  categoryLabels: PropTypes.object,
  categories: PropTypes.bool,
  viewMoreLink: PropTypes.string,
  maxCards: PropTypes.number,
};

export default NearbySection;
