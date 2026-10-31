import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Badge, Button, ToggleSwitch } from 'flowbite-react';
import PropTypes from 'prop-types';
import { Building2, LayoutGrid, List } from 'lucide-react';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { firstImage } from '../utils/images.js';

const STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'draft' },
  PENDING_REVIEW: { label: 'In review', tone: 'review' },
  PUBLISHED: { label: 'Published', tone: 'published' },
  REJECTED: { label: 'Needs changes', tone: 'attention' },
  SUSPENDED: { label: 'Suspended', tone: 'suspended' },
};

// The tone vocabulary is presentation-only; the Badge palette names its colours
// differently, so the mapping lives here instead of on each call site.
const STATUS_BADGE_COLOR = {
  draft: 'gray',
  review: 'info',
  published: 'success',
  attention: 'warning',
  suspended: 'failure',
};

const FILTERS = [
  { key: 'ALL', label: 'All stays', matches: () => true },
  { key: 'PUBLISHED', label: 'Published', matches: (property) => property.status === 'PUBLISHED' },
  { key: 'DRAFT', label: 'Draft', matches: (property) => property.status === 'DRAFT' },
  { key: 'PENDING_REVIEW', label: 'In review', matches: (property) => property.status === 'PENDING_REVIEW' },
  {
    key: 'ATTENTION',
    label: 'Needs attention',
    matches: (property) => ['REJECTED', 'SUSPENDED'].includes(property.status),
  },
];

function propertyStatus(property) {
  return STATUS_META[property.status] || STATUS_META.DRAFT;
}

function bedSummary(property) {
  const hasOneBed = property.price1Bed != null;
  const hasTwoBeds = property.price2Bed != null;
  if (hasOneBed && hasTwoBeds) return '1 & 2 beds';
  if (hasOneBed) return '1 bed';
  if (hasTwoBeds) return '2 beds';
  return `${property.bedrooms || 1} ${property.bedrooms === 1 ? 'bed' : 'beds'}`;
}

function statusCopy(property) {
  if (property.status === 'PUBLISHED') return 'Visible to guests and open for bookings.';
  if (property.status === 'PENDING_REVIEW') return 'Submitted for review. Your changes remain private until approved.';
  if (property.status === 'REJECTED') return property.listingReviewNote || 'Update the requested details before submitting again.';
  if (property.status === 'SUSPENDED') return property.listingReviewNote || 'This listing is hidden from guests while it is suspended.';
  return 'Complete the details, photos, and pricing before submitting.';
}

// Completeness checks mirror what guests look for on Airbnb/Booking.com listings; each is worth equal points.
function listingQuality(property) {
  const checks = [
    { ok: (property.images?.length || 0) >= 5, tip: `Add ${Math.max(5 - (property.images?.length || 0), 1)} more photo(s) (aim for 5+)` },
    { ok: (property.description?.length || 0) >= 200, tip: 'Write a longer description (200+ characters)' },
    { ok: (property.amenities?.length || 0) >= 6, tip: 'List more amenities (6+)' },
    { ok: property.lat != null && property.lng != null, tip: 'Pin the exact location on the map' },
    { ok: Boolean(property.address), tip: 'Confirm the street address' },
  ];
  const done = checks.filter((check) => check.ok).length;
  return { score: Math.round((done / checks.length) * 100), tips: checks.filter((check) => !check.ok).map((check) => check.tip) };
}

function ListingSkeleton() {
  return <div className="space-y-3" aria-label="Loading listings">
    <span className="block h-24 animate-pulse rounded-xl border border-border bg-surface" />
    <span className="block h-24 animate-pulse rounded-xl border border-border bg-surface" />
    <span className="block h-24 animate-pulse rounded-xl border border-border bg-surface" />
  </div>;
}

