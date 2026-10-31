import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Button } from 'flowbite-react';

// The reference puts follow-ups directly on the day view: what a host owes a
// guest, and what a guest owes them, each with a face and a stay. They come from
// the same insights endpoint as the Insights page, so the two never disagree.
const CARD = 'rounded-xl border border-border bg-elevated p-5 shadow-sm';
const EYEBROW = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';

function headline(item) {
  if (item.kind === 'read-review') return `Read ${item.guestName}'s ${item.rating}-star review`;
  if (item.kind === 'ask-for-review') return `Ask ${item.guestName} for a review`;
  return `Respond to ${item.guestName}`;
}

function kicker(item) {
  if (item.kind === 'read-review') return 'Review received';
  if (item.kind === 'ask-for-review') {
    if (item.daysSince == null) return 'Stay finished';
    return item.daysSince === 0 ? 'Checked out today' : `${item.daysSince}d since checkout`;
  }
  return 'Booking request';
}

export default function HostFollowUps({ items, loading }) {
  if (loading) {
    return <section className={CARD}>
      <span className={`block ${EYEBROW}`}>FOLLOW-UPS</span>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <span className="block h-20 animate-pulse rounded-xl bg-surface" />
        <span className="block h-20 animate-pulse rounded-xl bg-surface" />
      </div>
    </section>;
  }

  // Nothing to chase today: the section disappears rather than showing an empty
  // box on a page that already has three panels.
  if (items.length === 0) return null;

  return <section className={CARD}>
    <header className="flex flex-wrap items-end justify-between gap-2">
      <div>
        <span className={`block ${EYEBROW}`}>FOLLOW-UPS</span>
        <h2 className="mt-1 text-base font-semibold text-navy">Your follow-ups</h2>
      </div>
      <Button as={Link} to="/host/insights" color="light" size="sm">See insights</Button>
    </header>

    <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
      {items.slice(0, 4).map((item) => <article key={`${item.kind}-${item.id}`} className="flex items-start justify-between gap-3 rounded-xl border border-border p-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold text-muted">{kicker(item)}</p>
          <strong className="mt-0.5 block text-sm font-semibold leading-snug text-navy">{headline(item)}</strong>
          <p className="mt-1 truncate text-xs text-muted">{item.propertyTitle}</p>
        </div>
        <span className="grid h-10 w-10 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-[11px] font-bold text-white">
          {item.guestAvatar
            ? <img src={item.guestAvatar} alt="" className="h-full w-full object-cover" />
            : (item.guestName || 'G').slice(0, 1).toUpperCase()}
        </span>
      </article>)}
    </div>

    <Link to="/host/reservations" className="mx-auto mt-3 block w-fit text-xs font-semibold text-navy underline-offset-2 hover:underline">See all reservations</Link>
  </section>;
}

HostFollowUps.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    kind: PropTypes.string.isRequired,
    id: PropTypes.string.isRequired,
    guestName: PropTypes.string,
    guestAvatar: PropTypes.string,
    propertyTitle: PropTypes.string,
    rating: PropTypes.number,
    daysSince: PropTypes.number,
  })).isRequired,
  loading: PropTypes.bool.isRequired,
};
