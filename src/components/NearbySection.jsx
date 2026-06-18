import { useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import Dropdown from './Dropdown.jsx';

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

      {/* Filters */}
      <div className="flex flex-col sm:flex-row justify-center items-center gap-3 mb-10 px-4 md:px-0">
        <Dropdown
          value={areaFilter}
          onChange={setAreaFilter}
          options={areaOptions}
          triggerClassName="neu-input w-full sm:w-auto px-4 py-2 bg-white text-[#1f2937] rounded-xl text-sm min-w-[160px]"
          ariaLabel="Filter by area"
        />
        {catOptions && (
          <Dropdown
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={catOptions}
            triggerClassName="neu-input w-full sm:w-auto px-4 py-2 bg-white text-[#1f2937] rounded-xl text-sm min-w-[160px]"
            ariaLabel="Filter by category"
          />
        )}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <p className="text-center text-[#6b7280] py-12">Nothing matches those filters — try a different area or category.</p>
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
