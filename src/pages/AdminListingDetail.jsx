import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Label, Spinner, Textarea } from 'flowbite-react';
import { ArrowLeft, ArrowUpRight, Eye, House, MapPin, Phone } from 'lucide-react';
import apiClient from '../api/client.js';

const STATUS_META = {
  DRAFT: { label: 'Draft', color: 'gray' },
  PENDING_REVIEW: { label: 'Pending review', color: 'warning' },
  PUBLISHED: { label: 'Published', color: 'success' },
  REJECTED: { label: 'Rejected', color: 'failure' },
  SUSPENDED: { label: 'Suspended', color: 'failure' },
};

// Mirrors the server's transition rules, so the buttons on screen can never ask
// for a move the API refuses (only pending can be approved, only published
// suspended, only suspended restored).
const REVIEW_ACTIONS = {
  PENDING_REVIEW: [
    { id: 'approve', label: 'Approve', color: 'default' },
    { id: 'reject', label: 'Reject', color: 'failure' },
  ],
  PUBLISHED: [{ id: 'suspend', label: 'Suspend', color: 'warning' }],
  SUSPENDED: [{ id: 'unsuspend', label: 'Unsuspend', color: 'default' }],
};

const REVIEW_SUCCESS = {
  approve: 'Listing approved and published.',
  reject: 'Listing rejected. The host sees the note you left.',
  suspend: 'Listing suspended and hidden from guests.',
  unsuspend: 'Listing restored and visible to guests again.',
};

const NOTHING_TO_REVIEW = {
  DRAFT: 'The host has not submitted this listing yet. There is nothing to review until they submit it.',
  REJECTED: 'This listing was sent back for changes. There is nothing to review until the host resubmits it.',
};

const ROLE_LABELS = { USER: 'Guest', HOST: 'Host', ADMIN: 'Admin' };

function formatDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? 'Not recorded' : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

function money(value) {
  const amount = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(amount)) return 'Not set';
  return `KES ${amount.toLocaleString()}`;
}

function plural(count, word) {
  if (count === null || count === undefined || count === '') return null;
  const value = Number(count);
  if (Number.isNaN(value)) return null;
  return `${value} ${word}${value === 1 ? '' : 's'}`;
}

function StatusBadge({ status }) {
  const meta = STATUS_META[status] || { label: String(status || 'Unknown').replace(/_/g, ' '), color: 'gray' };
  return <Badge color={meta.color}>{meta.label}</Badge>;
}

function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      <div className="mt-3">{children}</div>
    </section>
  );
}

function Chips({ items, empty }) {
  if (!items.length) return <p className="text-sm text-muted">{empty}</p>;
  return (
    <ul className="flex flex-wrap gap-2">
      {items.map((item, index) => (
        <li key={`${item}-${index}`} className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-charcoal">
          {item}
        </li>
      ))}
    </ul>
  );
}

