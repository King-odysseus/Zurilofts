import PropTypes from 'prop-types';

function TripSearchBar({ value, onChange, onSubmit, onClear, loading, hasActiveSearch }) {
  return (
    <form onSubmit={onSubmit} role="search" className="w-full">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <label htmlFor="trip-search-destination" className="sr-only">
            Search destinations or neighbourhoods
          </label>
          <input
            id="trip-search-destination"
            type="search"
            value={value}
            onChange={onChange}
            placeholder="Where are you headed?"
            autoComplete="address-level2"
            className="w-full rounded-xl border-2 border-[#D9D9D9] bg-white px-4 py-3 text-base text-[#1f2937] placeholder-[#6b7280] transition-shadow duration-200 focus:outline-none focus-visible:border-[#C49A6C] focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-0"
          />
          {hasActiveSearch && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-[#6b7280] transition-colors duration-150 hover:text-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
            >
              <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                <path
                  fillRule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clipRule="evenodd"
                />
              </svg>
            </button>
          )}
        </div>
        <button
          type="submit"
          disabled={loading}
          className="whitespace-nowrap rounded-full bg-[#C49A6C] px-6 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-[#C49A6C]/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0B0B45] focus-visible:ring-offset-0 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Find a stay'}
        </button>
      </div>
    </form>
  );
}

TripSearchBar.propTypes = {
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onClear: PropTypes.func.isRequired,
  loading: PropTypes.bool,
  hasActiveSearch: PropTypes.bool,
};

TripSearchBar.defaultProps = {
  loading: false,
  hasActiveSearch: false,
};

export default TripSearchBar;
