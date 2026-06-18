import { useState, useEffect, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PropertyCard from '../components/PropertyCard';
import Dropdown from '../components/Dropdown.jsx';
import { zuriImages } from '../assets/images';
import apiClient from '../api/client.js';

function PropertiesPage() {
  const [urlParams] = useSearchParams();
  const urlSearch = urlParams.get('search') || '';

  const [filter, setFilter] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState(urlSearch);
  const [availableOnly, setAvailableOnly] = useState(false);
  const [bedFilter, setBedFilter] = useState('all'); // 'all' | '1bed' | '2bed'
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

  // Expand properties into bed-variant listings (only available properties)
  // Treat null/undefined as true for legacy properties created before the
  // available column existed.
  const listings = useCallback(() => {
    const result = [];
    for (const p of properties.filter((p) => p.available !== false)) {
      const has1Bed = p.price1Bed != null;
      const has2Bed = p.price2Bed != null;
      const base = {
        id: p.id,
        image: p.images?.[0] || '/images/Ely Homes Photography (1 of 20).jpg',
        title: p.title,
        location: p.location,
        rating: p.rating,
        reviews: p.reviews,
        bedrooms: p.bedrooms,
        bathrooms: p.bathrooms,
        area: p.area,
        badge: p.featured ? 'Featured' : undefined,
      };
      if (has1Bed) {
        result.push({
          ...base,
          price: p.price1Bed,
          variant: '1bed',
          variantLabel: '1 Bed',
          bedrooms: 1,
          bathrooms: p.bathrooms1Bed ?? 1,
        });
      }
      if (has2Bed) {
        result.push({
          ...base,
          price: p.price2Bed,
          variant: '2bed',
          variantLabel: '2 Bed',
          bedrooms: 2,
          bathrooms: p.bathrooms2Bed ?? 2,
        });
      }
      if (!has1Bed && !has2Bed) {
        // Legacy property — show as single card with base price
        result.push({ ...base, price: p.price });
      }
    }
    // Filter by bed variant if selected (client-side, applied after generation)
    if (bedFilter === '1bed') return result.filter((l) => l.variant === '1bed' || !l.variant);
    if (bedFilter === '2bed') return result.filter((l) => l.variant === '2bed' || !l.variant);
    return result;
  }, [properties, bedFilter]);

  const fetchProperties = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (filter !== 'all') params.type = filter;
      if (priceRange === 'low') { params.minPrice = 0; params.maxPrice = 4999; }
      else if (priceRange === 'mid') { params.minPrice = 5000; params.maxPrice = 7999; }
      else if (priceRange === 'high') { params.minPrice = 8000; }
      if (searchQuery) params.search = searchQuery;
      if (availableOnly) params.available = true;

      const res = await apiClient.get('/properties', { params });
      setProperties(res.data.data || []);
      if (res.data.pagination) {
        setPagination(res.data.pagination);
      }
    } catch (err) {
      console.error('Failed to fetch properties:', err);
    } finally {
      setLoading(false);
    }
  }, [filter, priceRange, searchQuery, availableOnly]);

  useEffect(() => {
    fetchProperties();
  }, [fetchProperties]);

  // Debounced search — refetch on searchQuery change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchProperties();
    }, 400);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchQuery]);

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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="space-y-14 md:space-y-20">
      
      {/* Hero Section */}
      <section className="relative bg-[#0B0B45] pt-24 pb-20">
        <div className="absolute inset-0">
          <img
            src={zuriImages[13]}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#0B0B45]/80"></div>
        </div>
        <div className="relative w-full mx-auto px-4 md:px-8 pt-16 md:pt-20 space-y-14 md:space-y-20">
          <div className="text-center">
            <h1 className="text-4xl md:text-5xl font-bold text-white mb-4">Our Properties</h1>
            <p className="text-white/80 max-w-2xl mx-auto text-lg">
              Discover our carefully curated selection of premium furnished apartments
              in Nairobi's most desirable neighborhoods.
            </p>
          </div>

          {/* Search Bar */}
          <div className="max-w-2xl mx-auto pb-20">
            <div className="bg-white rounded-full shadow-xl px-2 py-2 flex items-center">
              <div className="flex-1 flex items-center px-5">
                <svg className="w-5 h-5 text-[#C49A6C] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
                <input
                  type="text"
                  placeholder="Search by location or property name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full py-3 text-[#1f2937] placeholder-[#6b7280] focus:outline-none bg-transparent text-base"
                />
              </div>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="p-2 text-[#6b7280] hover:text-[#0B0B45] transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Filters Section */}
      <section className="sticky top-0 z-10 bg-white border-b border-[#D9D9D9] shadow-sm">
        <div className="w-full mx-auto px-5 md:px-8 lg:px-12 xl:px-16 max-w-screen-2xl py-3 md:py-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            {/* Property Type Filters */}
            <div className="flex flex-wrap gap-2 items-center">
              {filterButtons.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setFilter(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    filter === key
                      ? 'bg-[#C49A6C]/15 text-[#C49A6C] font-semibold'
                      : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                  }`}
                >
                  {label}
                </button>
              ))}
              {/* Bed variant filter */}
              <span className="w-px h-6 bg-[#D9D9D9] mx-1 hidden md:block" />
              {bedFilterButtons.map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => setBedFilter(key)}
                  className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ${
                    bedFilter === key
                      ? 'bg-[#C49A6C]/15 text-[#C49A6C] font-semibold'
                      : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                  }`}
                >
                  {label}
                </button>
              ))}
              <button
                onClick={() => setAvailableOnly(!availableOnly)}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-all duration-200 ml-2 ${
                  availableOnly
                    ? 'bg-[#C49A6C]/15 text-[#C49A6C] font-semibold'
                    : 'bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0]'
                }`}
              >
                Available to Book
              </button>
            </div>

            {/* Price Range Filter */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-[#6b7280]">Price:</span>
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
            </div>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-10 md:py-12 bg-white">
        <div className="w-full mx-auto px-5 md:px-8 lg:px-12 xl:px-16 max-w-screen-2xl">
          {/* Results Count */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[#6b7280]">
              Showing <span className="font-semibold text-[#0B0B45]">{listings().length}</span> listings
            </p>
            {(filter !== 'all' || priceRange !== 'all' || searchQuery || availableOnly || bedFilter !== 'all') && (
              <button
                onClick={() => {
                  setFilter('all');
                  setPriceRange('all');
                  setSearchQuery('');
                  setAvailableOnly(false);
                  setBedFilter('all');
                }}
                className="text-sm text-[#C49A6C] hover:text-[#0B0B45] font-medium transition-colors"
              >
                Clear all filters
              </button>
            )}
          </div>

          {/* Grid */}
          {loading ? (
            <div className="text-center py-16">
              <div className="w-10 h-10 border-4 border-[#C49A6C] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-[#6b7280]">Loading properties...</p>
            </div>
          ) : properties.length > 0 || (filter === 'all' && priceRange === 'all' && !searchQuery && !availableOnly) ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
              {listings().map((listing) => (
                <Link key={`${listing.id}-${listing.variant || 'base'}`} to={`/property/${listing.id}${listing.variant ? `?variant=${listing.variant}` : ''}`} className="block h-full">
                  <PropertyCard property={listing} />
                </Link>
              ))}
              {/* Coming Soon cards — show on default 'All' view only */}
              {filter === 'all' && priceRange === 'all' && !searchQuery && !availableOnly && [18, 16, 15, 14].map((imgIndex) => (
                <div key={imgIndex} className="group neu-card overflow-hidden h-full flex flex-col">
                  <div className="relative aspect-[4/3] flex-shrink-0">
                    <img
                      src={zuriImages[imgIndex]}
                      alt="Coming Soon"
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-sm text-[#1f2937] text-[10px] font-bold px-3 py-1 rounded-full shadow-md">
                      Coming Soon
                    </div>
                  </div>
                  <div className="p-4 flex flex-col flex-1">
                    <div className="flex justify-between items-start mb-2">
                      <h3 className="text-sm font-semibold text-[#1f2937] leading-tight">Coming Soon</h3>
                      <div className="flex items-center space-x-1 flex-shrink-0 bg-[#C49A6C]/10 px-1.5 py-0.5 rounded-md">
                        <span className="text-xs font-bold text-[#1f2937]">—</span>
                      </div>
                    </div>
                    <div className="flex items-center text-[#6b7280] mb-2">
                      <svg className="w-3.5 h-3.5 mr-1.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span className="text-xs truncate">TBA</span>
                    </div>
                    <div className="flex items-center justify-between mb-2.5 py-2 border-y border-[#D9D9D9]">
                      <div className="flex-1 flex flex-col items-center">
                        <span className="text-[11px] text-[#6b7280]">—</span>
                        <span className="text-[11px] text-[#6b7280]">Beds</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="text-[11px] text-[#6b7280]">—</span>
                        <span className="text-[11px] text-[#6b7280]">Baths</span>
                      </div>
                      <div className="flex-1 flex flex-col items-center">
                        <span className="text-[11px] text-[#6b7280]">—</span>
                        <span className="text-[11px] text-[#6b7280]">Sqft</span>
                      </div>
                    </div>
                    <div className="flex items-center justify-between mt-auto">
                      <div>
                        <span className="text-[11px] text-[#6b7280]">per night</span>
                        <div className="text-lg font-bold text-[#C49A6C]">KES —</div>
                      </div>
                      <button className="bg-[#D9D9D9] text-[#6b7280] font-semibold px-3 py-1.5 rounded-full text-xs cursor-not-allowed" disabled>
                        Coming Soon
                      </button>
                    </div>
                  </div>
                </div>
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
              <button
                onClick={() => {
                  setFilter('all');
                  setPriceRange('all');
                  setSearchQuery('');
                  setAvailableOnly(false);
                  setBedFilter('all');
                }}
                className="bg-[#C49A6C] text-white px-6 py-2 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200"
              >
                Clear Filters
              </button>
            </div>
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
