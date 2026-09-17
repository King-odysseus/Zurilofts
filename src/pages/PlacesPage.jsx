import { lazy, Suspense, useMemo, useState } from 'react';
import { HomeHeader } from './HomePage.jsx';
import Footer from '../components/Footer.jsx';
import Dropdown from '../components/Dropdown.jsx';
import Spinner from '../components/Spinner.jsx';
import { AREAS, PLACE_CATEGORIES, PLACES_TO_VISIT } from '../data/nearby.js';
import { googleMapsDirectionsUrl } from '../utils/googleMaps.js';

const NearbyMap = lazy(() => import('../components/NearbyMap.jsx'));

function PlaceCard({ item }) {
  const directionsUrl = googleMapsDirectionsUrl({ ...item, label: item.mapsQuery || `${item.name}, Nairobi, Kenya`, preferLabel: true });
  return (
    <article className="group min-w-0 overflow-hidden rounded-2xl bg-white shadow-[0_8px_24px_rgba(11,31,66,0.07)] ring-1 ring-[#E3E8EF] transition-shadow hover:shadow-[0_12px_30px_rgba(11,31,66,0.13)]">
      <div className="relative aspect-[3/2] overflow-hidden">
        <img src={item.image} alt={item.name} className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
        <span className="absolute left-3 top-3 rounded-full bg-white/90 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.08em] text-[#0B1F42] backdrop-blur-sm">{AREAS[item.area] || item.area}</span>
      </div>
      <div className="p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[.1em] text-[#B8895C]">{PLACE_CATEGORIES[item.category] || item.category}</p>
        <h2 className="mt-1.5 text-base font-semibold text-[#0B1F42]">{item.name}</h2>
        <p className="mt-2 line-clamp-3 text-xs leading-5 text-[#5B6B82]">{item.desc}</p>
        <a href={directionsUrl} target="_blank" rel="noopener noreferrer" className="mt-4 inline-flex min-h-10 items-center rounded-full bg-[#C49A6C] px-4 text-xs font-semibold text-white transition-colors hover:bg-[#B8895C]">Get directions <span className="ml-1.5" aria-hidden="true">↗</span></a>
      </div>
    </article>
  );
}

