import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';
import { BarChart3, CalendarCheck, CalendarClock, FileText, Settings } from 'lucide-react';

/**
 * The left-hand menu of the host Earnings page.
 *
 * The four views of one page (how the money is doing, what is coming, what has
 * landed, and the paperwork) are sections of the same screen, not separate
 * destinations. Only the settings row leaves the page, so it sits behind a
 * divider: mixing a link into a list of section buttons would suggest the other
 * rows change the URL too.
 */
// The section table lives beside the menu because the page needs the same keys
// to decide what to render; keeping it here means the two can never disagree.
// Exported alongside the component for that reason, as CancelBookingDialog does.
// eslint-disable-next-line react-refresh/only-export-components
export const EARNINGS_SECTIONS = [
  { key: 'performance', label: 'Performance', Icon: BarChart3 },
  { key: 'upcoming', label: 'Upcoming', Icon: CalendarClock },
  { key: 'paid', label: 'Paid', Icon: CalendarCheck },
  { key: 'reports', label: 'Reports', Icon: FileText },
];

// One row shape, worn by the section buttons and the settings link alike, so
// the two never drift apart. Wide rows on a desktop column; a compact pill on a
// phone, where the strip scrolls sideways instead of pushing the earnings down.
const ROW =
  'flex shrink-0 items-center gap-3 whitespace-nowrap text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary rounded-full px-3 py-2 lg:w-full lg:shrink lg:rounded-2xl lg:px-4 lg:py-3';

const SELECTED = 'bg-surface font-semibold text-navy';
const UNSELECTED = 'text-charcoal hover:bg-surface';

function rowClass(isActive) {
  return `${ROW} ${isActive ? SELECTED : UNSELECTED}`;
}

export default function EarningsSideNav({ activeKey, onSelect, settingsTo = '/host/payouts' }) {
  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-navy">Earnings</h1>

      {/* One nav for both layouts rather than two: a duplicated phone copy would
          put every section in the accessibility tree twice. The phone strip wraps
          instead of scrolling sideways: Reports sat entirely off the right edge
          with nothing on screen to say the row continued. */}
      <nav
        aria-label="Earnings sections"
        className="mt-6 flex flex-wrap gap-1 lg:flex-col lg:gap-1"
      >
        {EARNINGS_SECTIONS.map(({ key, label, Icon }) => {
          const isActive = key === activeKey;
          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-current={isActive ? 'true' : undefined}
              aria-pressed={isActive}
              className={rowClass(isActive)}
            >
              <Icon
                className={`h-5 w-5 shrink-0 ${isActive ? 'text-navy' : 'text-muted'}`}
                strokeWidth={1.8}
                aria-hidden="true"
              />
              {label}
            </button>
          );
        })}
      </nav>

      <div className="mt-2 border-t border-border pt-2 lg:my-5 lg:pt-0">
        <Link to={settingsTo} className={rowClass(false)}>
          <Settings className="h-5 w-5 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
          Settings and documents
        </Link>
      </div>
    </div>
  );
}

EarningsSideNav.propTypes = {
  // Required, not optional: an empty string would silently render a menu with
  // nothing selected, which reads as "this page has no current view".
  activeKey: PropTypes.oneOf(EARNINGS_SECTIONS.map((section) => section.key)).isRequired,
  onSelect: PropTypes.func.isRequired,
  settingsTo: PropTypes.string,
};
