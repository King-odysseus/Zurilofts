import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import { X } from 'lucide-react';
import AvailabilityCalendar from './AvailabilityCalendar.jsx';
import { useLanguage } from '../context/LanguageContext.jsx';

// Local YYYY-MM-DD formatting, matching AvailabilityCalendar's own helper.
function formatShort(iso) {
  if (!iso) return '';
  const d = new Date(`${iso}T00:00:00`);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

/**
 * Real "When" (date range) and "Who" (guest count) controls for the shared
 * discovery search bar - replaces static "Add dates"/"Add guests" display
 * text with working popovers (desktop) that become full-screen sheets on
 * mobile. No property is known at search time, so the calendar has no
 * unavailable ranges to grey out; actual availability is verified per
 * listing by the server when dates are applied to a search.
 *
 * props:
 *  - dates: { checkIn, checkOut } as 'YYYY-MM-DD' | ''
 *  - onDatesChange: ({ checkIn, checkOut }) => void
 *  - guests: number (>= 1)
 *  - onGuestsChange: (number) => void
 */
function SearchDateGuestFields({ dates, onDatesChange, guests, onGuestsChange }) {
  const { t } = useLanguage();
  const [openField, setOpenField] = useState(null); // 'dates' | 'guests' | null
  const containerRef = useRef(null);

  useEffect(() => {
    function onClick(e) {
      if (containerRef.current && !containerRef.current.contains(e.target)) setOpenField(null);
    }
    function onKey(e) {
      if (e.key === 'Escape') setOpenField(null);
    }
    document.addEventListener('mousedown', onClick);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onClick);
      document.removeEventListener('keydown', onKey);
    };
  }, []);

  const datesLabel = dates?.checkIn
    ? dates.checkOut
      ? `${formatShort(dates.checkIn)} - ${formatShort(dates.checkOut)}`
      : `${formatShort(dates.checkIn)} - Add check-out`
    : t('home.addDates');
  const guestsLabel = guests > 0 ? `${guests} ${guests === 1 ? t('home.guest') : t('home.guests')}` : t('home.addGuests');

  function clampGuests(n) {
    return Math.min(16, Math.max(1, n));
  }

  return (
    <div ref={containerRef} className={`flex w-full min-w-0 flex-col sm:contents ${openField ? 'relative z-50' : ''}`}>
      {/* When */}
      <div className={`relative w-full min-w-0 px-4 py-2 sm:w-auto sm:min-w-[150px] sm:border-r sm:border-[#E3E8EF] sm:px-6 sm:py-1 ${openField === 'dates' ? 'z-50' : ''}`}>
        <button
          type="button"
          onClick={() => setOpenField(openField === 'dates' ? null : 'dates')}
          aria-haspopup="dialog"
          aria-expanded={openField === 'dates'}
          className="block min-h-[44px] w-full rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
        >
        <span className="block text-sm font-semibold text-[#0B1F42]">{t('home.when')}</span>
          <span className="block truncate text-sm text-[#5B6B82]">{datesLabel}</span>
        </button>

        {openField === 'dates' && (
          <div
            role="dialog"
            aria-label="Choose dates"
            className="fixed inset-0 z-[100] overflow-y-auto bg-white p-4 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:z-[100] sm:mt-2 sm:w-[min(640px,calc(100vw-2rem))] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:border-[#E3E8EF] sm:p-5 sm:shadow-[0_8px_28px_rgba(11,31,66,0.14)]"
          >
            <div className="mb-3 flex items-center justify-between sm:hidden">
              <span className="text-base font-semibold text-[#0B1F42]">Choose dates</span>
              <button
                type="button"
                onClick={() => setOpenField(null)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#F7F4EF]"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <AvailabilityCalendar value={dates} onChange={onDatesChange} />
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onDatesChange({ checkIn: '', checkOut: '' })}
                className="text-sm font-semibold text-[#0B1F42] underline underline-offset-2 hover:text-[#C49A6C]"
              >
                Clear dates
              </button>
              <button
                type="button"
                onClick={() => setOpenField(null)}
                className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-6 text-sm font-semibold text-white hover:bg-[#07072E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Who */}
      <div className={`relative w-full min-w-0 px-4 py-2 sm:w-auto sm:min-w-[140px] sm:px-6 sm:py-1 ${openField === 'guests' ? 'z-50' : ''}`}>
        <button
          type="button"
          onClick={() => setOpenField(openField === 'guests' ? null : 'guests')}
          aria-haspopup="dialog"
          aria-expanded={openField === 'guests'}
          className="block min-h-[44px] w-full rounded-[10px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
        >
        <span className="block text-sm font-semibold text-[#0B1F42]">{t('home.who')}</span>
          <span className="block truncate text-sm text-[#5B6B82]">{guestsLabel}</span>
        </button>

        {openField === 'guests' && (
          <div
            role="dialog"
            aria-label="Choose guests"
            className="fixed inset-0 z-[100] bg-white p-4 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:left-auto sm:z-[100] sm:mt-2 sm:w-[min(18rem,calc(100vw-2rem))] sm:max-w-[calc(100vw-2rem)] sm:rounded-2xl sm:border sm:border-[#E3E8EF] sm:p-5 sm:shadow-[0_8px_28px_rgba(11,31,66,0.14)]"
          >
            <div className="mb-3 flex items-center justify-between sm:hidden">
              <span className="text-base font-semibold text-[#0B1F42]">Guests</span>
              <button
                type="button"
                onClick={() => setOpenField(null)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#F7F4EF]"
              >
                <X className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
              </button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-[#0B1F42]">Guests</p>
                <p className="text-xs text-[#5B6B82]">Ages 18 and up</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onGuestsChange(clampGuests(guests - 1))}
                  disabled={guests <= 1}
                  aria-label="Decrease guests"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3E8EF] text-[#0B1F42] hover:bg-[#F7F4EF] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
                >
                  &minus;
                </button>
                <span className="w-6 text-center text-sm font-semibold text-[#0B1F42]" aria-live="polite">{guests}</span>
                <button
                  type="button"
                  onClick={() => onGuestsChange(clampGuests(guests + 1))}
                  disabled={guests >= 16}
                  aria-label="Increase guests"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E3E8EF] text-[#0B1F42] hover:bg-[#F7F4EF] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenField(null)}
                className="min-h-[44px] rounded-[10px] bg-[#0B1F42] px-6 text-sm font-semibold text-white hover:bg-[#07072E] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#C49A6C]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

SearchDateGuestFields.propTypes = {
  dates: PropTypes.shape({ checkIn: PropTypes.string, checkOut: PropTypes.string }).isRequired,
  onDatesChange: PropTypes.func.isRequired,
  guests: PropTypes.number.isRequired,
  onGuestsChange: PropTypes.func.isRequired,
};

export default SearchDateGuestFields;