function PlacesPage() {
  const [query, setQuery] = useState('');
  const [area, setArea] = useState('all');
  const [category, setCategory] = useState('all');
  const [viewMode, setViewMode] = useState('list');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filteredPlaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    return PLACES_TO_VISIT.filter((item) => {
      const matchesArea = area === 'all' || item.area === area;
      const matchesCategory = category === 'all' || item.category === category;
      const matchesQuery = !normalizedQuery || `${item.name} ${item.desc} ${item.area} ${item.category}`.toLowerCase().includes(normalizedQuery);
      return matchesArea && matchesCategory && matchesQuery;
    });
  }, [area, category, query]);
  const areaOptions = Object.entries(AREAS).map(([value, label]) => ({ value, label }));
  const categoryOptions = Object.entries(PLACE_CATEGORIES).map(([value, label]) => ({ value, label }));
  const hasFilters = area !== 'all' || category !== 'all' || query.trim();
  function clearFilters() { setArea('all'); setCategory('all'); setQuery(''); }

  return (
    <div className="min-h-screen overflow-x-hidden bg-[#F8FAFC] text-[#0B1F42]">
      <HomeHeader propertiesPage searchLabel="Search places" searchPath="/places" />
      <main>
        <section className="mx-auto max-w-[1200px] px-4 pb-5 pt-7 md:px-8 md:pb-6 md:pt-8">
          <p className="text-xs text-[#5B6B82]">Home <span className="mx-1">›</span> Places</p>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight md:text-[32px]">Places to visit in Nairobi</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#5B6B82] md:text-base">Discover shopping, nature, culture, and entertainment spots near your stay.</p>
        </section>
        <section className="mx-auto max-w-[1200px] px-4 pb-6 md:px-8"><div className="flex min-h-14 w-full items-center rounded-full border border-[#E3E8EF] bg-white px-4 shadow-[0_8px_24px_rgba(11,31,66,0.06)] focus-within:border-[#C49A6C] focus-within:ring-2 focus-within:ring-[#C49A6C]/15"><svg className="mr-3 h-5 w-5 shrink-0 text-[#0B1F42]" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></svg><label htmlFor="places-search" className="sr-only">Search places</label><input id="places-search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search places, neighbourhoods or experiences" className="min-w-0 flex-1 bg-transparent py-3 text-sm text-[#0B1F42] outline-none placeholder:text-[#94A3B8]" />{query && <button type="button" onClick={() => setQuery('')} className="rounded-full px-2 text-lg text-[#64748B] hover:text-[#B8895C]" aria-label="Clear place search">×</button>}</div></section>
        <section className="mx-auto max-w-[1200px] px-4 pb-6 md:px-8">
          <div className="hidden items-center justify-between gap-4 md:flex"><div className="flex flex-wrap gap-2"><Dropdown value={area} onChange={setArea} options={areaOptions} triggerClassName="rounded-full border border-[#E3E8EF] bg-white px-4 py-2 text-xs font-medium text-[#33415C]" menuClassName="left-0" ariaLabel="Filter places by area" /><Dropdown value={category} onChange={setCategory} options={categoryOptions} triggerClassName="rounded-full border border-[#E3E8EF] bg-white px-4 py-2 text-xs font-medium text-[#33415C]" menuClassName="left-0" ariaLabel="Filter places by category" /><button type="button" onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} className="rounded-full border border-[#E3E8EF] bg-white px-4 py-2 text-xs font-medium text-[#33415C] hover:border-[#C89B6D]">{viewMode === 'map' ? 'Show list' : 'Show map'}</button>{hasFilters && <button type="button" onClick={clearFilters} className="rounded-full px-3 py-2 text-xs font-semibold text-[#B8895C] hover:bg-[#C89B6D]/10">Clear all</button>}</div><p className="text-sm text-[#5B6B82]">{filteredPlaces.length} places</p></div>
          <div className="md:hidden"><div className="grid grid-cols-2 gap-3"><button type="button" onClick={() => setFiltersOpen(!filtersOpen)} className="min-h-11 rounded-full border border-[#E3E8EF] bg-white text-xs font-semibold">Filters{hasFilters ? ' ·' : ''}</button><button type="button" onClick={() => setViewMode(viewMode === 'map' ? 'list' : 'map')} className="min-h-11 rounded-full border border-[#E3E8EF] bg-white text-xs font-semibold">{viewMode === 'map' ? 'Show list' : 'Show map'}</button></div>{filtersOpen && <div className="mt-3 flex flex-wrap gap-2 rounded-2xl border border-[#E3E8EF] bg-white p-3"><Dropdown value={area} onChange={setArea} options={areaOptions} triggerClassName="rounded-full border border-[#E3E8EF] bg-white px-3 py-2 text-xs" menuClassName="left-0" ariaLabel="Filter places by area" /><Dropdown value={category} onChange={setCategory} options={categoryOptions} triggerClassName="rounded-full border border-[#E3E8EF] bg-white px-3 py-2 text-xs" menuClassName="left-0" ariaLabel="Filter places by category" /><button type="button" onClick={clearFilters} className="rounded-full px-3 py-2 text-xs font-semibold text-[#B8895C]">Clear all</button></div>}</div>
        </section>
        <section className="mx-auto max-w-[1200px] px-4 pb-16 md:px-8" aria-live="polite">{viewMode === 'map' && filteredPlaces.length > 0 ? <Suspense fallback={<div className="flex h-[420px] items-center justify-center rounded-2xl bg-white"><Spinner /></div>}><NearbyMap items={filteredPlaces} title="Places to visit in Nairobi" /></Suspense> : filteredPlaces.length > 0 ? <div className="grid grid-cols-1 gap-x-6 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">{filteredPlaces.map((item) => <PlaceCard key={item.name} item={item} />)}</div> : <div className="mx-auto max-w-md rounded-2xl border border-[#E3E8EF] bg-white p-8 text-center"><h2 className="text-base font-semibold">No places match your search.</h2><p className="mt-2 text-sm text-[#5B6B82]">Try another neighbourhood or category.</p><button type="button" onClick={clearFilters} className="mt-5 min-h-11 rounded-full bg-[#0B1F42] px-6 text-sm font-semibold text-white">Clear filters</button></div>}</section>
      </main>
      <Footer />
    </div>
  );
}

export default PlacesPage;
