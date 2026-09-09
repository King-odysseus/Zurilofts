import Navbar from './Navbar';
import TripSearchBar from './TripSearchBar.jsx';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { heroImage } from '../assets/images';
import apiClient from '../api/client.js';
import { useAuth } from '../context/AuthContext.jsx';

function AnimatedNumber({ value, suffix = '', duration = 2000 }) {
  const [displayValue, setDisplayValue] = useState(0);
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
        }
      },
      { threshold: 0.5 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!isVisible) return;

    const numericValue = parseFloat(value);
    const isDecimal = value.includes('.');
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutQuart = 1 - Math.pow(1 - progress, 4);
      const currentValue = numericValue * easeOutQuart;

      if (isDecimal) {
        setDisplayValue(currentValue.toFixed(1));
      } else {
        setDisplayValue(Math.floor(currentValue));
      }

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setDisplayValue(value);
      }
    };

    requestAnimationFrame(animate);
  }, [isVisible, value, duration]);

  return (
    <span ref={ref} className="inline-block">
      {displayValue}{suffix}
    </span>
  );
}

AnimatedNumber.propTypes = {
  value: PropTypes.string.isRequired,
  suffix: PropTypes.string,
  duration: PropTypes.number,
};

AnimatedNumber.defaultProps = {
  suffix: '',
  duration: 2000,
};

/**
 * Hero search: same debounced live-results/navigation behaviour as before,
 * presented with the shared TripSearchBar (already updated to the blue
 * design system) instead of a bespoke pill input.
 */
