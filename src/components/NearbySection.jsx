import { useState, lazy, Suspense } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Select, TextInput } from 'flowbite-react';
import Spinner from './Spinner.jsx';
import { googleMapsDirectionsUrl } from '../utils/googleMaps.js';

const NearbyMap = lazy(() => import('./NearbyMap.jsx'));

/** Card for a single place or restaurant */
function NearbyCard({ item, areaLabels, categoryLabels }) {
  const mapsUrl = googleMapsDirectionsUrl({
    ...item,
    label: item.mapsQuery || `${item.name}, Nairobi, Kenya`,
    preferLabel: true,
  });
  return (
    <article className="op-place-card group">
      <div className="h-48 overflow-hidden relative">
        <img className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500 rounded-t-[14px]" src={item.image} alt={item.name} />
        <span className="op-place-area">{areaLabels[item.area] || item.area}</span><a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Get directions in Google Maps"
           className="absolute bottom-2 right-2 z-10 rounded-full bg-white/90 p-2 shadow-md backdrop-blur-sm transition-all duration-200 hover:bg-[#0B1F42] hover:text-white">
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </a>
      </div>
      <div className="op-place-copy p-5">
        <span className="op-place-category">{categoryLabels?.[item.category] || item.category}</span>
        <h3 className="mb-2 text-lg font-bold text-[#0B1F42]">{item.name}</h3>
        <p className="text-charcoal text-sm leading-relaxed">{item.desc}</p>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 min-h-[44px] rounded-lg bg-[#C49A6C] px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#B8895C]"
        >
          Get directions
          <span aria-hidden="true">↗</span>
        </a>
      </div>
    </article>
  );
}

NearbyCard.propTypes = {
  item: PropTypes.object.isRequired,
  areaLabels: PropTypes.object.isRequired,
  categoryLabels: PropTypes.object,
};

function NearbySection({ title, subtitle, items, areaLabels, categoryLabels, categories, viewMoreLink, maxCards }) {
  const [areaFilter, setAreaFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [query, setQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid'); // 'grid' | 'map'

  const filtered = items.filter((item) => {
    const areaMatch = areaFilter === 'all' || item.area === areaFilter;
    const catMatch = categoryFilter === 'all' || item.category === categoryFilter;
    return areaMatch && catMatch && `${item.name} ${item.desc} ${item.area}`.toLowerCase().includes(query.toLowerCase());
  });

  const visible = maxCards ? filtered.slice(0, maxCards) : filtered;
  const hasMore = maxCards && filtered.length > maxCards;

  const areaOptions = Object.entries(areaLabels).map(([k, v]) => ({ value: k, label: v }));
  const catOptions = categories && Object.entries(categoryLabels).map(([k, v]) => ({ value: k, label: v }));

  return (
    <div className="op-places-list mt-8 md:mt-12 mb-16">
      {/* Centered Header */}
      <div className="mb-8 rounded-2xl border border-[#E3E8EF] bg-white px-5 py-8 text-center shadow-[0_4px_16px_rgba(11,31,66,0.04)] md:px-8 md:py-10">
        <h2 className="text-3xl font-bold text-[#0B1F42] md:text-4xl">{title}</h2>
        <p className="text-cool-grey max-w-2xl mx-auto text-base md:text-lg mt-3 px-2 md:px-0">{subtitle}</p>
      </div>

      {/* Filters + View Toggle */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-10 px-4 md:px-0">
        <TextInput className="op-place-search-wrap" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, areas or categories" aria-label="Search places" />
        <Select className="op-place-select-wrap" value={areaFilter} onChange={(event) => setAreaFilter(event.target.value)} aria-label="Filter by area">
          {areaOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
        </Select>
        {catOptions && (
          <Select className="op-place-select-wrap" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} aria-label="Filter by category">
            {catOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
          </Select>
        )}
        <button className="op-place-clear" type="button" onClick={() => { setQuery(''); setAreaFilter('all'); setCategoryFilter('all'); }}>Clear all</button><span className="op-place-count">{filtered.length} places</span>
        {/* Map/Grid toggle */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setViewMode('grid')}
            className={`rounded-[10px] p-2 transition-colors ${viewMode === 'grid' ? 'bg-[#0B1F42] text-white' : 'bg-[#F7F4EF] text-[#52606F]'}`}
            aria-label="Grid view"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
            </svg>
          </button>
          <button
            onClick={() => setViewMode('map')}
            className={`rounded-[10px] p-2 transition-colors ${viewMode === 'map' ? 'bg-[#0B1F42] text-white' : 'bg-[#F7F4EF] text-[#52606F]'}`}
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
        <p className="py-12 text-center text-[#5B6B82]">Nothing matches those filters - try a different area or category.</p>
      ) : viewMode === 'map' ? (
        <Suspense fallback={<div className="flex items-center justify-center py-24"><Spinner /></div>}>
          <NearbyMap items={filtered} title={title} />
        </Suspense>
      ) : (
        <>
          <div className="op-place-grid grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {visible.map((item) => (
              <NearbyCard key={item.name} item={item} areaLabels={areaLabels} categoryLabels={categoryLabels} />
            ))}
          </div>

          {hasMore && (
            <div className="text-center mt-10">
              <Link
                to={viewMoreLink}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-[10px] border border-[#E3E8EF] px-8 py-3 font-semibold text-[#0B1F42] transition-all duration-200 hover:bg-[#F7F4EF]"
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
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    area: PropTypes.string.isRequired,
    category: PropTypes.string,
    desc: PropTypes.string,
    image: PropTypes.string,
    mapsQuery: PropTypes.string,
    lat: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    lng: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  })).isRequired,
  areaLabels: PropTypes.object.isRequired,
  categoryLabels: PropTypes.object,
  categories: PropTypes.bool,
  viewMoreLink: PropTypes.string,
  maxCards: PropTypes.number,
};

export default NearbySection;
