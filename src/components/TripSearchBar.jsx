import PropTypes from 'prop-types';

function TripSearchBar({ value, onChange, onSubmit, onClear, loading, hasActiveSearch }) {
  return (
    <form onSubmit={onSubmit} role="search" className="w-full">
      <div className="bg-white rounded-full shadow-lg px-2 py-2 flex items-center transform hover:scale-[1.02] transition-transform duration-200">
        <div className="flex-1 flex items-center px-4">
          {loading ? (
            <div className="w-5 h-5 border-2 border-[#C49A6C] border-t-transparent rounded-full animate-spin mr-3 flex-shrink-0" />
          ) : (
            <svg className="w-5 h-5 text-[#C49A6C] mr-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          )}
          <label htmlFor="trip-search-destination" className="sr-only">
            Search destinations or neighbourhoods
          </label>
          <input
            id="trip-search-destination"
            type="search"
            value={value}
            onChange={onChange}
            placeholder="Search by location or property name..."
            autoComplete="address-level2"
            className="w-full py-3 text-[#1f2937] placeholder-[#6b7280] focus:outline-none bg-transparent text-base"
          />
          {hasActiveSearch && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="rounded-full p-1 text-[#6b7280] transition-colors duration-150 hover:text-[#1f2937] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
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
          className="bg-[#C49A6C] text-white font-bold px-8 py-3 rounded-full hover:bg-[#b8895c] transition-all duration-200 whitespace-nowrap shadow-md hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? 'Searching…' : 'Search'}
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