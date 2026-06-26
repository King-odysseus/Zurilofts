import { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PropertyCard from '../components/PropertyCard';
import Dropdown from '../components/Dropdown.jsx';
import { SearchBar } from '../components/Hero.jsx';
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

function PropertiesPage() {
  const [filter, setFilter] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [bedFilter, setBedFilter] = useState('all');
  // New filters
  const [neighborhood, setNeighborhood] = useState('');
  const [minGuests, setMinGuests] = useState('');
  const [minRating, setMinRating] = useState('');
  const [selectedAmenities, setSelectedAmenities] = useState(new Set());
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);
  const [viewMode, setViewMode] = useState('list');

  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Expand properties into bed-variant listings
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
        reviews: p.reviews,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        area: p.area,
        badge: p.featured ? 'Featured' : undefined,
        amenities: p.amenities || [],
        lat: p.lat,
        lng: p.lng,
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
    // Client-side filters
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

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
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

      const res = await apiClient.get('/properties', { params });
      setProperties(res.data.data || []);
      if (res.data.pagination) setPagination(res.data.pagination);
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, priceRange, availableOnly, neighborhood, minRating, minGuests]);

  useEffect(() => { fetchProperties(); }, [fetchProperties]);

  const filterButtons = [
    { key: 'all', label: 'All Properties' },
    { key: 'apartment', label: 'Apartments' },
    { key: 'studio', label: 'Studios' },
  ];

  const bedFilterButtons = [
    { key: 'all', label: 'All Beds' },
    { key: '1bed', label: '1 Bed' },
    { key: '2bed', label: '2 Bed' },
  ];

  const hasActiveFilters = filter !== 'all' || priceRange !== 'all' || availableOnly || bedFilter !== 'all' || neighborhood || minRating || minGuests || selectedAmenities.size > 0;

  const clearAll = () => {
    setFilter('all');
    setPriceRange('all');
    setAvailableOnly(false);
    setBedFilter('all');
    setNeighborhood('');
    setMinRating('');
    setMinGuests('');
    setSelectedAmenities(new Set());
  };

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="space-y-14 md:space-y-20">

      {/* Hero Section */}
      <section className="relative bg-[#0B0B45] pt-24 pb-20">
        <div className="absolute inset-0">
          <img src={zuriImages[13]} alt="" className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-[#0B0B45]/80"></div>
        </div>
        <div className="relative w-full mx-auto px-4 md:px-8 pt-16 md:pt-20 space-y-14 md:space-y-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Properties</h1>
            <p className="text-white/80 max-w-2xl mx-auto text-lg">
              Discover our carefully curated selection of premium furnished apartments
              in Nairobi&apos;s most desirable neighborhoods.
            </p>
          </div>
          <div className="max-w-2xl mx-auto pb-20">
            <SearchBar />
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="sticky top-0 z-10 bg-white border-b border-[#D9D9D9] shadow-sm">
        <div className="w-full mx-auto px-5 md:px-8 lg:px-12 xl:px-16 max-w-screen-2xl py-3 md:py-4">
          {/* Row 1: existing pills */}
          <div className="flex flex-wrap items-center gap-2">
            {filterButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setFilter(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  filter === key ? 'bg-[#C49A6C]/15 text-[#C49A6C] font-semibold' : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                }`}
              >
                {label}
              </button>
            ))}
            <span className="w-px h-6 bg-[#D9D9D9] mx-1 hidden md:block" />
            {bedFilterButtons.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setBedFilter(key)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                  bedFilter === key ? 'bg-[#C49A6C]/15 text-[#C49A6C] font-semibold' : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                }`}
              >
                {label}
              </button>
            ))}
            <button
              onClick={() => setAvailableOnly(!availableOnly)}
              className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${availableOnly ? 'bg-[#C49A6C]/15 text-[#C49A6C] font-semibold' : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'}`}
            >
              Available to Book
            </button>

            <div className="flex items-center gap-2 ml-auto">
              <span className="text-sm text-[#6b7280] hidden md:inline">Price:</span>
              <Dropdown
                value={priceRange}
                onChange={setPriceRange}
                options={[
                  { value: 'all', label: 'All Prices' },
                  { value: 'low', label: 'Under KES 5,000' },
                  { value: 'mid', label: 'KES 5,000 – 8,000' },
                  { value: 'high', label: 'Above KES 8,000' },
                ]}
                triggerClassName="px-4 py-2 rounded-full text-sm font-medium bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0] focus:outline-none"
                placeholder="All Prices"
                menuClassName="left-auto right-0"
                ariaLabel="Price range"
              />
              <button
                onClick={() => setMoreFiltersOpen(!moreFiltersOpen)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${moreFiltersOpen ? 'bg-[#C49A6C]/15 text-[#C49A6C] font-semibold' : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'}`}
              >
                <span className="flex items-center gap-1.5">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                  </svg>
                  Filters {hasActiveFilters && `(${[filter !== 'all', priceRange !== 'all', availableOnly, bedFilter !== 'all', !!neighborhood, !!minRating, !!minGuests, selectedAmenities.size > 0].filter(Boolean).length})`}
                </span>
              </button>
            </div>
          </div>

          {/* Row 2: More Filters (collapsible) */}
          {moreFiltersOpen && (
            <div className="mt-3 pt-3 border-t border-[#D9D9D9] flex flex-wrap items-center gap-3">
              {/* Area */}
              <Dropdown
                value={neighborhood}
                onChange={setNeighborhood}
                options={NEIGHBORHOODS}
                triggerClassName="px-4 py-2 rounded-full text-sm font-medium bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0] focus:outline-none"
                placeholder="All Areas"
                ariaLabel="Neighborhood"
              />

              {/* Guests */}
              <Dropdown
                value={minGuests}
                onChange={setMinGuests}
                options={GUEST_OPTIONS}
                triggerClassName="px-4 py-2 rounded-full text-sm font-medium bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0] focus:outline-none"
                placeholder="Any Guests"
                ariaLabel="Guest count"
              />

              {/* Rating */}
              <div className="flex items-center gap-1.5">
                {RATING_OPTIONS.map(({ value, label }) => (
                  <button
                    key={value}
                    onClick={() => setMinRating(minRating === value ? '' : value)}
                    className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 ${minRating === value ? 'bg-[#C49A6C]/15 text-[#C49A6C] font-semibold' : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'}`}
                  >
                    ⭐ {label}
                  </button>
                ))}
              </div>

              {/* View toggle */}
              <div className="flex items-center gap-1 ml-auto">
                <button
                  onClick={() => setViewMode('list')}
                  className={`p-2 rounded-lg transition-colors ${viewMode === 'list' ? 'bg-[#C49A6C] text-white' : 'bg-[#f0f0f0] text-[#6b7280]'}`}
                  aria-label="List view"
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

              {/* Amenities (second line) */}
              <div className="w-full flex flex-wrap items-center gap-2 mt-1">
                <span className="text-xs text-[#6b7280] mr-1">Amenities:</span>
                {COMMON_AMENITIES.map((a) => (
                  <button
                    key={a}
                    onClick={() => {
                      setSelectedAmenities((prev) => {
                        const next = new Set(prev);
                        if (next.has(a)) next.delete(a); else next.add(a);
                        return next;
                      });
                    }}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-200 ${selectedAmenities.has(a) ? 'bg-[#C49A6C] text-white' : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'}`}
                  >
                    {a}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-10 md:py-12 bg-white">
        <div className="w-full mx-auto px-5 md:px-8 lg:px-12 xl:px-16 max-w-screen-2xl">
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[#6b7280]">
              Showing <span className="font-semibold text-[#0B0B45]">{listings.length}</span> listing{listings.length !== 1 ? 's' : ''}
            </p>
            {hasActiveFilters && (
              <button onClick={clearAll} className="text-sm text-[#C49A6C] hover:text-[#0B0B45] font-medium transition-colors">
                Clear all filters
              </button>
            )}
          </div>

          {viewMode === 'map' ? (
            <div className="rounded-2xl overflow-hidden border border-[#D9D9D9] shadow-sm">
              <iframe
                src={`https://maps.google.com/maps?q=${encodeURIComponent(listings.filter((l) => l.lat).map((l) => `${l.lat},${l.lng}(${l.title})`).join('|') || 'Nairobi')}&z=13&output=embed`}
                width="100%"
                height="600"
                style={{ border: 0 }}
                allowFullScreen=""
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                title="Property locations map"
              />
            </div>
          ) : (
            <>
              {loading ? (
                <div className="text-center py-16">
                  <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
                  <p className="text-[#6b7280]">Loading properties...</p>
                </div>
              ) : listings.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
                  {listings.map((listing) => (
                    <Link key={`${listing.id}-${listing.variant || 'base'}`} to={`/property/${listing.id}${listing.variant ? `?variant=${listing.variant}` : ''}`} className="block h-full">
                      <PropertyCard property={listing} />
                    </Link>
                  ))}
                </div>
              ) : (
                <div className="text-center py-16">
                  <div className="w-20 h-20 bg-[#0B0B45]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-10 h-10 text-[#0B0B45]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                  </div>
                  <h3 className="text-xl font-bold text-[#0B0B45] mb-2">No properties found</h3>
                  <p className="text-[#6b7280] mb-4">Try adjusting your filters or search query</p>
                  <button onClick={clearAll} className="bg-[#C49A6C] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200">
                    Clear Filters
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>

      </div>

      <div className="mt-24">
        <Footer />
      </div>
    </div>
  );
}

export default PropertiesPage;
