import { useMemo, useState } from 'react';

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/**
 * Airbnb-style availability calendar with check-in → check-out range selection.
 * Disables past dates and any date inside an unavailable range (imported
 * Airbnb/Booking.com blocks + existing bookings). `end` of a range is exclusive,
 * so the check-out day of a previous stay is bookable.
 *
 * props:
 *  - value: { checkIn, checkOut } as 'YYYY-MM-DD'
 *  - onChange: ({ checkIn, checkOut }) => void
 *  - unavailableRanges: [{ start, end }] (ISO date strings / dates)
 */
function AvailabilityCalendar({ value, onChange, unavailableRanges = [] }) {
  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const [viewMonth, setViewMonth] = useState(() => {
    const base = value?.checkIn ? new Date(value.checkIn) : new Date();
    return new Date(base.getFullYear(), base.getMonth(), 1);
  });

  // Set of unavailable day strings for O(1) lookup
  const unavailableDays = useMemo(() => {
    const set = new Set();
    for (const r of unavailableRanges) {
      const start = new Date(r.start);
      start.setHours(0, 0, 0, 0);
      const end = new Date(r.end);
      end.setHours(0, 0, 0, 0);
      const cursor = new Date(start);
      let guard = 0;
      while (cursor < end && guard < 400) {
        set.add(toISO(cursor));
        cursor.setDate(cursor.getDate() + 1);
        guard++;
      }
    }
    return set;
  }, [unavailableRanges]);

  const checkIn = value?.checkIn ? new Date(value.checkIn) : null;
  const checkOut = value?.checkOut ? new Date(value.checkOut) : null;

  const isPast = (date) => date < today;
  const isBlocked = (date) => unavailableDays.has(toISO(date));

  // Are all nights in [from, to) free? (checkout day itself excluded)
  const rangeIsFree = (from, to) => {
    const cursor = new Date(from);
    cursor.setHours(0, 0, 0, 0);
    while (cursor < to) {
      if (unavailableDays.has(toISO(cursor))) return false;
      cursor.setDate(cursor.getDate() + 1);
    }
    return true;
  };

  function handleDayClick(date) {
    if (isPast(date) || isBlocked(date)) return;
    const iso = toISO(date);

    // Start a new range if none in progress or both already chosen
    if (!checkIn || (checkIn && checkOut)) {
      onChange({ checkIn: iso, checkOut: '' });
      return;
    }
    // Second click: must be after check-in and the span must be free
    if (date <= checkIn) {
      onChange({ checkIn: iso, checkOut: '' });
      return;
    }
    if (!rangeIsFree(checkIn, date)) {
      // A blocked night sits between — restart selection here
      onChange({ checkIn: iso, checkOut: '' });
      return;
    }
    onChange({ checkIn: toISO(checkIn), checkOut: iso });
  }

  function renderMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    return (
      <div className="flex-1">
        <div className="text-center font-semibold text-[#0B0B45] mb-3">{MONTHS[month]} {year}</div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="text-center text-xs font-medium text-[#6b7280] py-1">{w}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const iso = toISO(date);
            const disabled = isPast(date) || isBlocked(date);
            const isCheckIn = checkIn && iso === toISO(checkIn);
            const isCheckOut = checkOut && iso === toISO(checkOut);
            const inRange = checkIn && checkOut && date > checkIn && date < checkOut;
            const isEndpoint = isCheckIn || isCheckOut;

            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleDayClick(date)}
                disabled={disabled}
                className={[
                  'h-9 text-sm rounded-lg transition-colors',
                  disabled
                    ? 'text-[#D9D9D9] line-through cursor-not-allowed'
                    : 'text-[#1f2937] hover:bg-[#C49A6C]/20 cursor-pointer',
                  isEndpoint ? 'bg-[#C49A6C] text-white font-bold hover:bg-[#b8895c]' : '',
                  inRange ? 'bg-[#C49A6C]/15 rounded-none' : '',
                ].join(' ')}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  const canGoBack = viewMonth > new Date(today.getFullYear(), today.getMonth(), 1);

  return (
    <div className="neu-card p-4 md:p-5 bg-white">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => canGoBack && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          disabled={!canGoBack}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f8f9fa] disabled:opacity-30 disabled:cursor-not-allowed"
          aria-label="Previous month"
        >
          <svg className="w-5 h-5 text-[#0B0B45]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-[#f8f9fa]"
          aria-label="Next month"
        >
          <svg className="w-5 h-5 text-[#0B0B45]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {renderMonth(viewMonth)}
        <div className="hidden md:block flex-1">{renderMonth(nextMonth)}</div>
      </div>

      <div className="flex items-center gap-4 mt-4 pt-3 border-t border-[#D9D9D9] text-xs text-[#6b7280]">
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[#C49A6C] inline-block" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-[#D9D9D9] inline-block" /> Unavailable
        </span>
        <span className="ml-auto">
          {checkIn && !checkOut ? 'Select your check-out date' : 'Select your dates'}
        </span>
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