function HostListingCard({ property, onToggleAvailability, onDelete, onReview, busy }) {
  const image = firstImage(property);
  const status = propertyStatus(property);
  const canSubmit = ['DRAFT', 'REJECTED'].includes(property.status);
  const quality = listingQuality(property);

  return <article className="flex flex-col overflow-hidden rounded-xl border border-border bg-elevated shadow-sm">
    <div className="relative aspect-[4/3] w-full overflow-hidden bg-surface">
      {image ? <img src={image} alt="" className="aspect-[4/3] w-full object-cover" /> : <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>}
      <Badge color={STATUS_BADGE_COLOR[status.tone] || 'gray'} className="absolute left-3 top-3">{status.label}</Badge>
    </div>
    <div className="flex flex-1 flex-col gap-4 p-5">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-navy"><Link to={`/property/${property.id}`} className="hover:text-primary-600">{property.title}</Link></h2>
          <p className="mt-1 text-xs text-muted">{bedSummary(property)} · {property.neighborhood || property.location || 'Nairobi'}</p>
        </div>
        <strong className="whitespace-nowrap text-lg font-bold text-navy">KES {(property.price || 0).toLocaleString()}<small className="text-xs font-medium text-muted">/night</small></strong>
      </header>
      <p className="rounded-xl bg-surface px-3 py-2 text-xs leading-relaxed text-muted">{statusCopy(property)}</p>
      <div className="rounded-xl border border-border p-3">
        <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted"><span>Listing quality</span><strong className="text-navy">{quality.score}%</strong></div>
        <div
          className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-border"
          role="progressbar"
          aria-valuenow={quality.score}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={`Listing quality ${quality.score} percent`}
        >
          {/* Computed fill width: data-driven, so it stays an inline style. */}
          <div className="h-full rounded-full bg-primary" style={{ width: `${quality.score}%` }} />
        </div>
        {quality.tips.length > 0 && <ul className="mt-2 space-y-1 text-xs text-muted">{quality.tips.slice(0, 2).map((tip) => <li key={tip}>{tip}</li>)}</ul>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <Button as={Link} to={`/host/properties/${property.id}/edit`} size="sm">
          {property.status === 'DRAFT' ? 'Continue setup' : 'Edit listing'}
        </Button>
        {canSubmit && <Button type="button" color="light" size="sm" disabled={busy} onClick={() => onReview(property)}>
          {busy ? 'Submitting...' : 'Submit for review'}
        </Button>}
        {property.status === 'PENDING_REVIEW' && <span className="text-xs font-medium text-muted">Awaiting review</span>}
        {property.status === 'PUBLISHED' && <Button as={Link} to={`/property/${property.id}`} color="light" size="sm">View listing</Button>}
        <Button as={Link} to={`/host/calendar/${property.id}`} color="light" size="sm">Calendar</Button>
      </div>
      <footer className="mt-auto flex items-center justify-between gap-3 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={Boolean(property.available)}
            onChange={() => onToggleAvailability(property)}
            disabled={busy}
            aria-label={`${property.title} availability`}
          />
          <span className="text-xs text-muted">{property.available ? 'Accepting bookings' : 'Not accepting bookings'}</span>
        </div>
        <Button type="button" color="light" size="sm" disabled={busy} onClick={() => onDelete(property)}>
          {busy ? 'Working...' : 'Delete'}
        </Button>
      </footer>
    </div>
  </article>;
}

HostListingCard.propTypes = {
  property: PropTypes.shape({
    id: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    location: PropTypes.string,
    neighborhood: PropTypes.string,
    status: PropTypes.string,
    available: PropTypes.bool,
    price: PropTypes.number,
    bedrooms: PropTypes.number,
    price1Bed: PropTypes.number,
    price2Bed: PropTypes.number,
    listingReviewNote: PropTypes.string,
  }).isRequired,
  onToggleAvailability: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onReview: PropTypes.func.isRequired,
  busy: PropTypes.bool.isRequired,
};

function HostListingRow({ property, onToggleAvailability, onDelete, onReview, busy }) {
  const image = firstImage(property);
  const status = propertyStatus(property);
  const canSubmit = ['DRAFT', 'REJECTED'].includes(property.status);

  return <article className="flex flex-col gap-3 rounded-xl border border-border bg-elevated p-3 shadow-sm sm:flex-row sm:items-center">
    <span className="h-16 w-full shrink-0 overflow-hidden rounded-lg bg-surface sm:h-14 sm:w-20">
      {image
        ? <img src={image} alt="" className="h-full w-full object-cover" />
        : <span className="grid h-full w-full place-items-center text-[10px] text-muted">No photo</span>}
    </span>

    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="truncate text-sm font-semibold text-navy">
          <Link to={`/property/${property.id}`} className="hover:text-primary-600">{property.title}</Link>
        </h2>
        <span className="inline-flex items-center gap-1 rounded-full border border-border px-2 py-0.5 text-[10px] font-semibold text-muted">
          <span className={`h-1.5 w-1.5 rounded-full ${property.status === 'PUBLISHED' ? 'bg-emerald-500' : property.status === 'PENDING_REVIEW' ? 'bg-amber-500' : property.status === 'SUSPENDED' || property.status === 'REJECTED' ? 'bg-red-500' : 'bg-slate-400'}`} aria-hidden="true" />
          {status.label}
        </span>
        {!property.available && <span className="text-[10px] font-semibold text-muted">Not accepting bookings</span>}
      </div>
      <p className="mt-0.5 truncate text-xs text-muted">{bedSummary(property)} · {property.neighborhood || property.location || 'Nairobi'}</p>
    </div>

    <div className="flex shrink-0 flex-wrap items-center gap-2">
      <strong className="whitespace-nowrap text-sm font-bold tabular-nums text-navy">KES {(property.price || 0).toLocaleString()}<small className="text-[10px] font-medium text-muted">/night</small></strong>
      <ToggleSwitch
        checked={Boolean(property.available)}
        onChange={() => onToggleAvailability(property)}
        disabled={busy}
        aria-label={`${property.title} availability`}
      />
      <Button as={Link} to={`/host/properties/${property.id}/edit`} size="xs">
        {property.status === 'DRAFT' ? 'Continue setup' : 'Edit'}
      </Button>
      {canSubmit && <Button type="button" color="light" size="xs" disabled={busy} onClick={() => onReview(property)}>Submit</Button>}
      <Button as={Link} to={`/host/calendar/${property.id}`} color="light" size="xs">Calendar</Button>
      <Button type="button" color="light" size="xs" disabled={busy} onClick={() => onDelete(property)}>Delete</Button>
    </div>
  </article>;
}

HostListingRow.propTypes = HostListingCard.propTypes;

export default function HostListingsPage() {
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);
  // Remembered so a host who prefers rows does not re-pick it on every visit.
  const [view, setView] = useState(() => {
    try {
      return window.localStorage.getItem('zuri:host-listings-view') === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem('zuri:host-listings-view', view);
    } catch {
      // A blocked storage read is not worth failing the page over.
    }
  }, [view]);

  useEffect(() => {
    let active = true;
    async function loadProperties() {
      try {
        const response = await apiClient.get('/properties/mine?limit=100');
        if (active) setProperties(response.data.data || []);
      } catch {
        if (active) setError('Could not load your listings. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadProperties();
    return () => { active = false; };
  }, []);

  const counts = useMemo(() => Object.fromEntries(FILTERS.map((item) => [item.key, properties.filter(item.matches).length])), [properties]);
  const visibleProperties = useMemo(() => {
    const activeFilter = FILTERS.find((item) => item.key === filter) || FILTERS[0];
    return properties.filter(activeFilter.matches);
  }, [filter, properties]);

  async function handleToggleAvailability(property) {
    setBusyId(property.id);
    try {
      await apiClient.put(`/properties/${property.id}`, { available: !property.available });
      setProperties((current) => current.map((item) => item.id === property.id ? { ...item, available: !item.available } : item));
      toast.success(property.available ? 'Listing is no longer accepting bookings.' : 'Listing is now accepting bookings.');
    } catch {
      toast.error('Could not update listing availability.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleSubmitForReview(property) {
    setBusyId(property.id);
    try {
      const response = await apiClient.post(`/properties/${property.id}/submit`);
      setProperties((current) => current.map((item) => item.id === property.id ? response.data.data : item));
      toast.success('Listing submitted for review.');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Could not submit this listing for review.');
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(property) {
    if (!window.confirm(`Delete “${property.title}”? This cannot be undone.`)) return;
    setBusyId(property.id);
    try {
      await apiClient.delete(`/properties/${property.id}`);
      setProperties((current) => current.filter((item) => item.id !== property.id));
      toast.success('Listing deleted.');
    } catch {
      toast.error('Could not delete this listing.');
    } finally {
      setBusyId(null);
    }
  }

  return <div className="space-y-6">
    <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">HOST WORKSPACE</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Your listings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Prepare, publish, and manage your stays.</p>
      </div>
      <div className="flex items-center gap-2">
        <div className="inline-flex rounded-full border border-border bg-elevated p-1" role="group" aria-label="Listing view">
          {[['grid', LayoutGrid, 'Grid view'], ['list', List, 'List view']].map(([key, Icon, label]) => <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-pressed={view === key}
            aria-label={label}
            className={`grid h-7 w-7 place-items-center rounded-full transition-colors ${view === key ? 'bg-navy-bg text-white' : 'text-muted hover:text-navy'}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
          </button>)}
        </div>
        <Button as={Link} to="/host/properties/new" size="sm">+ Add a listing</Button>
      </div>
    </header>

    <div className="inline-flex flex-wrap gap-1 rounded-full border border-border bg-elevated p-1" role="group" aria-label="Listing status">
      {FILTERS.map((item) => <button
        key={item.key}
        type="button"
        aria-pressed={filter === item.key}
        onClick={() => setFilter(item.key)}
        className={`h-8 rounded-full px-4 text-sm font-semibold transition-colors ${filter === item.key ? 'bg-navy-bg text-white' : 'text-muted hover:text-navy'}`}
      >{item.label} · {counts[item.key] || 0}</button>)}
    </div>

    {error && <Alert color="failure">
      <p>{error}</p>
      <div><Button type="button" color="light" size="sm" onClick={() => window.location.reload()}>Try again</Button></div>
    </Alert>}
    {loading ? <ListingSkeleton /> : !error && visibleProperties.length === 0 ? <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-border bg-elevated px-5 py-12 text-center">
      <span className="text-primary-600"><Building2 strokeWidth={1.6} aria-hidden="true" /></span>
      <strong className="text-base font-semibold text-navy">{properties.length === 0 ? 'No listings yet' : 'Nothing in this view'}</strong>
      <p className="max-w-md text-sm leading-relaxed text-muted">{properties.length === 0 ? 'Create your first stay and start preparing it for guests.' : 'Try another status filter to see your listings.'}</p>
      {properties.length === 0 ? <Button as={Link} to="/host/properties/new" size="sm">Add a listing</Button> : <Button type="button" color="light" size="sm" onClick={() => setFilter('ALL')}>Show all stays</Button>}
    </div> : view === 'list' ? <div className="space-y-2">
      {visibleProperties.map((property) => <HostListingRow key={property.id} property={property} busy={busyId === property.id} onToggleAvailability={handleToggleAvailability} onDelete={handleDelete} onReview={handleSubmitForReview} />)}
    </div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleProperties.map((property) => <HostListingCard key={property.id} property={property} busy={busyId === property.id} onToggleAvailability={handleToggleAvailability} onDelete={handleDelete} onReview={handleSubmitForReview} />)}
    </div>}
  </div>;
}
