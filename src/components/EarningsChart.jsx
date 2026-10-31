import PropTypes from 'prop-types';

/**
 * Host earnings chart: one bar per month (or quarter), gridlines and value
 * labels on the RIGHT, month labels underneath with the open period marked by a
 * dark pill. Modelled on the performance chart in Airbnb's host earnings page.
 *
 * Built from divs instead of a chart library: the whole thing is a stacked
 * two-tone bar per period and nothing else, so a dependency would cost more
 * (bundle size, another thing to theme in dark mode) than it saves.
 *
 * The plot is deliberately static. No mount animation and no scroll observer -
 * a host comparing months more than once a week should not have to wait for the
 * columns to grow every time they open the page.
 */

// Four gaps between five lines, so one tick is a quarter of the axis maximum.
// Every label on the axis is then a multiple of that tick.
const TICK_STEPS = 4;

// The plot gives this much width to the right-hand labels, and the bars stop
// short of it so a tall month can never sit underneath "KES 280K".
const AXIS_GUTTER = 'pr-[4.5rem]';

// A month worth a few hundred shillings beside a six-figure one would otherwise
// round to nothing and read as a gap in the data, so every non-zero bar keeps at
// least this much of the plot height.
const MIN_BAR_PERCENT = 2;

/**
 * The axis top, rounded up so its quarters read as whole money. Without this the
 * top line lands on whatever the largest month happened to be (KES 139,447) and
 * every label is impossible to scan.
 */
function niceMax(largest) {
  if (!Number.isFinite(largest) || largest <= 0) return 1000;
  const rough = largest / TICK_STEPS;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  // 2.5 is in the list so a 25,000 tick stays a round number instead of
  // jumping all the way to 50,000 and squashing the bars to half height.
  // The fallback can never be reached (10 x magnitude is always at least rough),
  // but a missing step would turn every height into NaN, so it is spelled out.
  const step = ([1, 2, 2.5, 5, 10].find((candidate) => candidate * magnitude >= rough) || 10) * magnitude;
  return step * TICK_STEPS;
}

/** Axis labels are read at a glance, so 280000 becomes "KES 280K". */
function formatAxisValue(value) {
  if (!value) return 'KES 0';
  if (value >= 1000000) return `KES ${singleDecimal(value / 1000000)}M`;
  if (value >= 1000) return `KES ${singleDecimal(value / 1000)}K`;
  return `KES ${singleDecimal(value)}`;
}

/** Keeps "2.5K" while dropping the ".0" a fixed 1dp would add to 70K. */
function singleDecimal(value) {
  const rounded = Math.round(value * 10) / 10;
  return rounded.toLocaleString('en-KE');
}

/** Full shillings for the screen-reader sentence, where KES 139,447 beats 139K. */
function formatKes(value) {
  return (Number(value) || 0).toLocaleString('en-KE');
}

export default function EarningsChart({ buckets, selectedKey, onSelect, emptyMessage }) {
  const periods = Array.isArray(buckets) ? buckets : [];
  const largest = periods.reduce((max, period) => Math.max(max, Number(period.total) || 0), 0);
  const axisMax = niceMax(largest);
  const ticks = Array.from({ length: TICK_STEPS + 1 }, (_, index) => {
    const percent = (index / TICK_STEPS) * 100;
    return { percent, value: (axisMax * percent) / 100 };
  });

  return (
    <div role="group" aria-label="Monthly earnings chart">
      {/* One sentence per period for screen readers. The bars themselves are
          hidden below, so the figures are announced once rather than once per
          column plus once here. */}
      {periods.length > 0 && (
        <p className="sr-only">
          {`Monthly earnings: ${periods
            .map(
              (period) =>
                `${period.label} KES ${formatKes(period.total)} total, of which KES ${formatKes(period.paid)} paid and KES ${formatKes(period.upcoming)} upcoming.`,
            )
            .join(' ')}`}
        </p>
      )}

      {/* A row of flat, zero-height bars looks like a rendering bug, so an empty
          month list says so in words instead. */}
      {largest <= 0 ? (
        <p className="py-12 text-center text-sm text-muted">
          {emptyMessage || 'No earnings to chart yet.'}
        </p>
      ) : (
        <div className="relative">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-56 sm:h-72" aria-hidden="true">
            {ticks.map((tick) => (
              <div key={tick.percent} className="absolute inset-x-0" style={{ bottom: `${tick.percent}%` }}>
                <span className="absolute left-0 right-[4.5rem] border-t border-border" />
                <span className="absolute right-0 top-0 w-[4.5rem] -translate-y-1/2 pl-2 text-[11px] leading-none text-muted">
                  {formatAxisValue(tick.value)}
                </span>
              </div>
            ))}
          </div>

          <div className={`relative flex items-stretch gap-1.5 sm:gap-2 ${AXIS_GUTTER}`}>
            {periods.map((period) => {
              const total = Number(period.total) || 0;
              const paid = Number(period.paid) || 0;
              const upcoming = Number(period.upcoming) || 0;
              const isSelected = period.key === selectedKey;
              const barPercent = total > 0 ? Math.max((total / axisMax) * 100, MIN_BAR_PERCENT) : 0;
              const paidShare = total > 0 ? (paid / total) * 100 : 0;
              const upcomingShare = total > 0 ? (upcoming / total) * 100 : 0;

              return (
                <button
                  key={period.key}
                  type="button"
                  onClick={() => onSelect(period.key)}
                  aria-pressed={isSelected}
                  className="group flex min-w-0 flex-1 basis-0 flex-col rounded-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-navy/40"
                >
                  {/* Whole column above the label, so the tall empty area of a
                      quiet month is still a hit target. The graphic carries no
                      text, which is why hiding it keeps the button's name clean
                      without hiding the button itself. */}
                  <span className="flex h-56 w-full flex-col justify-end sm:h-72" aria-hidden="true">
                    <span
                      className="mx-auto flex w-full max-w-[3.25rem] flex-col justify-end transition duration-200 group-hover:brightness-110"
                      style={{ height: `${barPercent}%` }}
                    >
                      {/* Upcoming sits on top of paid, as a pale outlined cap;
                          the solid part stays square where the two meet. */}
                      {upcoming > 0 && (
                        <span
                          className="w-full rounded-t-md border border-primary-200 bg-primary-50 dark:border-primary-400/40 dark:bg-primary/15"
                          style={{ height: `${upcomingShare}%` }}
                        />
                      )}
                      {paid > 0 && (
                        <span
                          className={`w-full bg-primary-700 dark:bg-primary-500 ${upcoming > 0 ? '' : 'rounded-t-md'}`}
                          style={{ height: `${paidShare}%` }}
                        />
                      )}
                    </span>
                  </span>

                  {/* Selection is a filled pill, not a colour change on the bar,
                      so it survives a greyscale screen and a colour-blind eye. */}
                  <span className="mt-2 flex justify-center">
                    <span
                      className={`whitespace-nowrap rounded-full px-2.5 py-1 text-xs ${
                        isSelected ? 'bg-navy-bg font-semibold text-white' : 'text-muted'
                      }`}
                    >
                      {period.label}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

EarningsChart.propTypes = {
  buckets: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      paid: PropTypes.number.isRequired,
      upcoming: PropTypes.number.isRequired,
      total: PropTypes.number.isRequired,
    }),
  ).isRequired,
  // Undefined is a real state: the chart opens before a period is chosen, and
  // then no pill is filled.
  selectedKey: PropTypes.string,
  onSelect: PropTypes.func.isRequired,
  emptyMessage: PropTypes.string,
};
