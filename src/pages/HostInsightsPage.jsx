import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Button } from 'flowbite-react';
import { ChevronDown, ChevronRight, Filter, MessageCircleMore, Star } from 'lucide-react';
import apiClient from '../api/client.js';

// Host insights, laid out like the reference screen: a listing selector, the
// overall rating with a score bar per category, and the reviews themselves.
// Everything is computed from the host's own listings by the API, so a hidden
// review never counts here either.

const CARD = 'rounded-xl border border-border bg-elevated shadow-sm';
const PANEL_HEAD = 'text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600';

const TABS = [
  { key: 'reviews', label: 'Reviews' },
  { key: 'ratings', label: 'Ratings' },
];

const SUBSCORE_LABELS = [
  { key: 'cleanliness', label: 'Cleanliness' },
  { key: 'location', label: 'Location' },
  { key: 'value', label: 'Value' },
];

function reviewCount(count) {
  return `${count} ${count === 1 ? 'review' : 'reviews'}`;
}

function starsOf(rating) {
  return <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
    {[1, 2, 3, 4, 5].map((star) => <Star
      key={star}
      className={`h-3.5 w-3.5 ${star <= Math.round(rating) ? 'text-navy' : 'text-border'}`}
      fill="currentColor"
      strokeWidth={0}
      aria-hidden="true"
    />)}
  </span>;
}

function formatDate(iso) {
  if (!iso) return '';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}

function ScoreBar({ label, score, reasons }) {
  const percent = score == null ? 0 : Math.max(0, Math.min(100, (score / 5) * 100));
  return <div className="py-3">
    <div className="flex items-baseline justify-between gap-3">
      <h3 className="text-sm font-semibold text-navy">{label}</h3>
      <span className="inline-flex items-center gap-1 text-sm font-semibold tabular-nums text-navy">
        <Star className="h-3.5 w-3.5" fill="currentColor" strokeWidth={0} aria-hidden="true" />
        {score == null ? '-' : score.toFixed(2)}
      </span>
    </div>
    <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-surface" role="img" aria-label={score == null ? `${label}: not rated yet` : `${label}: ${score.toFixed(2)} out of 5`}>
      <span className="block h-full rounded-full bg-primary" style={{ width: `${percent}%` }} />
    </div>
    {reasons && score != null && <ul className="mt-2 grid grid-cols-1 gap-x-6 gap-y-1 sm:grid-cols-2">
      {reasons.map((reason) => <li key={reason} className="flex items-center gap-1.5 text-xs text-muted">
        <ChevronRight className="h-3 w-3 shrink-0" strokeWidth={2} aria-hidden="true" />
        {reason}
      </li>)}
    </ul>}
  </div>;
}

ScoreBar.propTypes = {
  label: PropTypes.string.isRequired,
  score: PropTypes.number,
  reasons: PropTypes.arrayOf(PropTypes.string),
};