function SearchBar({ discovery = false }) {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [dates, setDates] = useState({ checkIn: '', checkOut: '' });
  const [guests, setGuests] = useState(1);
  const containerRef = useRef(null);
  const debounceRef = useRef(null);
  const searchRef = useRef(null); // in-flight search request, so it can be aborted

  // Fetch results as the user types (debounced 250ms). The cleanup aborts any
  // still-running request, so a slow earlier response can never land after a
  // newer keystroke's results and overwrite them (stale-response race).
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      setOpen(false);
      setLoading(false);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      searchRef.current = controller;
      setLoading(true);
      try {
        const res = await apiClient.get('/properties', {
          params: { search: q, limit: 8 },
          signal: controller.signal,
        });
        if (controller.signal.aborted) return;
        setResults(res.data.data || []);
        setOpen(true);
      } catch (err) {
        if (controller.signal.aborted) return; // superseded by a newer query - ignore
        console.error('Search error', err);
        setResults([]);
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }, 250);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      searchRef.current?.abort();
    };
  }, [query]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleSelect(propertyId) {
    setOpen(false);
    setQuery('');
    navigate(`/property/${propertyId}`);
  }

  const handleSearch = useCallback(() => {
    const params = new URLSearchParams();
    if (query.trim().length >= 2) params.set('search', query.trim());
    if (dates.checkIn && dates.checkOut) {
      params.set('checkIn', dates.checkIn);
      params.set('checkOut', dates.checkOut);
    }
    if (guests > 1) params.set('guests', String(guests));
    navigate(`/properties${params.toString() ? `?${params.toString()}` : ''}`);
    setOpen(false);
    setQuery('');
  }, [query, dates, guests, navigate]);

  function handleSubmit(e) {
    e.preventDefault();
    handleSearch();
  }

  function handleClear() {
    setQuery('');
    setResults([]);
    setOpen(false);
  }

  function handleKeyDownCapture(e) {
    if (e.key === 'Escape') {
      setOpen(false);
      e.target.blur();
    }
  }

  function handleFocusCapture(e) {
    if (e.target.id === 'trip-search-destination' && results.length > 0) {
      setOpen(true);
    }
  }

  return (
    <div
      className="w-full min-w-0 max-w-[680px] mx-auto relative"
      ref={containerRef}
      onKeyDownCapture={handleKeyDownCapture}
      onFocusCapture={handleFocusCapture}
    >
      <TripSearchBar
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onSubmit={handleSubmit}
        onClear={handleClear}
        loading={loading}
        hasActiveSearch={query.length > 0}
        discovery={discovery}
        dates={dates}
        onDatesChange={setDates}
        guests={guests}
        onGuestsChange={setGuests}
      />

      {/* Dropdown results */}
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-2 bg-white rounded-2xl border border-[#E5E7EB] shadow-xl overflow-hidden z-50">
          <ul>
            {results.map((p) => (
              <li key={p.id}>
                <button
                  type="button"
                  onClick={() => handleSelect(p.id)}
                  className="w-full flex items-center gap-4 px-5 py-3 text-left hover:bg-[#F7F7F5] transition-colors border-b border-[#E5E7EB] last:border-b-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#2563EB]"
                >
                  {p.images?.[0] ? (
                    <img
                      src={p.images[0]}
                      alt=""
                      className="w-12 h-12 object-cover rounded-xl flex-shrink-0"
                    />
                  ) : (
                    <div className="w-12 h-12 rounded-xl flex-shrink-0 bg-[#F7F7F5] flex items-center justify-center">
                      <svg className="w-5 h-5 text-[#E5E7EB]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-[#222222] truncate">{p.title}</p>
                    <p className="text-xs text-[#6b7280] truncate">{p.location}</p>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <p className="text-sm font-bold text-[#2563EB]">KES {p.price.toLocaleString()}</p>
                    <p className="text-xs text-[#6b7280]">/ night</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
          {results.length > 0 && (
            <button
              type="button"
              onClick={handleSearch}
              className="w-full py-3 text-sm font-semibold text-[#2563EB] hover:bg-[#F7F7F5] text-center border-t border-[#E5E7EB]"
            >
              View all results &rarr;
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function RoleToggle({ mode, onChange }) {
  return (
    <div className="inline-flex items-center bg-white/10 backdrop-blur-sm rounded-full p-1 gap-1">
      <button
        type="button"
        onClick={() => onChange('traveler')}
        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
          mode === 'traveler'
            ? 'bg-white text-[#2563EB] shadow-md'
            : 'text-white/70 hover:text-white'
        }`}
      >
        I&apos;m traveling
      </button>
      <button
        type="button"
        onClick={() => onChange('host')}
        className={`px-5 py-2 rounded-full text-sm font-semibold transition-all duration-300 ${
          mode === 'host'
            ? 'bg-white text-[#2563EB] shadow-md'
            : 'text-white/70 hover:text-white'
        }`}
      >
        I&apos;m a host
      </button>
    </div>
  );
}

RoleToggle.propTypes = {
  mode: PropTypes.oneOf(['traveler', 'host']).isRequired,
  onChange: PropTypes.func.isRequired,
};

/**
 * Tall photographic hero: full-bleed background image behind the Navbar,
 * the traveller/host entry toggle, the shared blue-accented search bar
 * with live results, and the animated trust/stat row.
 */
function Hero({ stats }) {
  const { rating = '5.0', stays = '50', satisfaction = '100' } = stats || {};
  const [mode, setMode] = useState('traveler');
  const { isAuthenticated } = useAuth();

  const isHost = mode === 'host';
  const showToggle = !isAuthenticated;

  return (
    <section className="relative min-h-[600px] md:min-h-[700px] flex flex-col overflow-hidden">
      {/* Background Image */}
      <div className="absolute inset-0 overflow-hidden">
        <img
          src={heroImage}
          alt="ZuriLofts"
          className="w-full h-full object-cover scale-110 hero-bg-img"
        />
      </div>

      {/* Gradient overlay - dark navy tint, kept only for photo legibility */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0B0B45]/70 via-[#0B0B45]/40 to-[#0B0B45]/70"></div>

      {/* Navbar */}
      <Navbar />

      <div className="relative flex-1 flex items-center">
        <div className="max-w-7xl mx-auto px-6 w-full py-28 md:py-32">
          {/* Role Toggle - Airbnb-style pill (hidden when authenticated) */}
          {showToggle && (
          <div className="flex justify-center mb-10">
            <RoleToggle mode={mode} onChange={setMode} />
          </div>
          )}

          {/* Headline and Description */}
          <div className="text-center mb-14">
            <div className="inline-flex items-center space-x-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <span className={`w-2 h-2 rounded-full animate-pulse ${isHost ? 'bg-[#2563EB]' : 'bg-green-500'}`}></span>
              <span className="text-white/90 text-sm font-medium">
                {isHost ? 'List Your Property' : 'Available for Booking'}
              </span>
            </div>

            <h1 className="text-3xl md:text-4xl lg:text-5xl font-extrabold text-white mb-10 leading-tight tracking-tight drop-shadow-lg hero-heading">
              {isHost ? (
                <>Earn More by Hosting on ZuriLofts</>
              ) : (
                <>Choose Luxury &amp; Comfort for Your Time Away</>
              )}
            </h1>
            <p className="text-lg md:text-xl text-white/80 max-w-2xl mx-auto leading-relaxed mb-4">
              {isHost
                ? 'List your furnished apartment and start earning today. We handle the bookings - you focus on hospitality.'
                : 'Premium furnished apartments in Nairobi. Experience comfort, convenience, and luxury all in one place.'
              }
            </p>
          </div>

          {/* Search - the shared, blue-accented TripSearchBar with live results */}
          <div className="mt-14">
            <SearchBar />
          </div>

          {/* Host CTA (unauthenticated only) */}
          {isHost && showToggle ? (
            <div className="mt-14 flex justify-center">
              <Link
                to="/register?role=HOST"
                className="inline-flex items-center gap-2 min-h-[44px] bg-[#C49A6C] text-white font-bold px-10 py-3 rounded-lg hover:bg-[#B8895C] transition-all duration-200 shadow-lg hover:shadow-xl text-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-[#0B0B45]"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                Get Started as a Host
              </Link>
            </div>
          ) : (
            <div className="mt-20 flex justify-center items-center space-x-8 md:space-x-16">
              <div className="text-center group cursor-default">
                <div className="text-4xl md:text-5xl font-bold text-white transform transition-all duration-500 group-hover:scale-110">
                  <AnimatedNumber value={String(rating)} />
                </div>
                <div className="text-white/70 text-sm mt-1 font-medium transform transition-all duration-300 group-hover:text-white">Star Rating</div>
              </div>
              <div className="w-px h-12 bg-white/20"></div>
              <div className="text-center group cursor-default">
                <div className="text-4xl md:text-5xl font-bold text-white transform transition-all duration-500 group-hover:scale-110">
                  <AnimatedNumber value={String(stays)} suffix="+" />
                </div>
                <div className="text-white/70 text-sm mt-1 font-medium transform transition-all duration-300 group-hover:text-white">Happy Stays</div>
              </div>
              <div className="w-px h-12 bg-white/20 hidden md:block"></div>
              <div className="text-center hidden md:block group cursor-default">
                <div className="text-4xl md:text-5xl font-bold text-white transform transition-all duration-500 group-hover:scale-110">
                  <AnimatedNumber value={String(satisfaction)} suffix="%" />
                </div>
                <div className="text-white/70 text-sm mt-1 font-medium transform transition-all duration-300 group-hover:text-white">Satisfaction</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

Hero.propTypes = {
  stats: PropTypes.shape({
    rating: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    stays: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    satisfaction: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  }),
};

Hero.defaultProps = {
  stats: null,
};

export { SearchBar };
export default Hero;
