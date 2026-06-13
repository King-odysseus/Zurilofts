import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import PropertyCard from '../components/PropertyCard';
import { zuriImages } from '../assets/images';
import apiClient from '../api/client.js';

function PropertiesPage() {
  const [filter, setFilter] = useState('all');
  const [priceRange, setPriceRange] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [availableOnly, setAvailableOnly] = useState(false);
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ total: 0, page: 1, totalPages: 1 });

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

  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <div className="space-y-14 md:space-y-20">
      
      {/* Hero Section */}
      <section className="relative bg-[#262262] pt-24 pb-20">
        <div className="absolute inset-0">
          <img
            src={zuriImages[13]}
            alt=""
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-[#262262]/80"></div>
        </div>
        <div className="relative max-w-7xl mx-auto px-4 md:px-6 pt-16 md:pt-20 space-y-14 md:space-y-20">
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
                  className="p-2 text-[#6b7280] hover:text-[#262262] transition-colors"
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
        <div className="max-w-7xl mx-auto px-4 md:px-6 py-3 md:py-4">
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
              <select
                value={priceRange}
                onChange={(e) => setPriceRange(e.target.value)}
                className="px-4 py-2 rounded-full text-sm font-medium bg-[#f0f0f0] text-[#1f2937] hover:bg-[#e0e0e0] focus:outline-none cursor-pointer"
              >
                <option value="all">All Prices</option>
                <option value="low">Under KES 5,000</option>
                <option value="mid">KES 5,000 - 8,000</option>
                <option value="high">Above KES 8,000</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* Properties Grid */}
      <section className="py-10 md:py-12 bg-white">
        <div className="max-w-7xl mx-auto px-4 md:px-6">
          {/* Results Count */}
          <div className="mb-6 flex items-center justify-between">
            <p className="text-[#6b7280]">
              Showing <span className="font-semibold text-[#262262]">{pagination.total}</span> properties
            </p>
            {(filter !== 'all' || priceRange !== 'all' || searchQuery || availableOnly) && (
              <button
                onClick={() => {
                  setFilter('all');
                  setPriceRange('all');
                  setSearchQuery('');
                  setAvailableOnly(false);
                }}
                className="text-sm text-[#C49A6C] hover:text-[#262262] font-medium transition-colors"
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
          ) : properties.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {properties.map((property) => (
                <Link key={property.id} to={`/property/${property.id}`} className="block">
                  <PropertyCard property={{
                    id: property.id,
                    image: property.images?.[0] || '/images/Ely Homes Photography (1 of 20).jpg',
                    title: property.title,
                    location: property.location,
                    price: property.price,
                    rating: property.rating,
                    reviews: property.reviews,
                    bedrooms: property.bedrooms,
                    bathrooms: property.bathrooms,
                    area: property.area,
                    badge: property.featured ? 'Featured' : undefined,
                  }} />
                </Link>
              ))}
              {/* Coming Soon Cards */}
              <div className="group neu-card overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img
                    src={zuriImages[18]}
                    alt="Coming Soon"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#1f2937]/70 flex flex-col items-center justify-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
                    <p className="text-white/80 text-sm">Exciting new property being added</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-[#1f2937] leading-tight">Coming Soon</h3>
                    <div className="flex items-center space-x-1 flex-shrink-0 bg-[#C49A6C]/10 px-2 py-1 rounded-lg">
                      <span className="text-sm font-bold text-[#1f2937]">—</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[#6b7280] mb-3">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm truncate">TBA</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 py-3 border-y border-[#D9D9D9]">
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Beds</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Baths</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Sqft</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#6b7280]">per night</span>
                      <div className="text-xl font-bold text-[#C49A6C]">KES —</div>
                    </div>
                    <button className="bg-[#D9D9D9] text-[#6b7280] font-semibold px-4 py-2 rounded-full text-sm cursor-not-allowed" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
              <div className="group neu-card overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img
                    src={zuriImages[11]}
                    alt="Coming Soon"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#1f2937]/70 flex flex-col items-center justify-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
                    <p className="text-white/80 text-sm">Exciting new property being added</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-[#1f2937] leading-tight">Coming Soon</h3>
                    <div className="flex items-center space-x-1 flex-shrink-0 bg-[#C49A6C]/10 px-2 py-1 rounded-lg">
                      <span className="text-sm font-bold text-[#1f2937]">—</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[#6b7280] mb-3">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm truncate">TBA</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 py-3 border-y border-[#D9D9D9]">
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Beds</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Baths</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Sqft</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#6b7280]">per night</span>
                      <div className="text-xl font-bold text-[#C49A6C]">KES —</div>
                    </div>
                    <button className="bg-[#D9D9D9] text-[#6b7280] font-semibold px-4 py-2 rounded-full text-sm cursor-not-allowed" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
              <div className="group neu-card overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img
                    src={zuriImages[12]}
                    alt="Coming Soon"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#1f2937]/70 flex flex-col items-center justify-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
                    <p className="text-white/80 text-sm">Exciting new property being added</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-[#1f2937] leading-tight">Coming Soon</h3>
                    <div className="flex items-center space-x-1 flex-shrink-0 bg-[#C49A6C]/10 px-2 py-1 rounded-lg">
                      <span className="text-sm font-bold text-[#1f2937]">—</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[#6b7280] mb-3">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm truncate">TBA</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 py-3 border-y border-[#D9D9D9]">
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Beds</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Baths</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Sqft</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#6b7280]">per night</span>
                      <div className="text-xl font-bold text-[#C49A6C]">KES —</div>
                    </div>
                    <button className="bg-[#D9D9D9] text-[#6b7280] font-semibold px-4 py-2 rounded-full text-sm cursor-not-allowed" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
              <div className="group neu-card overflow-hidden">
                <div className="relative aspect-[4/3]">
                  <img
                    src={zuriImages[19]}
                    alt="Coming Soon"
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[#1f2937]/70 flex flex-col items-center justify-center">
                    <h3 className="text-2xl font-bold text-white mb-2">Coming Soon</h3>
                    <p className="text-white/80 text-sm">Exciting new property being added</p>
                  </div>
                </div>
                <div className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="text-base font-semibold text-[#1f2937] leading-tight">Coming Soon</h3>
                    <div className="flex items-center space-x-1 flex-shrink-0 bg-[#C49A6C]/10 px-2 py-1 rounded-lg">
                      <span className="text-sm font-bold text-[#1f2937]">—</span>
                    </div>
                  </div>
                  <div className="flex items-center text-[#6b7280] mb-3">
                    <svg className="w-4 h-4 mr-2 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <span className="text-sm truncate">TBA</span>
                  </div>
                  <div className="flex items-center justify-between mb-3 py-3 border-y border-[#D9D9D9]">
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Beds</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Baths</span>
                    </div>
                    <div className="flex-1 flex flex-col items-center">
                      <span className="text-xs text-[#6b7280]">—</span>
                      <span className="text-xs text-[#6b7280]">Sqft</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-xs text-[#6b7280]">per night</span>
                      <div className="text-xl font-bold text-[#C49A6C]">KES —</div>
                    </div>
                    <button className="bg-[#D9D9D9] text-[#6b7280] font-semibold px-4 py-2 rounded-full text-sm cursor-not-allowed" disabled>
                      Coming Soon
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-center py-16">
              <div className="w-20 h-20 bg-[#262262]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                <svg className="w-10 h-10 text-[#262262]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <h3 className="text-xl font-bold text-[#262262] mb-2">No properties found</h3>
              <p className="text-[#6b7280] mb-4">Try adjusting your filters or search query</p>
              <button
                onClick={() => {
                  setFilter('all');
                  setPriceRange('all');
                  setSearchQuery('');
                  setAvailableOnly(false);
                }}
                className="bg-[#C49A6C] text-[#262262] px-6 py-2 rounded-full font-semibold hover:bg-[#b8895c] transition-all duration-200"
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
