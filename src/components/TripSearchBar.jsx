import PropTypes from 'prop-types';
import { Search, X } from 'lucide-react';
import SearchDateGuestFields from './SearchDateGuestFields.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

function TripSearchBar({ value, onChange, onSubmit, onClear, loading = false, hasActiveSearch = false, discovery = false, dates = { checkIn: '', checkOut: '' }, onDatesChange = () => {}, guests = 1, onGuestsChange = () => {} }) {
  const { t } = useLanguage();
  return (
    <form onSubmit={onSubmit} role="search" className="w-full max-w-full">
      <div className={`flex flex-col gap-2 rounded-2xl border border-[#E3E8EF] bg-white/95 p-2 shadow-[0_8px_28px_rgba(11,31,66,0.12)] backdrop-blur-sm transition-shadow focus-within:border-[#C49A6C] focus-within:ring-2 focus-within:ring-[#C49A6C]/20 sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:bg-white sm:backdrop-blur-none ${discovery ? 'sm:p-2' : ''}`}>
        <div className={`flex min-w-0 flex-1 items-center px-2 sm:px-4 ${discovery ? 'sm:border-r sm:border-[#E3E8EF]' : ''}`}>
          {loading ? (
            <div className="mr-2 h-5 w-5 flex-shrink-0 animate-spin rounded-full border-2 border-[#C49A6C] border-t-transparent sm:mr-3" />
          ) : (
            <Search className="h-5 w-5 flex-shrink-0 text-[#0B1F42] mr-2 sm:mr-3" strokeWidth={2} aria-hidden="true" />
          )}
          <label htmlFor="trip-search-destination" className="sr-only">
            Search destinations or neighbourhoods
          </label>
          {discovery && <span className="mr-3 hidden shrink-0 text-sm font-semibold text-[#0B1F42] sm:inline">{t('home.where')}</span>}
          <input
            id="trip-search-destination"
            type="search"
            value={value}
            onChange={onChange}
            placeholder={discovery ? t('home.searchDestination') : t('home.searchLocation')}
            autoComplete="address-level2"
            className="search-input-clean min-h-[44px] w-full min-w-0 max-w-full bg-transparent py-3 text-base text-[#0B1F42] placeholder-[#94A3B8] focus:outline-none"
          />
          {hasActiveSearch && (
            <button
              type="button"
              onClick={onClear}
              aria-label="Clear search"
              className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-full text-[#5B6B82] transition-colors duration-150 hover:bg-[#F7F4EF] hover:text-[#0B1F42] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
            >
              <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
            </button>
          )}
        </div>
        {discovery && (
          <SearchDateGuestFields
            dates={dates}
            onDatesChange={onDatesChange}
            guests={guests}
            onGuestsChange={onGuestsChange}
          />
        )}
        <button
          type="submit"
          disabled={loading}
          className={`min-h-[44px] w-full whitespace-nowrap rounded-full bg-[#0B1F42] px-6 py-3 text-base font-semibold text-white transition-all duration-200 hover:bg-[#07072E] active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C] focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${discovery ? 'sm:h-12 sm:w-12 sm:px-0 sm:text-transparent' : 'sm:w-auto sm:px-8'}`}
        >
          {discovery ? (
            <Search className="mx-auto h-5 w-5 text-white" strokeWidth={2.5} aria-hidden="true" />
          ) : (loading ? 'Searching…' : 'Search')}
          {discovery && <span className="sr-only">Search</span>}
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
  discovery: PropTypes.bool,
  dates: PropTypes.shape({ checkIn: PropTypes.string, checkOut: PropTypes.string }),
  onDatesChange: PropTypes.func,
  guests: PropTypes.number,
  onGuestsChange: PropTypes.func,
};

export default TripSearchBar;
