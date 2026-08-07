import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PropertyCard from '../components/PropertyCard';
import Dropdown from '../components/Dropdown.jsx';
import TripSearchBar from '../components/TripSearchBar.jsx';
import { zuriImages } from '../assets/images';
import { AREAS } from '../data/nearby.js';
import apiClient from '../api/client.js';

const NEIGHBORHOODS = [
  { value: '', label: 'All Areas' },
  { value: 'kilimani', label: 'Kilimani' },
  { value: 'westlands', label: 'Westlands' },
  { value: 'karen', label: 'Karen' },
  { value: 'gigiri', label: 'Gigiri' },
  { value: 'lavington', label: 'Lavington' },
];

const GUEST_OPTIONS = [
  { value: '', label: 'Any Guests' },
  { value: '1', label: '1+ guest' },
  { value: '2', label: '2+ guests' },
  { value: '3', label: '3+ guests' },
  { value: '4', label: '4+ guests' },
];

const RATING_OPTIONS = [
  { value: '', label: 'Any Rating' },
  { value: '4', label: '4.0+' },
  { value: '4.5', label: '4.5+' },
];

const COMMON_AMENITIES = ['WiFi', 'Parking', 'Pool', 'Gym', 'AC', 'Kitchen', 'TV', 'Washer'];

const SORT_OPTIONS = [
  { value: 'default', label: 'Default' },
  { value: 'price_asc', label: 'Price: Low to High' },
  { value: 'price_desc', label: 'Price: High to Low' },
  { value: 'rating', label: 'Top Rated' },
  { value: 'newest', label: 'Newest' },
];