export default function AdminListingDetail() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [activeImage, setActiveImage] = useState(0);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    // Reset the host too: navigating between listings would otherwise carry the
    // previous owner's card over to a listing that has no host at all.
    setHost(null);
    apiClient.get(`/admin/properties/${id}`)
      .then((response) => {
        if (cancelled) return null;
        const property = response.data.data;
        setListing(property);
        setActiveImage(0);
        // The host is a second request: a listing whose owner was erased still has
        // to render, so a failed host lookup must not fail the whole page.
        if (!property?.hostId) return null;
        return apiClient.get(`/admin/users/${property.hostId}`)
          .then((hostResponse) => { if (!cancelled) setHost(hostResponse.data.data); })
          .catch(() => { if (!cancelled) setHost(null); });
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(cause.response?.data?.error || 'This listing could not be loaded.');
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id]);

  async function review(action) {
    if (!listing) return;
    if (action === 'reject' && !note.trim()) {
      setError('Add a reason before rejecting this listing.');
      setMessage('');
      return;
    }
    setBusy(action);
    setError('');
    setMessage('');
    try {
      const response = await apiClient.patch(`/admin/properties/${listing.id}/review`, {
        action,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setListing(response.data.data);
      setNote('');
      setMessage(REVIEW_SUCCESS[action] || 'Listing updated.');
    } catch (cause) {
      setError(cause.response?.data?.error || 'The review could not be saved.');
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-elevated px-5 py-16 text-center shadow-sm" role="status">
          <Spinner size="lg" aria-hidden="true" />
          <strong className="text-sm font-semibold text-navy">Loading listing...</strong>
          <p className="text-xs text-muted">Fetching the stay, its photos and the host account.</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="space-y-6">
        <Link to="/admin/properties" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Listing approvals
        </Link>
        <section className="rounded-xl border border-border bg-elevated p-8 text-center shadow-sm">
          <strong className="block text-base font-semibold text-navy">Listing unavailable</strong>
          <p role="alert" className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
            {loadError || 'This listing does not exist, or it has been removed.'}
          </p>
          <Button as={Link} to="/admin/properties" size="sm" className="mx-auto mt-4 w-fit">Back to listing approvals</Button>
        </section>
      </div>
    );
  }

  const images = listing.images || [];
  const amenities = listing.amenities || [];
  const nearby = listing.nearby || [];
  const actions = REVIEW_ACTIONS[listing.status] || [];
  const activeImageUrl = images[activeImage] || images[0] || null;
  const reviewCount = Number(listing.reviews) || 0;
  const metaParts = [
    listing.location || listing.neighborhood || 'Location pending',
    listing.type,
    plural(listing.bedrooms, 'bedroom'),
    plural(listing.bathrooms, 'bathroom'),
  ].filter(Boolean);
  // Property.rating is Float @default(0), so an unreviewed listing carries 0,
  // not null. Keying off the review count is the only way to avoid telling an
  // admin that a brand-new listing has a 0.0 rating.
  const ratingLabel = reviewCount === 0
    ? 'No reviews yet'
    : `${Number(listing.rating || 0).toFixed(1)} from ${reviewCount} review${reviewCount === 1 ? '' : 's'}`;
  const facts = [
    ['Nightly price', money(listing.price)],
    ['Bedrooms', plural(listing.bedrooms, 'bedroom') || 'Not set'],
    ['Bathrooms', plural(listing.bathrooms, 'bathroom') || 'Not set'],
    ['Area', listing.area === null || listing.area === undefined ? 'Not set' : `${listing.area} m2`],
    ['Type', listing.type || 'Not set'],
    ['Neighbourhood', listing.neighborhood || 'Not set'],
    ['Address', listing.address || 'Not provided'],
    ['Guest rating', ratingLabel],
    ['Available', listing.available ? 'Yes' : 'No'],
    ['Featured', listing.featured ? 'Yes' : 'No'],
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link to="/admin/properties" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Listing approvals
        </Link>
        <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">ZURILOFTS · ADMIN · LISTING</p>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{listing.title || 'Untitled listing'}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={listing.status} />
          <p className="text-sm text-muted">{metaParts.join(' · ')}</p>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
            {activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt={listing.title ? `${listing.title} photo` : 'Listing photo'}
                className="aspect-[16/10] w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface text-muted">
                <House className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
                <p className="text-sm">No photos uploaded yet</p>
              </div>
            )}
            {images.length > 1 && (
              <div className="mt-3 flex flex-wrap gap-2">
                {images.map((url, index) => (
                  <button key={`${url}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === activeImage} className={`overflow-hidden rounded-lg border-2 transition-colors ${index === activeImage ? 'border-primary-600' : 'border-transparent hover:border-border'}`}>
                    <img src={url} alt="" className="h-16 w-20 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <Panel title="About this stay">
            <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">{listing.description || 'No description provided.'}</p>
            <dl className="mt-5 grid grid-cols-1 gap-4 border-t border-border pt-4 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-navy">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title="Amenities">
            <Chips items={amenities} empty="No amenities listed" />
          </Panel>

          <Panel title="Nearby places">
            <Chips items={nearby} empty="No nearby places listed" />
          </Panel>

          <Panel title="Location">
            <p className="flex items-start gap-2 text-sm text-charcoal">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
              {listing.lat === null || listing.lat === undefined || listing.lng === null || listing.lng === undefined
                ? 'No map pin set'
                : `${listing.lat}, ${listing.lng}`}
            </p>
          </Panel>
        </div>

        <aside className="space-y-6">
          <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-navy">Review</h2>
              <StatusBadge status={listing.status} />
            </div>

            <dl className="mt-4 space-y-2">
              {[['Submitted', listing.submittedAt], ['Last reviewed', listing.listingReviewedAt]].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-3">
                  <dt className="text-xs text-muted">{label}</dt>
                  <dd className="text-sm font-medium text-navy">{formatDate(value)}</dd>
                </div>
              ))}
            </dl>

            {listing.listingReviewNote && (
              <div className="mt-4 rounded-lg border-l-2 border-primary-600 bg-surface px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">Latest note</p>
                <p className="mt-1 text-sm leading-relaxed text-charcoal">{listing.listingReviewNote}</p>
              </div>
            )}

            {actions.length ? (
              <div className="mt-4 space-y-3">
                <div>
                  <Label htmlFor="listing-review-note" value="Reason or note (required for rejection)" />
                  <Textarea
                    id="listing-review-note"
                    value={note}
                    onChange={(event) => { setNote(event.target.value); setError(''); }}
                    rows={3}
                    maxLength={2000}
                    placeholder="Explain the decision for the host"
                    disabled={Boolean(busy)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <Button key={action.id} type="button" color={action.color} disabled={Boolean(busy)} onClick={() => review(action.id)}>
                      {busy === action.id ? `${action.label}...` : action.label}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-4 rounded-lg bg-surface px-3 py-2 text-sm leading-relaxed text-muted">
                {NOTHING_TO_REVIEW[listing.status] || 'This listing cannot be reviewed at the moment.'}
              </p>
            )}

            {error && <p role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="mt-3 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

            {listing.status === 'PUBLISHED' && (
              <Link to={`/admin/properties/${listing.id}/preview`} className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
                Preview as a guest sees it
                <Eye className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
              </Link>
            )}
          </section>

          <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-navy">Host</h2>
              {host?.email && (
                <Link to={`/admin/users?search=${encodeURIComponent(host.email)}`} className="inline-flex items-center gap-1 text-xs font-semibold text-link hover:underline">
                  Open in Users
                  <ArrowUpRight className="h-3.5 w-3.5" strokeWidth={1.9} aria-hidden="true" />
                </Link>
              )}
            </div>

            {host ? (
              <>
                <div className="mt-3 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-bg text-xs font-bold text-white" aria-hidden="true">
                    {`${host.firstName?.[0] || ''}${host.lastName?.[0] || ''}`.toUpperCase() || 'H'}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-navy">
                      {`${host.firstName || ''} ${host.lastName || ''}`.trim() || 'Unnamed host'}
                    </strong>
                    <a href={`mailto:${host.email}`} className="block truncate text-xs text-link hover:underline">{host.email || 'Email not provided'}</a>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Badge color="gray">{ROLE_LABELS[host.role] || host.role || 'Account'}</Badge>
                  {host.suspended && <Badge color="failure">Suspended</Badge>}
                </div>

                {host.phone && (
                  <p className="mt-3 flex items-center gap-2 text-xs text-charcoal">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
                    {host.phone}
                  </p>
                )}

                <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4">
                  {[['Listings', host._count?.properties], ['Bookings', host._count?.bookings]].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
                      <dd className="mt-0.5 text-lg font-bold text-navy">{value ?? 0}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-4 text-xs text-muted">Member since {formatDate(host.createdAt)}</p>
              </>
            ) : (
              <p className="mt-3 text-sm text-muted">
                {listing.hostId ? 'The host account could not be loaded.' : 'No host assigned'}
              </p>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
