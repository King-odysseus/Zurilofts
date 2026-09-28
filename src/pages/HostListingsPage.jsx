import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ToggleSwitch } from 'flowbite-react';
import PropTypes from 'prop-types';
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

function ListingSkeleton() {
  return <div className="op-host-listing-skeleton" aria-label="Loading listings">
    <span /><span /><span />
  </div>;
}

function HostListingCard({ property, onToggleAvailability, onDelete, onReview, busy }) {
  const image = firstImage(property);
  const status = propertyStatus(property);
  const canSubmit = ['DRAFT', 'REJECTED'].includes(property.status);

  return <article className="op-host-listing-card">
    <div className="op-host-listing-cover">
      {image ? <img src={image} alt="" /> : <div className="op-host-listing-cover-empty">No photo yet</div>}
      <span className={`op-host-listing-status is-${status.tone}`}>{status.label}</span>
    </div>
    <div className="op-host-listing-body">
      <header>
        <div>
          <h2><Link to={`/property/${property.id}`}>{property.title}</Link></h2>
          <p>{bedSummary(property)} · {property.neighborhood || property.location || 'Nairobi'}</p>
        </div>
        <strong>KES {(property.price || 0).toLocaleString()}<small>/night</small></strong>
      </header>
      <p className={`op-host-listing-note is-${status.tone}`}>{statusCopy(property)}</p>
      <div className="op-host-listing-actions">
        <Link className="op-host-listing-edit" to={`/host/properties/${property.id}/edit`}>
          {property.status === 'DRAFT' ? 'Continue setup' : 'Edit listing'}
        </Link>
        {canSubmit && <button type="button" className="op-host-listing-submit" disabled={busy} onClick={() => onReview(property)}>
          {busy ? 'Submitting...' : 'Submit for review'}
        </button>}
        {property.status === 'PENDING_REVIEW' && <span className="op-host-listing-reviewing">Awaiting review</span>}
        {property.status === 'PUBLISHED' && <Link className="op-host-listing-view" to={`/property/${property.id}`}>View listing</Link>}
        <Link className="op-host-listing-calendar" to={`/host/calendar/${property.id}`}>Calendar</Link>
      </div>
      <footer>
        <div className="op-host-listing-availability">
          <ToggleSwitch
            checked={Boolean(property.available)}
            onChange={() => onToggleAvailability(property)}
            disabled={busy}
            aria-label={`${property.title} availability`}
            theme={{
              root: { base: 'op-host-listing-toggle' },
              toggle: { checked: { color: { default: 'bg-[#2563EB] group-focus:ring-[#BFDBFE]' } } },
            }}
          />
          <span>{property.available ? 'Accepting bookings' : 'Not accepting bookings'}</span>
        </div>
        <button type="button" className="op-host-listing-delete" disabled={busy} onClick={() => onDelete(property)}>
          {busy ? 'Working...' : 'Delete'}
        </button>
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

export default function HostListingsPage() {
  const toast = useToast();
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('ALL');
  const [busyId, setBusyId] = useState(null);

  useEffect(() => {
    document.title = 'Your listings | ZuriLofts Host';
  }, []);

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

  return <div className="op-host-listings">
    <header className="op-host-listings-heading">
      <div><h1>Your listings</h1><p>Prepare, publish, and manage your stays.</p></div>
      <Link to="/host/properties/new">+ Add a listing</Link>
    </header>

    <div className="op-host-listings-tabs" role="tablist" aria-label="Listing status">
      {FILTERS.map((item) => <button
        key={item.key}
        type="button"
        role="tab"
        aria-selected={filter === item.key}
        className={filter === item.key ? 'is-active' : ''}
        onClick={() => setFilter(item.key)}
      >{item.label} · {counts[item.key] || 0}</button>)}
    </div>

    {error && <div className="op-host-listings-error"><p>{error}</p><button type="button" onClick={() => window.location.reload()}>Try again</button></div>}
    {loading ? <ListingSkeleton /> : !error && visibleProperties.length === 0 ? <div className="op-host-listings-empty">
      <span><svg fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.6} d="M3 21h18M5 21V7l7-4 7 4v14M9 21v-5h6v5M9 10h.01M15 10h.01" /></svg></span>
      <strong>{properties.length === 0 ? 'No listings yet' : 'Nothing in this view'}</strong>
      <p>{properties.length === 0 ? 'Create your first stay and start preparing it for guests.' : 'Try another status filter to see your listings.'}</p>
      {properties.length === 0 ? <Link to="/host/properties/new">Add a listing</Link> : <button type="button" onClick={() => setFilter('ALL')}>Show all stays</button>}
    </div> : <div className="op-host-listings-grid">
      {visibleProperties.map((property) => <HostListingCard key={property.id} property={property} busy={busyId === property.id} onToggleAvailability={handleToggleAvailability} onDelete={handleDelete} onReview={handleSubmitForReview} />)}
    </div>}
  </div>;
}
