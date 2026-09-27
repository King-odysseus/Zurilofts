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
 * Airbnb-style availability calendar with check-in -> check-out range selection.
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
      // A blocked night sits between - restart selection here
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
        <div className="mb-3 text-center font-semibold text-[#0B1F42]">{MONTHS[month]} {year}</div>
        <div className="mb-1 grid grid-cols-7 gap-1">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1 text-center text-xs font-medium text-[#52606F]">{w}</div>
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
                  'h-9 rounded-[10px] text-sm transition-colors',
                  disabled
                    ? 'cursor-not-allowed bg-[#EAF0F4] text-[#94A3B8]'
                    : 'cursor-pointer text-[#0B1F42] hover:bg-[#FDE8D8]',
                  isEndpoint ? 'bg-[#C49A6C] font-bold text-white hover:bg-[#B8895C]' : '',
                  inRange ? 'rounded-none bg-[#FDE8D8]' : '',
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
    <div className="rounded-2xl border border-[#E3E8EF] bg-white p-4 shadow-[0_8px_28px_rgba(11,31,66,0.08)] md:p-5">
      <div className="flex items-center justify-between mb-2">
        <button
          type="button"
          onClick={() => canGoBack && setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1))}
          disabled={!canGoBack}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F7F4EF] disabled:cursor-not-allowed disabled:opacity-30"
          aria-label="Previous month"
        >
          <svg className="h-5 w-5 text-[#0B1F42]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <button
          type="button"
          onClick={() => setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1))}
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-[#F7F4EF]"
          aria-label="Next month"
        >
          <svg className="h-5 w-5 text-[#0B1F42]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {renderMonth(viewMonth)}
        <div className="hidden md:block flex-1">{renderMonth(nextMonth)}</div>
      </div>

      <div className="mt-4 flex items-center gap-4 border-t border-[#E3E8EF] pt-3 text-xs text-[#5B6B82]">
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-[#C49A6C]" /> Selected
        </span>
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-[#EAF0F4]" /> Unavailable
        </span>
        <span className="ml-auto">
          {checkIn && !checkOut ? 'Select your check-out date' : 'Select your dates'}
        </span>
      </div>
    </div>
  );
}

export default AvailabilityCalendar;