function PropertiesPage() {
  const [searchParams, setSearchParams] = useSearchParams();

  // ── Derive filter state from URL query params ──────────────────────
  const searchQuery = searchParams.get('search') || '';
  const filter = searchParams.get('type') || 'all';
  const bedFilter = searchParams.get('beds') || 'all';
  const priceRange = searchParams.get('price') || 'all';
  const sort = searchParams.get('sort') || 'default';
  const availableOnly = searchParams.get('available') === 'true';
  const neighborhood = searchParams.get('neighborhood') || '';
  const minRating = searchParams.get('minRating') || '';
  const minGuests = searchParams.get('minGuests') || '';

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchInput, setSearchInput] = useState(searchQuery);

  // ── UI-only state (not in URL) ─────────────────────────────────────
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // 'list' | 'map'
  const [selectedAmenities, setSelectedAmenities] = useState(new Set());

  // Keep searchInput in sync when URL param changes (back/forward navigation, direct link)
  useEffect(() => {
    setSearchInput(searchQuery);
  }, [searchQuery]);

  // Update a single URL param without losing others
  const updateParam = useCallback(
    (key, value) => {
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        if (value && value !== 'all' && value !== 'default' && value !== '') {
          next.set(key, value);
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [setSearchParams]
  );

  // Clear all filters
  const clearAllFilters = useCallback(() => {
    setSearchParams(new URLSearchParams());
    setSelectedAmenities(new Set());
  }, [setSearchParams]);

  // Handle search form submit from TripSearchBar
  const handleSearchSubmit = useCallback(
    (e) => {
      e.preventDefault();
      updateParam('search', searchInput.trim());
    },
    [searchInput, updateParam]
  );

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    setSearchInput(e.target.value);
  }, []);

  // Handle search clear
  const handleSearchClear = useCallback(() => {
    setSearchInput('');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('search');
      return next;
    });
  }, [setSearchParams]);

  // ── Expand properties into bed-variant listings ────────────────────
  const listings = useMemo(() => {
    const result = [];
    for (const p of properties.filter((p) => p.available !== false)) {
      const has1Bed = p.price1Bed != null;
      const has2Bed = p.price2Bed != null;
      const base = {
        id: p.id,
        image: p.images?.[0] || null,
        title: p.title,
        location: p.location,
        rating: p.rating,
        reviewCount: p.reviewCount ?? p.reviews?.length ?? 0,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        area: p.area,
        badge: p.featured ? 'Featured' : undefined,
        amenities: p.amenities || [],
        lat: p.lat,
        lng: p.lng,
        type: p.type,
      };
      if (has1Bed) {
        result.push({ ...base, price: p.price1Bed, variant: '1bed', variantLabel: '1 Bed', bedrooms: 1, bathrooms: p.bathrooms1Bed ?? 1 });
      }
      if (has2Bed) {
        result.push({ ...base, price: p.price2Bed, variant: '2bed', variantLabel: '2 Bed', bedrooms: 2, bathrooms: p.bathrooms2Bed ?? 2 });
      }
      if (!has1Bed && !has2Bed) {
        result.push({ ...base, price: p.price });
      }
    }
    // Filter by bed variant
    let filtered = result;
    if (bedFilter === '1bed') filtered = filtered.filter((l) => l.variant === '1bed' || !l.variant);
    if (bedFilter === '2bed') filtered = filtered.filter((l) => l.variant === '2bed' || !l.variant);
    // Amenities filter (client-side)
    if (selectedAmenities.size > 0) {
      filtered = filtered.filter((l) => {
        const lower = (l.amenities || []).map((a) => a.toLowerCase());
        return [...selectedAmenities].every((a) => lower.includes(a.toLowerCase()));
      });
    }
    return filtered;
  }, [properties, bedFilter, selectedAmenities]);

  // ── Sort listings client-side ──────────────────────────────────────
  const sortedListings = useMemo(() => {
    const sorted = [...listings];
    switch (sort) {
      case 'price_asc':
        sorted.sort((a, b) => (a.price ?? 0) - (b.price ?? 0));
        break;
      case 'price_desc':
        sorted.sort((a, b) => (b.price ?? 0) - (a.price ?? 0));
        break;
      case 'rating':
        sorted.sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
        break;
      case 'newest':
        // Properties are already returned newest-first by the API;
        // for variant-expanded entries, preserve relative order.
        break;
      default:
        break;
    }
    return sorted;
  }, [listings, sort]);

  // ── Fetch properties from API ──────────────────────────────────────
  const fetchProperties = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (searchQuery) params.search = searchQuery;
      if (filter !== 'all') params.type = filter;
      if (priceRange === 'low') { params.minPrice = 0; params.maxPrice = 4999; }
      else if (priceRange === 'mid') { params.minPrice = 5000; params.maxPrice = 7999; }
      else if (priceRange === 'high') { params.minPrice = 8000; }
      if (availableOnly) params.available = true;
      if (neighborhood) params.neighborhood = neighborhood;
      if (minRating) params.minRating = Number(minRating);
      // Map guest count to minimum bedrooms
      if (minGuests) {
        const g = Number(minGuests);
        params.minBedrooms = g <= 2 ? 1 : g <= 4 ? 2 : 3;
      }
      // Request a higher limit so client-side sort has enough data
      params.limit = 50;

      const res = await apiClient.get('/properties', { params });
      setProperties(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
      setError('We couldn\'t load properties right now. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, filter, priceRange, availableOnly, neighborhood, minRating, minGuests]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const hasActiveFilters =
    filter !== 'all' || priceRange !== 'all' || availableOnly || bedFilter !== 'all' || searchQuery !== '' ||
    neighborhood || minRating || minGuests || selectedAmenities.size > 0;

  const filterButtons = [
    { key: 'all', label: 'All' },
    { key: 'apartment', label: 'Apartments' },
    { key: 'studio', label: 'Studios' },
    { key: 'penthouse', label: 'Penthouses' },
  ];

  const bedFilterButtons = [
    { key: 'all', label: 'All Beds' },
    { key: '1bed', label: '1 Bed' },
    { key: '2bed', label: '2 Bed' },
  ];

  // Show Coming Soon placeholders only on default unfiltered view
  const showComingSoon = !hasActiveFilters && sort === 'default' && !loading && !error;

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* Compact Search Header */}
      <section className="bg-[#0B0B45] pt-24 pb-8 md:pb-10">
        <div className="w-full mx-auto px-5 md:px-8 lg:px-12 xl:px-16 max-w-screen-2xl">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-1">Find your stay</h1>
          <p className="text-white/70 text-sm mb-5 md:mb-6">
            Premium furnished apartments in Nairobi&apos;s most desirable neighbourhoods.
          </p>
          <div className="max-w-3xl">
            <TripSearchBar
              value={searchInput}
              onChange={handleSearchChange}
              onSubmit={handleSearchSubmit}
              onClear={handleSearchClear}
              loading={loading}
              hasActiveSearch={searchQuery !== ''}
            />
          </div>
        </div>
      </section>

      {/* Sticky Filters Bar */}
      <section className="sticky top-0 z-10 bg-white border-b border-[#D9D9D9] shadow-sm">
        <div className="w-full mx-auto px-5 md:px-8 lg:px-12 xl:px-16 max-w-screen-2xl py-3">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            {/* Left: property type pills + bed variant pills + available toggle */}
            <div className="flex flex-wrap gap-1.5 items-center">
              {filterButtons.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateParam('type', key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C] ${
                    filter === key
                      ? 'bg-[#C49A6C] text-white'
                      : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                  }`}
                >
                  {label}
                </button>
              ))}
              <span className="w-px h-5 bg-[#D9D9D9] mx-1 hidden md:block" aria-hidden="true" />
              {bedFilterButtons.map(({ key, label }) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => updateParam('beds', key)}
                  className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C] ${
                    bedFilter === key
                      ? 'bg-[#C49A6C] text-white'
                      : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                type="button"
                onClick={() => updateParam('available', availableOnly ? '' : 'true')}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C] ${
                  availableOnly
                    ? 'bg-[#C49A6C] text-white'
                    : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                }`}
              >
                Available to Book
              </button>

              {/* More Filters toggle */}
              <button
                type="button"
                onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C] ${
                  moreFiltersOpen
                    ? 'bg-[#C49A6C] text-white'
                    : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                }`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters {hasActiveFilters && `(${[filter !== 'all', priceRange !== 'all', availableOnly, bedFilter !== 'all', !!neighborhood, !!minRating, !!minGuests, selectedAmenities.size > 0].filter(Boolean).length})`}
                </span>
              </button>
            </div>

            {/* Right: price + sort dropdowns */}
            <div className="flex items-center gap-2">
              <Dropdown
                value={priceRange}
                onChange={(v) => updateParam('price', v)}
                options={[
                  { value: 'all', label: 'All Prices' },
                  { value: 'low', label: 'Under KES 5,000' },
                  { value: 'mid', label: 'KES 5,000 – 8,000' },
                  { value: 'high', label: 'Above KES 8,000' },
                ]}
                triggerClassName="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C]"
                placeholder="All Prices"
                menuClassName="left-auto right-0"
                ariaLabel="Price range"
              />
              <Dropdown
                value={sort}
                onChange={(v) => updateParam('sort', v)}
                options={SORT_OPTIONS}
                triggerClassName="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C]"
                placeholder="Sort"
                menuClassName="left-auto right-0"
                ariaLabel="Sort order"
              />
            </div>
          </div>

          {/* More Filters (collapsible) */}
          {moreFiltersOpen && (
            <div className="mt-3 pt-3 border-t border-[#D9D9D9] flex flex-wrap items-center gap-3">
              {/* Area */}
              <Dropdown
                value={neighborhood}
                onChange={(v) => updateParam('neighborhood', v)}
                options={NEIGHBORHOODS}
                triggerClassName="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C]"
                placeholder="All Areas"
                ariaLabel="Neighborhood"
              />

              {/* Guests */}
              <Dropdown
                value={minGuests}
                onChange={(v) => updateParam('minGuests', v)}
                options={GUEST_OPTIONS}
                triggerClassName="px-3.5 py-1.5 rounded-full text-xs font-medium bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0] focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C]"
                placeholder="Any Guests"
                ariaLabel="Guest count"
              />

              {/* Rating */}
              <div className="flex items-center gap-1.5">
                {RATING_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => updateParam('minRating', minRating === value ? '' : value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C] ${
                      minRating === value
                        ? 'bg-[#C49A6C] text-white'
                        : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                    }`}
                  >
                    ⭐ {label}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  type="button"
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C] ${viewMode === 'list' ? 'bg-[#C49A6C] text-white' : 'bg-[#f0f0f0] text-[#6b7280]'}`}
                  aria-label="List view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => setViewMode('map')}
                  className={`p-2 rounded-lg transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C] ${viewMode === 'map' ? 'bg-[#C49A6C] text-white' : 'bg-[#f0f0f0] text-[#6b7280]'}`}
                  aria-label="Map view"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                  </svg>
                </button>
              </div>

              {/* Amenities (second line) */}
              <div className="w-full flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-[#6b7280] mr-1">Amenities:</span>
                {COMMON_AMENITIES.map((a) => (
                  <button
                    type="button"
                    key={a}
                    onClick={() => {
                      setSelectedAmenities((prev) => {
                        const next = new Set(prev);
                        if (next.has(a)) next.delete(a); else next.add(a);
                        return next;
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#C49A6C] ${
                      selectedAmenities.has(a)
                        ? 'bg-[#C49A6C] text-white'
                        : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                    }`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Results */}
      <section className="py-8 md:py-10 bg-white" aria-live="polite">
        <div className="w-full mx-auto px-5 md:px-8 lg:px-12 xl:px-16 max-w-screen-2xl">
          {/* Results summary bar */}
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-[#6b7280]">
              {loading ? (
                'Searching...'
              ) : (
                <>
                  <span className="font-semibold text-[#0B0B45]">{sortedListings.length}</span>{' '}
                  {sortedListings.length === 1 ? 'place' : 'places'}
                  {searchQuery && (
                    <>
                      {' '}in <span className="font-medium text-[#0B0B45]">&ldquo;{searchQuery}&rdquo;</span>
                    </>
                  )}
                </>
              )}
            </p>
            {hasActiveFilters && (
              <button
                type="button"
                onClick={clearAllFilters}
                className="text-sm text-[#C49A6C] hover:text-[#0B0B45] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C] rounded"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* API error state */}
          {error && !loading && (
            <div className="text-center py-16" role="alert">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#0B0B45] mb-2">Something went wrong</h3>
              <p className="text-[#6b7280] mb-4 max-w-md mx-auto">{error}</p>
              <button
                type="button"
                onClick={fetchProperties}
                className="bg-[#C49A6C] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
              >
                Try Again
              </button>
            </div>
          )}

          {/* Loading state */}
          {loading && (
            <div className="text-center py-16" role="status" aria-label="Loading properties">
              <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p className="text-[#6b7280] text-sm">Loading properties...</p>
            </div>
          )}

          {/* Empty state */}
          {!loading && !error && sortedListings.length === 0 && (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-[#0B0B45]/5 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#0B0B45]/40" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-lg font-bold text-[#0B0B45] mb-2">No places found</h3>
              <p className="text-[#6b7280] mb-4 max-w-sm mx-auto text-sm">
                {searchQuery
                  ? `We couldn't find any listings matching "${searchQuery}". Try a different neighbourhood or adjust your filters.`
                  : 'No properties match your current filters. Try adjusting or clearing them.'}
              </p>
              <button
                type="button"
                onClick={clearAllFilters}
                className="bg-[#C49A6C] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Map view */}
          {!loading && !error && viewMode === 'map' && sortedListings.length > 0 && (
            <div className="rounded-2xl overflow-hidden border border-[#D9D9D9] shadow-sm mb-8">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(sortedListings.filter((l) => l.lat).map((l) => `${l.lat},${l.lng}(${l.title})`).join('|') || 'Nairobi')}&z=13&output=embed`}
                width="100%"
                height="600"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Property locations map"
              />
            </div>
          )}

          {/* Results grid */}
          {!loading && !error && viewMode !== 'map' && sortedListings.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {sortedListings.map((listing) => (
                <PropertyCard
                  key={`${listing.id}-${listing.variant || 'base'}`}
                  property={listing}
                />
              ))}

              {/* Coming Soon placeholders */}
              {showComingSoon &&
                [18, 16, 15, 14].map((imgIndex, i) => (
                  <div
                    key={`coming-soon-${i}`}
                    className="group overflow-hidden rounded-2xl border border-[#D9D9D9]/60 bg-white h-full flex flex-col"
                  >
                    <div className="relative aspect-[4/3] flex-shrink-0">
                      <img
                        src={zuriImages[imgIndex]}
                        alt="Coming soon property"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute inset-0 bg-[#0B0B45]/40"></div>
                      <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#0B0B45] text-[10px] font-bold px-3 py-1 rounded-full">
                        Coming Soon
                      </div>
                    </div>
                    <div className="p-4 flex flex-col flex-1">
                      <h3 className="text-sm font-semibold text-[#0B0B45] mb-1">Coming Soon</h3>
                      <p className="text-xs text-[#6b7280] mb-3">TBA</p>
                      <div className="flex items-center justify-between mb-3 py-2 border-y border-[#D9D9D9]/60">
                        <div className="flex-1 text-center">
                          <span className="text-xs text-[#6b7280]">-</span>
                          <p className="text-[10px] text-[#6b7280]">Beds</p>
                        </div>
                        <div className="flex-1 text-center">
                          <span className="text-xs text-[#6b7280]">-</span>
                          <p className="text-[10px] text-[#6b7280]">Baths</p>
                        </div>
                        <div className="flex-1 text-center">
                          <span className="text-xs text-[#6b7280]">-</span>
                          <p className="text-[10px] text-[#6b7280]">Sqft</p>
                        </div>
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div>
                          <span className="text-[10px] text-[#6b7280]">per night</span>
                          <p className="text-base font-bold text-[#6b7280]">KES -</p>
                        </div>
                        <span className="bg-[#D9D9D9]/50 text-[#6b7280] font-semibold px-3 py-1.5 rounded-full text-xs">
                          Coming Soon
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          )}
        </div>
      </section>

      <div className="mt-24">
        <Footer />
      </div>
    </div>
  );
}

export default PropertiesPage;
