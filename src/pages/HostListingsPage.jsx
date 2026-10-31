import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { Alert, Button, ToggleSwitch } from 'flowbite-react';
import PropTypes from 'prop-types';
import { Building2, Lightbulb, LayoutGrid, List as ListIcon, Plus } from 'lucide-react';
import apiClient from '../api/client.js';
import { useToast } from '../context/ToastContext.jsx';
import { firstImage } from '../utils/images.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
import SelectMenu from '../components/SelectMenu.jsx';

const STATUS_META = {
  DRAFT: { label: 'Draft', tone: 'draft' },
  PENDING_REVIEW: { label: 'In review', tone: 'review' },
  PUBLISHED: { label: 'Published', tone: 'published' },
  REJECTED: { label: 'Needs changes', tone: 'attention' },
  SUSPENDED: { label: 'Suspended', tone: 'suspended' },
};

// Soft tinted pills rather than Flowbite's solid Badge colours: the status is a
// quiet label over a photo, not a call to action competing with the buttons.
const STATUS_PILL = {
  draft: 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-200',
  review: 'bg-blue-100 text-blue-800 dark:bg-blue-500/15 dark:text-blue-200',
  published: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200',
  attention: 'bg-amber-100 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200',
  suspended: 'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-200',
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

const PILL_GROUP = 'inline-flex rounded-full border border-border bg-elevated p-0.5';
const PILL_SELECTED = 'bg-navy-bg text-white';
const PILL_IDLE = 'text-muted hover:text-navy';

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

function where(property) {
  return property.neighborhood || property.location || 'Nairobi';
}

function statusCopy(property) {
  if (property.status === 'PUBLISHED') return 'Visible to guests and open for bookings.';
  if (property.status === 'PENDING_REVIEW') return 'Submitted for review. Your changes stay private until approved.';
  if (property.status === 'REJECTED') return property.listingReviewNote || 'Update the requested details before submitting again.';
  if (property.status === 'SUSPENDED') return property.listingReviewNote || 'Hidden from guests while it is suspended.';
  return 'Add the details, photos, and pricing, then submit for review.';
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

function StatusPill({ tone, children }) {
  return <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS_PILL[tone] || STATUS_PILL.draft}`}>
    <span className="h-1.5 w-1.5 rounded-full bg-current" aria-hidden="true" />
    {children}
  </span>;
}

StatusPill.propTypes = {
  tone: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// Placeholder cards rather than placeholder bars: the loading shapes have to
// match what lands, otherwise the page jumps when the request resolves.
function ListingSkeleton() {
  return <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3" aria-label="Loading listings">
    {[0, 1, 2].map((key) => <HostCard key={key} className="h-72 animate-pulse" />)}
  </div>;
}

function QualityMeter({ property }) {
  const quality = listingQuality(property);
  return <div className="rounded-xl bg-surface p-3">
    <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wide text-muted">
      <span>Listing quality</span><strong className="text-navy">{quality.score}%</strong>
    </div>
    <div
      className="mt-2 h-1 w-full overflow-hidden rounded-full bg-border"
      role="progressbar"
      aria-valuenow={quality.score}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={`Listing quality ${quality.score} percent`}
    >
      {/* Computed fill width: data-driven, so it stays an inline style. */}
      <div className="h-full rounded-full bg-primary" style={{ width: `${quality.score}%` }} />
    </div>
    {quality.tips.length > 0 && <ul className="mt-2 space-y-1 text-[11px] leading-relaxed text-muted">
      {quality.tips.slice(0, 2).map((tip) => <li key={tip}>{tip}</li>)}
    </ul>}
  </div>;
}

QualityMeter.propTypes = {
  property: PropTypes.shape({ images: PropTypes.array, description: PropTypes.string, amenities: PropTypes.array, lat: PropTypes.number, lng: PropTypes.number, address: PropTypes.string }).isRequired,
};

// A quiet text action, for the controls that should not compete with the one
// primary button on each card.
function QuietAction({ to, onClick, danger = false, children }) {
  const className = `inline-flex items-center rounded-full px-2.5 py-1.5 text-xs font-semibold transition-colors hover:bg-surface ${danger ? 'text-muted hover:text-red-600' : 'text-muted hover:text-navy'}`;
  return to
    ? <Link to={to} className={className}>{children}</Link>
    : <button type="button" onClick={onClick} className={className}>{children}</button>;
}

QuietAction.propTypes = {
  to: PropTypes.string,
  onClick: PropTypes.func,
  danger: PropTypes.bool,
  children: PropTypes.node.isRequired,
};

function HostListingCard({ property, onToggleAvailability, onDelete, onReview, busy, showTips }) {
  const image = firstImage(property);
  const status = propertyStatus(property);
  const canSubmit = ['DRAFT', 'REJECTED'].includes(property.status);

  return <HostCard className="group h-full transition-shadow hover:shadow-md">
    <div className="relative overflow-hidden rounded-xl bg-surface">
      <div className="aspect-[4/3]">
        {image
          ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" />
          : <div className="flex h-full items-center justify-center text-sm text-muted">No photo yet</div>}
      </div>
      <div className="absolute left-3 top-3"><StatusPill tone={status.tone}>{status.label}</StatusPill></div>
    </div>

    <div className="flex flex-1 flex-col gap-3">
      <div>
        <div className="flex items-start justify-between gap-3">
          <h2 className="text-[15px] font-semibold leading-snug text-navy">
            <Link to={`/property/${property.id}`} className="hover:text-muted">{property.title}</Link>
          </h2>
          <strong className="whitespace-nowrap text-sm font-bold text-navy">
            KES {(property.price || 0).toLocaleString()}<span className="text-[11px] font-medium text-muted"> /night</span>
          </strong>
        </div>
        <p className="mt-1 text-[13px] text-muted">{bedSummary(property)} · {where(property)}</p>
        <p className="mt-2 line-clamp-2 text-[13px] leading-relaxed text-muted">{statusCopy(property)}</p>
      </div>

      {showTips && <QualityMeter property={property} />}

      <div className="mt-auto flex flex-wrap items-center justify-between gap-1 pt-1">
        <Button as={Link} to={`/host/properties/${property.id}/edit`} size="sm" className="rounded-full" disabled={busy}>
          {property.status === 'DRAFT' ? 'Continue setup' : 'Edit listing'}
        </Button>
        <div className="flex flex-wrap items-center gap-0.5">
          {canSubmit && <QuietAction onClick={() => onReview(property)}>{busy ? 'Submitting...' : 'Submit for review'}</QuietAction>}
          {property.status === 'PENDING_REVIEW' && <span className="px-2 text-xs font-medium text-muted">Awaiting review</span>}
          {property.status === 'PUBLISHED' && <QuietAction to={`/property/${property.id}`}>View listing</QuietAction>}
          <QuietAction to={`/host/calendar/${property.id}`}>Calendar</QuietAction>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <div className="flex items-center gap-2">
          <ToggleSwitch
            checked={Boolean(property.available)}
            onChange={() => onToggleAvailability(property)}
            disabled={busy}
            aria-label={`${property.title} availability`}
          />
          <span className="text-xs text-muted">{property.available ? 'Accepting bookings' : 'Not accepting bookings'}</span>
        </div>
        <QuietAction onClick={() => onDelete(property)} danger>{busy ? 'Working...' : 'Delete'}</QuietAction>
      </div>
    </div>
  </HostCard>;
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
  showTips: PropTypes.bool.isRequired,
};

function HostListingRow({ property, onToggleAvailability, onDelete, onReview, busy }) {
  const image = firstImage(property);
  const status = propertyStatus(property);
  const canSubmit = ['DRAFT', 'REJECTED'].includes(property.status);

  return <HostCard>
    <div className="flex items-start gap-3 sm:gap-4">
      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-surface sm:h-24 sm:w-24">
        {image
          ? <img src={image} alt="" loading="lazy" className="h-full w-full object-cover" />
          : <span className="grid h-full w-full place-items-center text-[10px] text-muted">No photo</span>}
      </span>

      {/* Actions sit under the text rather than beside it: a beside-column on a
          phone squeezed the title down to a single letter. */}
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <h2 className="min-w-0 flex-1 truncate text-[15px] font-semibold text-navy">
            <Link to={`/property/${property.id}`} className="hover:text-muted">{property.title}</Link>
          </h2>
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </div>
        <p className="mt-1 truncate text-[13px] text-muted">{bedSummary(property)} · {where(property)}</p>
        <p className="mt-0.5 text-sm font-bold text-navy">KES {(property.price || 0).toLocaleString()}<span className="text-[11px] font-medium text-muted"> /night</span></p>

        <div className="mt-2 flex flex-wrap items-center gap-1">
          <Button as={Link} to={`/host/properties/${property.id}/edit`} size="xs" className="rounded-full" disabled={busy}>
            {property.status === 'DRAFT' ? 'Continue' : 'Edit'}
          </Button>
          {canSubmit && <QuietAction onClick={() => onReview(property)}>{busy ? 'Submitting...' : 'Submit'}</QuietAction>}
          <QuietAction to={`/host/calendar/${property.id}`}>Calendar</QuietAction>
          <button
            type="button"
            onClick={() => onToggleAvailability(property)}
            disabled={busy}
            className="rounded-full px-2.5 py-1.5 text-xs font-semibold text-muted transition-colors hover:bg-surface hover:text-navy disabled:opacity-50"
          >
            {property.available ? 'Pause' : 'Resume'}
          </button>
          <QuietAction onClick={() => onDelete(property)} danger>Delete</QuietAction>
        </div>
      </div>
    </div>
  </HostCard>;
}

HostListingRow.propTypes = HostListingCard.propTypes;

export default function HostListingsPage() {
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  // Tips are coaching, not data: a host who knows the checklist can hide it and
  // keep the cards short.
  const [showTips, setShowTips] = useState(true);
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
      // A blocked storage write is not worth failing the page over.
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
  // Counts belong on the filter itself: a host should not have to open it to
  // find out whether anything needs attention.
  const filterOptions = useMemo(() => FILTERS.map((item) => ({ value: item.key, label: `${item.label} · ${counts[item.key] || 0}` })), [counts]);

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
    if (!window.confirm(`Delete "${property.title}"? This cannot be undone.`)) return;
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
    <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <p className={HOST_EYEBROW}>Host workspace</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">Your listings</h1>
        <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">Prepare, publish, and manage your stays.</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => setShowTips((current) => !current)}
          aria-pressed={showTips}
          className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3 text-sm font-semibold transition-colors hover:bg-surface ${showTips ? 'text-navy' : 'text-muted'}`}
        >
          <Lightbulb className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Show tips
        </button>
        <SelectMenu
          value={filter}
          onChange={setFilter}
          options={filterOptions}
          ariaLabel="Filter listings by status"
          sizing="sm"
          shape="pill"
          wrapperClassName="w-40"
        />
        <div className={`${PILL_GROUP} items-center gap-0.5`} role="group" aria-label="Listing view">
          {[['grid', 'Grid', LayoutGrid], ['list', 'List', ListIcon]].map(([key, label, Icon]) => <button
            key={key}
            type="button"
            onClick={() => setView(key)}
            aria-pressed={view === key}
            aria-label={`${label} view`}
            className={`inline-flex h-8 items-center gap-1 rounded-full px-2.5 text-xs font-semibold transition-colors ${view === key ? PILL_SELECTED : PILL_IDLE}`}
          >
            <Icon className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
            <span className="hidden sm:inline">{label}</span>
          </button>)}
        </div>
        <Button as={Link} to="/host/properties/new" size="sm" className="rounded-full">
          <Plus className="mr-1.5 h-4 w-4" strokeWidth={2.2} aria-hidden="true" />
          Add listing
        </Button>
      </div>
    </header>

    {error && <Alert color="failure">
      <p>{error}</p>
      <div><Button type="button" color="light" size="sm" onClick={() => window.location.reload()}>Try again</Button></div>
    </Alert>}

    {loading ? <ListingSkeleton /> : !error && visibleProperties.length === 0 ? <HostCard className="border-dashed">
      <div className="flex flex-col items-center gap-2 px-2 py-8 text-center">
        <span className="text-muted"><Building2 strokeWidth={1.6} aria-hidden="true" /></span>
        <strong className="text-base font-semibold text-navy">{properties.length === 0 ? 'No listings yet' : 'Nothing in this view'}</strong>
        <p className="max-w-md text-sm leading-relaxed text-muted">{properties.length === 0 ? 'Create your first stay and start preparing it for guests.' : 'Try another status filter to see your listings.'}</p>
        {properties.length === 0 ? <Button as={Link} to="/host/properties/new" size="sm" className="rounded-full">Add a listing</Button> : <Button type="button" color="light" size="sm" onClick={() => setFilter('ALL')}>Show all stays</Button>}
      </div>
    </HostCard> : view === 'list' ? <div className="space-y-2">
      {visibleProperties.map((property) => <HostListingRow key={property.id} property={property} busy={busyId === property.id} onToggleAvailability={handleToggleAvailability} onDelete={handleDelete} onReview={handleSubmitForReview} />)}
    </div> : <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {visibleProperties.map((property) => <HostListingCard key={property.id} property={property} busy={busyId === property.id} showTips={showTips} onToggleAvailability={handleToggleAvailability} onDelete={handleDelete} onReview={handleSubmitForReview} />)}
    </div>}
  </div>;
}
