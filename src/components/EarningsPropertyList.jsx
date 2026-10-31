import PropTypes from 'prop-types';
import { Link } from 'react-router-dom';

/**
 * Per-property money rows for the host earnings page.
 *
 * The same list appears twice there: money still to come and money already
 * paid. Both times it sits inside a panel that already carries a title, so this
 * renders rows and nothing else. A heading or a card edge of its own would nest
 * one panel inside another and read as a second, unrelated section.
 */

// One template for the heading and the rows. The money columns only line up
// while both grids are identical, so the template lives here instead of at each
// call site, where the two copies could drift apart.
const COLUMNS = 'md:grid-cols-[minmax(0,1fr)_4.5rem_7.5rem]';

const HEADING = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-muted';

function formatMoney(value) {
  return `KES ${Math.round(value || 0).toLocaleString('en-KE')}`;
}

export default function EarningsPropertyList({ rows, amountLabel, emptyTitle, emptyBody, emptyAction }) {
  // Guarded rather than trusted: the page renders this while its figures are
  // still arriving, and a list that has not landed yet must not take the panel
  // down with it.
  if (!rows?.length) {
    return (
      <div className="flex flex-col items-center gap-2 px-4 py-12 text-center">
        <strong className="text-sm font-semibold text-navy">{emptyTitle}</strong>
        <p className="max-w-sm text-xs leading-relaxed text-muted">{emptyBody}</p>
        {emptyAction}
      </div>
    );
  }

  return (
    <>
      {/* A column heading only means something once there are columns beneath
          it. On a phone the row collapses to a stacked cell, so the heading is
          dropped there and the amount carries its own label instead. */}
      <div className={`hidden gap-x-4 border-b border-border px-4 py-2 md:grid ${COLUMNS}`}>
        <span className={HEADING}>Property</span>
        <span className={`${HEADING} text-right`}>Stays</span>
        <span className={`${HEADING} text-right`}>{amountLabel}</span>
      </div>

      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.id}
            // Two columns on a phone, so the count and the money share one line
            // under the title with the money on the right. From md up it is the
            // same three columns as the heading.
            className={`grid grid-cols-[auto_minmax(0,1fr)] items-center gap-x-3 gap-y-1.5 px-4 py-3.5 md:gap-x-4 ${COLUMNS}`}
          >
            <div className="col-span-2 flex min-w-0 items-center gap-3 md:col-span-1">
              <span className="h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-surface">
                {row.image ? (
                  <img src={row.image} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs font-semibold text-muted">
                    {(row.title || '').slice(0, 2).toUpperCase()}
                  </span>
                )}
              </span>
              <span className="min-w-0">
                <Link to={`/host/listings/${row.id}/preview`} className="block truncate text-sm font-semibold text-navy hover:underline">
                  {row.title}
                </Link>
                <span className="block truncate text-xs text-muted">{row.location || 'Nairobi'}</span>
              </span>
            </div>

            <span className="text-xs tabular-nums text-muted md:text-right">{row.bookings || 0}</span>

            {/* Right aligned at every width: on a phone this cell is the right
                hand column, so the figure never needs a sideways scroll. The
                label carries the column's meaning where the heading row is
                gone, and it yields first if the two ever compete for space. */}
            <span className="flex items-baseline justify-end gap-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wide text-muted md:hidden">
                {amountLabel}
              </span>
              <span className="whitespace-nowrap text-sm font-semibold tabular-nums text-navy">{formatMoney(row.amount)}</span>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}

EarningsPropertyList.propTypes = {
  rows: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      location: PropTypes.string,
      // Nullable on purpose: a listing without a photo falls back to initials.
      image: PropTypes.string,
      bookings: PropTypes.number,
      amount: PropTypes.number,
    }),
  ).isRequired,
  amountLabel: PropTypes.string.isRequired,
  emptyTitle: PropTypes.string.isRequired,
  emptyBody: PropTypes.string.isRequired,
  emptyAction: PropTypes.node,
};
