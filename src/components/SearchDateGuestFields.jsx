import { useEffect, useRef, useState } from 'react';
import PropTypes from 'prop-types';
import AvailabilityCalendar from './AvailabilityCalendar.jsx';

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
    : 'Add dates';
  const guestsLabel = guests > 0 ? `${guests} guest${guests === 1 ? '' : 's'}` : 'Add guests';

  function clampGuests(n) {
    return Math.min(16, Math.max(1, n));
  }

  return (
    <div ref={containerRef} className="contents">
      {/* When */}
      <div className="relative min-w-0 sm:min-w-[150px] sm:border-r sm:border-[#E5E7EB] px-4 py-2 sm:px-6 sm:py-1">
        <button
          type="button"
          onClick={() => setOpenField(openField === 'dates' ? null : 'dates')}
          aria-haspopup="dialog"
          aria-expanded={openField === 'dates'}
          className="block w-full min-h-[44px] text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
        >
          <span className="block text-sm font-semibold text-[#222222]">When</span>
          <span className="block truncate text-sm text-[#6b7280]">{datesLabel}</span>
        </button>

        {openField === 'dates' && (
          <div
            role="dialog"
            aria-label="Choose dates"
            className="fixed inset-0 z-50 overflow-y-auto bg-white p-4 sm:absolute sm:inset-auto sm:left-0 sm:top-full sm:z-40 sm:mt-2 sm:w-[640px] sm:rounded-2xl sm:border sm:border-[#E5E7EB] sm:p-5 sm:shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between sm:hidden">
              <span className="text-base font-semibold text-[#222222]">Choose dates</span>
              <button
                type="button"
                onClick={() => setOpenField(null)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#F7F7F5]"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <AvailabilityCalendar value={dates} onChange={onDatesChange} />
            <div className="mt-4 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => onDatesChange({ checkIn: '', checkOut: '' })}
                className="text-sm font-semibold text-[#222222] underline underline-offset-2 hover:text-[#0B0B45]"
              >
                Clear dates
              </button>
              <button
                type="button"
                onClick={() => setOpenField(null)}
                className="min-h-[44px] rounded-full bg-[#0B0B45] px-6 text-sm font-semibold text-white hover:bg-[#07072e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
              >
                Done
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Who */}
      <div className="relative min-w-0 sm:min-w-[140px] px-4 py-2 sm:px-6 sm:py-1">
        <button
          type="button"
          onClick={() => setOpenField(openField === 'guests' ? null : 'guests')}
          aria-haspopup="dialog"
          aria-expanded={openField === 'guests'}
          className="block w-full min-h-[44px] text-left rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
        >
          <span className="block text-sm font-semibold text-[#222222]">Who</span>
          <span className="block truncate text-sm text-[#6b7280]">{guestsLabel}</span>
        </button>

        {openField === 'guests' && (
          <div
            role="dialog"
            aria-label="Choose guests"
            className="fixed inset-0 z-50 bg-white p-4 sm:absolute sm:inset-auto sm:right-0 sm:top-full sm:left-auto sm:z-40 sm:mt-2 sm:w-72 sm:rounded-2xl sm:border sm:border-[#E5E7EB] sm:p-5 sm:shadow-2xl"
          >
            <div className="mb-3 flex items-center justify-between sm:hidden">
              <span className="text-base font-semibold text-[#222222]">Guests</span>
              <button
                type="button"
                onClick={() => setOpenField(null)}
                aria-label="Close"
                className="flex h-11 w-11 items-center justify-center rounded-full hover:bg-[#F7F7F5]"
              >
                <svg className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            <div className="flex items-center justify-between py-2">
              <div>
                <p className="text-sm font-semibold text-[#222222]">Guests</p>
                <p className="text-xs text-[#6b7280]">Ages 1 and up</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => onGuestsChange(clampGuests(guests - 1))}
                  disabled={guests <= 1}
                  aria-label="Decrease guests"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  &minus;
                </button>
                <span className="w-6 text-center text-sm font-semibold text-[#222222]" aria-live="polite">{guests}</span>
                <button
                  type="button"
                  onClick={() => onGuestsChange(clampGuests(guests + 1))}
                  disabled={guests >= 16}
                  aria-label="Increase guests"
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#E5E7EB] text-[#222222] hover:bg-[#F7F7F5] disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
                >
                  +
                </button>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button
                type="button"
                onClick={() => setOpenField(null)}
                className="min-h-[44px] rounded-full bg-[#0B0B45] px-6 text-sm font-semibold text-white hover:bg-[#07072e] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#2563EB]"
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
