import { useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Badge, Button, TextInput } from 'flowbite-react';
import { ArrowUpRight, ChevronRight, MapPin } from 'lucide-react';
import { googleMapsDirectionsUrl } from '../utils/googleMaps.js';
import SelectMenu from './SelectMenu.jsx';

/** Card for a single place or restaurant */
function NearbyCard({ item, areaLabels, categoryLabels }) {
  const mapsUrl = googleMapsDirectionsUrl({
    ...item,
    label: item.mapsQuery || `${item.name}, Nairobi, Kenya`,
    preferLabel: true,
  });
  return (
    <article className="group overflow-hidden rounded-xl border border-border bg-white shadow-sm">
      <div className="relative h-48 overflow-hidden">
        <img className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" src={item.image} alt={item.name} />
        <Badge color="info" className="absolute left-3 top-3">{areaLabels[item.area] || item.area}</Badge>
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer" title="Get directions in Google Maps"
           className="absolute bottom-3 right-3 z-10 rounded-full bg-white/90 p-2 text-navy shadow-sm backdrop-blur transition-colors hover:bg-white">
          <MapPin className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </a>
      </div>
      <div className="p-5">
        <span className="text-[11px] font-semibold uppercase tracking-wide text-primary-700">{categoryLabels?.[item.category] || item.category}</span>
        <h3 className="mb-2 mt-1 text-lg font-bold text-navy">{item.name}</h3>
        <p className="text-sm leading-relaxed text-charcoal">{item.desc}</p>
        <Button as="a" href={mapsUrl} target="_blank" rel="noopener noreferrer" color="light" className="mt-4">
          Get directions
          <ArrowUpRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        </Button>
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

  const filtered = items.filter((item) => {
    const areaMatch = areaFilter === 'all' || item.area === areaFilter;
    const catMatch = categoryFilter === 'all' || item.category === categoryFilter;
    return areaMatch && catMatch && `${item.name} ${item.desc} ${item.area}`.toLowerCase().includes(query.toLowerCase());
  });

  const visible = maxCards ? filtered.slice(0, maxCards) : filtered;
  const hasMore = maxCards && filtered.length > maxCards;

  // "all" is a real entry in areaLabels/categoryLabels, so the label lists it as
  // the clear-the-filter choice instead of needing a separate empty option.
  const areaOptions = Object.entries(areaLabels).map(([k, v]) => ({ value: k, label: v }));
  const catOptions = categories && Object.entries(categoryLabels).map(([k, v]) => ({ value: k, label: v }));

  return (
    <div className="mb-16 mt-8 md:mt-12">
      {/* Same header shape as the Guides page: eyebrow, title, muted lead, left aligned. */}
      <header className="mb-8">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">EXPLORE NAIROBI</p>
        <h2 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{title}</h2>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">{subtitle}</p>
      </header>

      {/* Filters: a slim single row on desktop, stacked full width on phones. */}
      <div className="mb-8 flex flex-col items-stretch gap-2 sm:flex-row sm:flex-wrap sm:items-center">
        <TextInput sizing="sm" className="sm:w-64" type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places" aria-label="Search places" />
        <SelectMenu
          sizing="sm"
          wrapperClassName="sm:w-44"
          value={areaFilter}
          onChange={(next) => setAreaFilter(next)}
          options={areaOptions}
          ariaLabel="Filter by area"
        />
        {catOptions && (
          <SelectMenu
            sizing="sm"
            wrapperClassName="sm:w-44"
            value={categoryFilter}
            onChange={(next) => setCategoryFilter(next)}
            options={catOptions}
            ariaLabel="Filter by category"
          />
        )}
        <Button color="light" size="xs" type="button" onClick={() => { setQuery(''); setAreaFilter('all'); setCategoryFilter('all'); }}>Clear all</Button>
        <span className="text-xs text-muted sm:ml-1">{filtered.length} places</span>
      </div>

      {/* List only by design: the grid/map toggle and its NearbyMap view were removed. */}
      {filtered.length === 0 ? (
        <p className="py-12 text-center text-muted">Nothing matches those filters - try a different area or category.</p>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-2 lg:grid-cols-3">
            {visible.map((item) => (
              <NearbyCard key={item.name} item={item} areaLabels={areaLabels} categoryLabels={categoryLabels} />
            ))}
          </div>

          {hasMore && (
            <div className="mt-10 text-center">
              <Button as={Link} to={viewMoreLink} color="light">
                View All {filtered.length} Places
                <ChevronRight className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
              </Button>
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
