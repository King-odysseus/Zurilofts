import Navbar from './Navbar';
import TripSearchBar from './TripSearchBar.jsx';
import { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import PropTypes from 'prop-types';
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
function SearchBar() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
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
    if (query.trim().length >= 2) {
      navigate(`/properties?search=${encodeURIComponent(query.trim())}`);
      setOpen(false);
      setQuery('');
    }
  }, [query, navigate]);

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

/**
 * Compact light discovery header (board-01): Navbar over an off-white canvas,
 * a single charcoal headline, the shared blue search bar, a subtle trust/stat
 * row, and a secondary host CTA for logged-out visitors.
 */
function Hero({ stats }) {
  const { rating = '5.0', stays = '50', satisfaction = '100' } = stats || {};
  const { isAuthenticated } = useAuth();

  return (
    <section className="relative bg-[#F7F7F5]">
      {/* Navbar */}
      <Navbar />

      <div className="max-w-7xl mx-auto px-6 pt-24 md:pt-28 pb-10 md:pb-14">
        {/* Headline and subtext */}
        <div className="text-center">
          <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#C49A6C]">ZuriLofts</p>
          <h1 className="mt-3 text-3xl md:text-4xl lg:text-5xl font-extrabold text-[#222222] leading-tight tracking-tight">
            Find your place in Nairobi
          </h1>
          <p className="mt-3 text-base md:text-lg text-[#6b7280] max-w-2xl mx-auto leading-relaxed">
            Handpicked furnished apartments in Nairobi&apos;s prime neighbourhoods — comfortable, convenient and ready when you are.
          </p>
        </div>

        {/* Search - the shared, blue-accented TripSearchBar with live results */}
        <div className="mt-8 md:mt-10">
          <SearchBar />
        </div>

        {/* Trust / stat row */}
        <div className="mt-10 md:mt-12 flex justify-center items-center gap-6 md:gap-10">
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-[#222222]">
              <AnimatedNumber value={String(rating)} />
            </div>
            <div className="text-xs text-[#6b7280] mt-1 font-medium">Star rating</div>
          </div>
          <div className="w-px h-8 bg-[#E5E7EB]"></div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-[#222222]">
              <AnimatedNumber value={String(stays)} suffix="+" />
            </div>
            <div className="text-xs text-[#6b7280] mt-1 font-medium">Happy stays</div>
          </div>
          <div className="w-px h-8 bg-[#E5E7EB]"></div>
          <div className="text-center">
            <div className="text-xl md:text-2xl font-bold text-[#222222]">
              <AnimatedNumber value={String(satisfaction)} suffix="%" />
            </div>
            <div className="text-xs text-[#6b7280] mt-1 font-medium">Satisfaction</div>
          </div>
        </div>

        {/* Host CTA - secondary link for logged-out visitors only */}
        {!isAuthenticated && (
          <div className="mt-8 flex justify-center">
            <Link
              to="/register?role=HOST"
              className="inline-flex items-center gap-2 min-h-[44px] px-4 text-sm font-semibold text-[#2563EB] hover:text-[#1D4ED8] transition-colors rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2"
            >
              Earn by hosting your apartment
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
              </svg>
            </Link>
          </div>
        )}
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
