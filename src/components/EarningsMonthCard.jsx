import { useId, useState } from 'react';
import PropTypes from 'prop-types';
import { ChevronDown } from 'lucide-react';

/**
 * The month's earnings at a glance: paid, still to come, and the total.
 *
 * Two kinds of money sit next to each other here and a host reads them very
 * differently, so the dots carry the distinction rather than colour on the
 * numbers themselves: a filled mark for money already banked, a ring for money
 * still owed. The total is the sum, so it takes no mark at all.
 *
 * Values arrive as plain numbers and are formatted here, because the same card
 * renders under the chart, in a tooltip and in print; the breakdown rows arrive
 * pre-formatted strings (counts, averages) that this component could not derive.
 */

// Grouped the same way the rest of the app writes KES, and rounded so a
// fractional payout does not render as "12,345.678".
function formatMoney(value) {
  return `KES ${Math.round(value || 0).toLocaleString('en-KE')}`;
}

// The dot slot has a fixed size in every figure, including the one with no dot:
// the label text then starts on the same x in all three columns, which is what
// makes the row scannable. 'none' leaves the slot empty - never an invisible
// mark, and never a unicode bullet.
const DOT_CLASS = 'h-2 w-2 shrink-0 rounded-full';

const DOT_VARIANTS = {
  solid: `${DOT_CLASS} bg-primary-600`,
  // Transparent fill so the ring reads as an outline and not a small disc.
  hollow: `${DOT_CLASS} border border-primary-400 bg-transparent`,
  none: DOT_CLASS,
};

function Dot({ variant }) {
  // Purely decorative: the label says "Paid" or "Upcoming" in words already, so
  // the mark carries no information a screen reader would miss.
  return <span aria-hidden="true" className={DOT_VARIANTS[variant] || DOT_VARIANTS.none} />;
}

Dot.propTypes = {
  variant: PropTypes.oneOf(['solid', 'hollow', 'none']).isRequired,
};

export default function EarningsMonthCard({ heading, figures, breakdown }) {
  const [open, setOpen] = useState(false);
  // Generated rather than derived from the heading: two cards can name the same
  // month (this year and last), and duplicated ids would point aria-controls at
  // whichever panel the browser met first.
  const panelId = useId();
  const rows = Array.isArray(breakdown) ? breakdown : [];
  // A response that arrives without its figures should render a bare heading,
  // not take the whole earnings page down with a map on undefined.
  const list = Array.isArray(figures) ? figures : [];
  // An always-empty disclosure is dead UI: it invites a click that reveals
  // nothing, so a card with no itemisation drops the row entirely.
  const hasBreakdown = rows.length > 0;

  return (
    <section className="rounded-2xl border border-border bg-elevated p-5 shadow-sm sm:p-6">
      <h2 className="text-base font-semibold text-navy">{heading}</h2>

      {/* One column on a phone: three figures at 33% width wrap a KES amount
          onto two lines, which breaks the vertical comparison. */}
      <dl className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {list.map((figure) => (
          // Reversed column so the amount sits above its label while the DOM
          // keeps dt before dd, which is the order a definition list expects and
          // the order a screen reader needs to read "Paid: 113,643".
          <div key={figure.key} className="flex flex-col-reverse">
            <dt className="mt-1 flex items-center gap-1.5 text-xs text-muted">
              <Dot variant={figure.dot} />
              <span>{figure.label}</span>
            </dt>
            <dd className="text-xl font-bold tracking-tight tabular-nums text-navy sm:text-2xl">
              {formatMoney(figure.value)}
            </dd>
          </div>
        ))}
      </dl>

      {hasBreakdown && (
        <div className="mt-5 border-t border-border pt-4">
          <button
            type="button"
            onClick={() => setOpen((current) => !current)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex w-full items-center justify-between gap-2 text-sm font-semibold text-navy"
          >
            <span>Paid breakdown</span>
            <ChevronDown
              className={`h-4 w-4 shrink-0 text-muted transition-transform ${open ? 'rotate-180' : ''}`}
              strokeWidth={2}
              aria-hidden="true"
            />
          </button>

          {/* Only mounted while open: the numbers are itemised detail, not
              content worth loading or reading out on a card that is summarising
              the month. */}
          {open && (
            <dl id={panelId} className="mt-3 divide-y divide-border">
              {rows.map((row, index) => (
                // Index keys: the page owns these labels, and two rows may
                // legitimately share one ("Paid bookings" this month and last).
                <div key={`${row.label}-${index}`} className="flex items-baseline justify-between gap-4 py-2">
                  <dt className="text-xs text-muted">{row.label}</dt>
                  <dd className="text-right text-sm font-semibold tabular-nums text-navy">{row.value}</dd>
                </div>
              ))}
            </dl>
          )}
        </div>
      )}
    </section>
  );
}

EarningsMonthCard.propTypes = {
  heading: PropTypes.string.isRequired,
  figures: PropTypes.arrayOf(
    PropTypes.shape({
      key: PropTypes.string.isRequired,
      label: PropTypes.string.isRequired,
      value: PropTypes.number.isRequired,
      dot: PropTypes.oneOf(['solid', 'hollow', 'none']).isRequired,
    }),
  ).isRequired,
  // Values are formatted strings (a stay count, an average), so nothing here
  // can assume they are numbers.
  breakdown: PropTypes.arrayOf(
    PropTypes.shape({
      label: PropTypes.string.isRequired,
      value: PropTypes.string.isRequired,
    }),
  ).isRequired,
};