function ReviewRow({ review }) {
  return <article className="border-b border-border py-3 last:border-b-0">
    <div className="flex items-start gap-3">
      <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-[11px] font-bold text-white">
        {review.guestAvatar
          ? <img src={review.guestAvatar} alt="" className="h-full w-full object-cover" />
          : (review.guestName || 'G').slice(0, 1).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3">
          <strong className="truncate text-sm font-semibold text-navy">{review.guestName}</strong>
          <span className="text-[11px] text-muted">{formatDate(review.createdAt)}</span>
        </div>
        <div className="mt-0.5 flex items-center gap-2">
          {starsOf(review.rating)}
          <span className="truncate text-[11px] text-muted">{review.propertyTitle}</span>
        </div>
        {review.comment && <p className="mt-1.5 text-sm leading-relaxed text-charcoal">{review.comment}</p>}
      </div>
    </div>
  </article>;
}

ReviewRow.propTypes = {
  review: PropTypes.shape({
    id: PropTypes.string.isRequired,
    rating: PropTypes.number.isRequired,
    comment: PropTypes.string,
    createdAt: PropTypes.string,
    guestName: PropTypes.string,
    guestAvatar: PropTypes.string,
    propertyTitle: PropTypes.string,
  }).isRequired,
};

function ListingSelector({ listings, value, onChange, counts }) {
  return <div className="relative">
    <label className="sr-only" htmlFor="insights-listing">Listing</label>
    <select
      id="insights-listing"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="w-full appearance-none rounded-xl border border-border bg-elevated py-3 pl-4 pr-10 text-left text-sm font-semibold text-navy focus:border-primary focus:outline-none focus:ring-0"
    >
      <option value="all">All listings ({listings.length})</option>
      {listings.map((listing) => <option key={listing.id} value={listing.id}>
        {listing.title}{counts[listing.id] ? ` (${counts[listing.id]} reviews)` : ''}
      </option>)}
    </select>
    <ChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" strokeWidth={2} aria-hidden="true" />
  </div>;
}

ListingSelector.propTypes = {
  listings: PropTypes.arrayOf(PropTypes.object).isRequired,
  value: PropTypes.string.isRequired,
  onChange: PropTypes.func.isRequired,
  counts: PropTypes.objectOf(PropTypes.number).isRequired,
};

export default function HostInsightsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('reviews');
  const [listing, setListing] = useState('all');
  const [reviewsOnlyWithText, setReviewsOnlyWithText] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get('/reviews/host', { params: { limit: 50 } });
      setData(response.data.data);
    } catch {
      setError('Could not load your insights. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const listings = data?.listings || [];
  const allReviews = useMemo(() => data?.recent || [], [data]);

  const counts = useMemo(() => {
    const tally = {};
    for (const review of allReviews) tally[review.propertyId] = (tally[review.propertyId] || 0) + 1;
    return tally;
  }, [allReviews]);

  const visibleReviews = useMemo(() => allReviews.filter((review) => {
    if (listing !== 'all' && review.propertyId !== listing) return false;
    if (reviewsOnlyWithText && !review.comment) return false;
    return true;
  }), [allReviews, listing, reviewsOnlyWithText]);

  // One listing scopes the score bars to that stay; "all listings" uses the host
  // aggregate the API already computed.
  const summary = useMemo(() => {
    if (listing === 'all') return data?.overall || null;
    const own = data?.perListing?.find((entry) => entry.id === listing);
    if (!own) return null;
    return {
      averageRating: own.averageRating || 0,
      totalReviews: own.totalReviews,
      subScores: own.subScores,
    };
  }, [data, listing]);

  if (loading) {
    return <div className="space-y-3" aria-label="Loading insights">
      <span className="block h-16 animate-pulse rounded-xl bg-surface" />
      <span className="block h-48 animate-pulse rounded-xl bg-surface" />
      <span className="block h-32 animate-pulse rounded-xl bg-surface" />
    </div>;
  }

  if (error) {
    return <div className={`${CARD} px-5 py-12 text-center`}>
      <p className="text-sm text-muted">{error}</p>
      <Button className="mx-auto mt-4 w-fit" size="sm" onClick={load}>Try again</Button>
    </div>;
  }

  return <div className="space-y-4">
    <header>
      <p className={PANEL_HEAD}>HOST WORKSPACE</p>
      <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Insights</h1>
      <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">What guests say about your stays, and what still needs a reply.</p>
    </header>

    <div className="flex flex-wrap items-center gap-1 border-b border-border" role="tablist" aria-label="Insights views">
      {TABS.map((item) => <button
        key={item.key}
        type="button"
        role="tab"
        aria-selected={tab === item.key}
        onClick={() => setTab(item.key)}
        className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold transition-colors ${tab === item.key ? 'border-navy text-navy' : 'border-transparent text-muted hover:text-navy'}`}
      >
        {item.label}
      </button>)}
    </div>

    <ListingSelector listings={listings} value={listing} onChange={setListing} counts={counts} />

    {listings.length === 0 ? <div className={`${CARD} px-5 py-12 text-center`}>
      <p className="text-sm text-muted">Add a listing and host a stay before there is anything to review.</p>
      <Button as={Link} to="/host/properties/new" className="mx-auto mt-4 w-fit" size="sm">Create a listing</Button>
    </div> : tab === 'ratings' ? <section className={`${CARD} p-4`} aria-label="Rating breakdown">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-navy">Rating breakdown</h2>
        <span className="text-xs text-muted">{reviewCount(summary?.totalReviews || 0)}</span>
      </div>
      <div className="mt-2 divide-y divide-border">
        {SUBSCORE_LABELS.map((entry) => <ScoreBar
          key={entry.key}
          label={entry.label}
          score={summary?.subScores?.[entry.key] ?? null}
        />)}
      </div>
      <div className="mt-3 rounded-xl border border-border p-3">
        <div className="flex items-center justify-between gap-3">
          <span className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy">
            <Star className="h-4 w-4" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            {summary?.averageRating ? summary.averageRating.toFixed(2) : '-'} overall rating
          </span>
          <span className="text-[11px] text-muted">{reviewCount(summary?.totalReviews || 0)}</span>
        </div>
        {(data?.overall?.distribution || []).map((row) => <div key={row.stars} className="mt-1.5 flex items-center gap-2 text-[11px] text-muted">
          <span className="w-3 shrink-0 tabular-nums">{row.stars}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-surface">
            <span
              className="block h-full rounded-full bg-primary"
              style={{ width: `${data?.overall?.totalReviews ? (row.count / data.overall.totalReviews) * 100 : 0}%` }}
            />
          </span>
          <span className="w-5 shrink-0 text-right tabular-nums">{row.count}</span>
        </div>)}
      </div>
    </section> : <section className={`${CARD} p-4`} aria-label="Reviews">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 text-sm font-semibold text-navy">
            <Star className="h-4 w-4" fill="currentColor" strokeWidth={0} aria-hidden="true" />
            {summary?.averageRating ? summary.averageRating.toFixed(2) : '-'} overall rating
          </h2>
          <p className="text-xs text-muted">{reviewCount(summary?.totalReviews || 0)}</p>
        </div>
        <Button
          color="light"
          size="xs"
          onClick={() => setReviewsOnlyWithText((value) => !value)}
          aria-pressed={reviewsOnlyWithText}
        >
          <Filter className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          {reviewsOnlyWithText ? 'Written only' : 'All reviews'}
        </Button>
      </div>

      {visibleReviews.length === 0
        ? <p className="py-8 text-center text-sm text-muted">No reviews yet. They appear here after a guest checks out and reviews their stay.</p>
        : <div className="mt-2">{visibleReviews.map((review) => <ReviewRow key={review.id} review={review} />)}</div>}
    </section>}

    {data?.followUps?.reviewsToAskFor > 0 && <Alert color="info">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1 text-xs leading-relaxed">
          {data.followUps.reviewsToAskFor} {data.followUps.reviewsToAskFor === 1 ? 'stay has' : 'stays have'} finished without a review.
        </p>
        <Button as={Link} to="/host/inbox" size="xs" color="light">
          <MessageCircleMore className="mr-1.5 h-3.5 w-3.5" strokeWidth={1.8} aria-hidden="true" />
          Open messages
        </Button>
      </div>
    </Alert>}
  </div>;
}
