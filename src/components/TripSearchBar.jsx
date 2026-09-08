import PropTypes from 'prop-types';

function TripSearchBar({ value, onChange, onSubmit, onClear, loading, hasActiveSearch }) {
  return (
    <form onSubmit={onSubmit} role="search" className="w-full">
      <div className="flex flex-col gap-2 rounded-2xl border border-[#E5E7EB] bg-white p-2 shadow-lg transition-shadow focus-within:border-[#2563EB] focus-within:ring-2 focus-within:ring-[#2563EB]/20 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full">
        <div className="flex flex-1 items-center px-2 sm:px-4">
          {loading ? (
            <div className="h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-[#2563EB] border-t-transparent mr-2 sm:mr-3" />
          ) : (
            <svg className="h-5 w-5 flex-shrink-0 text-[#222222] mr-2 sm:mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
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
            className="min-h-[44px] w-full bg-transparent py-3 text-base text-[#222222] placeholder-[#6b7280] focus:outline-none"
          />
          {hasActiveSearch && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[#6b7280] transition-colors duration-150 hover:bg-[#F7F7F5] hover:text-[#222222] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
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
          className="min-h-[44px] w-full whitespace-nowrap rounded-full bg-[#2563EB] px-6 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-[#1D4ED8] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto sm:px-8"
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