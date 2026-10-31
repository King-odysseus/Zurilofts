import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Local YYYY-MM-DD (avoids UTC off-by-one from toISOString)
function toISO(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

const WEEKDAYS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

// The weekday row and every date row share this one template. Identical columns
// plus identical gaps is the only thing that keeps 'Tu' centred over its column.
// The column gutter is 0 on phones: a 7 column grid inside the 360px date sheet
// only clears a 44px touch target with no gutter, and from sm up there is room
// for one, so the tint band and gutters both scale with the space available.
const CALENDAR_GRID = 'grid grid-cols-7 gap-x-0 gap-y-1 sm:gap-x-1';

// Flowbite's Button carries its own palette and padding, so the geometry that
// must not lose (44px square, quiet navy icon) is forced here instead of being
// left to theme-vs-utility ordering.
const PAGER_BUTTON = [
  '!h-11 !w-11 !shrink-0 !rounded-full !border-0 !bg-transparent !p-0',
  '!text-navy !shadow-none hover:!bg-surface',
  'focus:!ring-0 focus-visible:!ring-2 focus-visible:!ring-primary',
  'disabled:!cursor-not-allowed disabled:!opacity-30',
].join(' ');

// Radius lives in each state class, not here: Tailwind emits `rounded-xl` after
// `rounded-none`, so a shared `rounded-xl` here would silently re-round the
// in-range band and break it into beads.
const DAY_BUTTON = [
  'flex h-11 w-full min-w-0 items-center justify-center text-sm tabular-nums transition-colors',
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-1 focus-visible:ring-offset-elevated',
].join(' ');

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

  const nextMonth = new Date(viewMonth.getFullYear(), viewMonth.getMonth() + 1, 1);
  const canGoBack = viewMonth > new Date(today.getFullYear(), today.getMonth(), 1);

  // Both months page this same pair, so every arrow a guest can reach moves the
  // calendar they are looking at, whichever month header it sits under.
  const goToPreviousMonth = () => {
    if (!canGoBack) return;
    setViewMonth(new Date(viewMonth.getFullYear(), viewMonth.getMonth() - 1, 1));
  };
  const goToNextMonth = () => setViewMonth(new Date(nextMonth));

  function renderMonth(monthDate) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const firstWeekday = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];

    for (let i = 0; i < firstWeekday; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));

    return (
      <div className="min-w-0 flex-1">
        {/* Arrows live inside their own month's header row - one at each end of
            the month name - so it is obvious which month they move. */}
        <div className="mb-1 flex items-center gap-1">
          <Button
            type="button"
            color="light"
            onClick={goToPreviousMonth}
            disabled={!canGoBack}
            aria-label="Previous month"
            className={PAGER_BUTTON}
          >
            <ChevronLeft className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </Button>
          <div className="min-w-0 flex-1 truncate text-center text-sm font-semibold text-navy sm:text-base">
            {MONTHS[month]} {year}
          </div>
          <Button
            type="button"
            color="light"
            onClick={goToNextMonth}
            aria-label="Next month"
            className={PAGER_BUTTON}
          >
            <ChevronRight className="h-5 w-5" strokeWidth={2} aria-hidden="true" />
          </Button>
        </div>

        {/* Hidden from assistive tech: each day button already announces its own
            weekday, so repeating the header row would only add noise. */}
        <div className={`${CALENDAR_GRID} mb-1`} aria-hidden="true">
          {WEEKDAYS.map((w) => (
            <div
              key={w}
              className="flex h-8 items-center justify-center text-[11px] font-medium uppercase tracking-wide text-muted"
            >
              {w}
            </div>
          ))}
        </div>

        <div className={CALENDAR_GRID}>
          {cells.map((date, i) => {
            if (!date) return <div key={`e${i}`} />;
            const iso = toISO(date);
            const disabled = isPast(date) || isBlocked(date);
            const isCheckIn = checkIn && iso === toISO(checkIn);
            const isCheckOut = checkOut && iso === toISO(checkOut);
            const inRange = checkIn && checkOut && date > checkIn && date < checkOut;
            const isEndpoint = Boolean(isCheckIn || isCheckOut);
            const isToday = iso === toISO(today);

            // One state class wins per cell so hover tints cannot leak into a
            // selected or unavailable day through class ordering.
            let stateClass = 'rounded-lg text-navy hover:bg-surface';
            if (disabled) {
              stateClass = 'cursor-not-allowed rounded-lg bg-surface text-muted/60 line-through decoration-1';
            } else if (isEndpoint) {
              stateClass = 'rounded-xl bg-navy-bg font-semibold text-white hover:bg-navy-hover';
            } else if (inRange) {
              // Square corners let consecutive days read as a single navy band.
              stateClass = 'rounded-none bg-navy-bg/10 text-navy hover:bg-navy-bg/20';
            }

            // Bronze is an accent only: today is a hairline ring or a focus ring,
            // never a bronze block, because that is reserved for the selected ends.
            const todayRing = isToday && !isEndpoint ? 'ring-1 ring-inset ring-primary' : '';

            const dateLabel = date.toLocaleDateString('en-GB', {
              weekday: 'long',
              day: 'numeric',
              month: 'long',
              year: 'numeric',
            });

            return (
              <button
                key={iso}
                type="button"
                onClick={() => handleDayClick(date)}
                disabled={disabled}
                aria-label={`${dateLabel}${disabled ? ', unavailable' : ''}`}
                aria-pressed={isEndpoint}
                className={[DAY_BUTTON, stateClass, todayRing].join(' ')}
              >
                {date.getDate()}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full rounded-2xl border border-border bg-elevated p-2 shadow-sm sm:p-4">
      {/* One month on phones (cells stay tappable), the pair from md up. */}
      <div className="flex flex-col gap-4 md:flex-row md:gap-5">
        {renderMonth(viewMonth)}
        <div className="hidden min-w-0 flex-1 border-border md:block md:border-l md:pl-5">
          {renderMonth(nextMonth)}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border pt-3 text-xs text-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block h-3 w-3 rounded-[4px] bg-navy-bg" />
          Selected
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-[4px] ring-1 ring-inset ring-primary"
          />
          Today
        </span>
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="inline-block h-3 w-3 rounded-[4px] border border-border bg-surface"
          />
          Unavailable
        </span>
        {/* The field label above already says "Select your dates", so this line
            only earns its space once a check-in exists and the guest needs the
            next step spelled out. */}
        {checkIn && !checkOut && (
          <span className="font-medium text-navy sm:ml-auto">Select your check-out date</span>
        )}
      </div>
    </div>
  );
}

AvailabilityCalendar.propTypes = {
  value: PropTypes.shape({
    checkIn: PropTypes.string,
    checkOut: PropTypes.string,
  }),
  onChange: PropTypes.func.isRequired,
  unavailableRanges: PropTypes.arrayOf(
    PropTypes.shape({
      start: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
      end: PropTypes.oneOfType([PropTypes.string, PropTypes.instanceOf(Date)]),
    })
  ),
};

export default AvailabilityCalendar;
