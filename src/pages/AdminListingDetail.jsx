import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Badge, Button, Label, Spinner, Textarea } from 'flowbite-react';
import { ArrowLeft, ArrowUpRight, Eye, House, MapPin, Phone } from 'lucide-react';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';

const STATUS_META = {
  DRAFT: { labelKey: 'adminlisting.statusDraft', color: 'gray' },
  PENDING_REVIEW: { labelKey: 'adminlisting.statusPendingReview', color: 'warning' },
  PUBLISHED: { labelKey: 'adminlisting.statusPublished', color: 'success' },
  REJECTED: { labelKey: 'adminlisting.statusRejected', color: 'failure' },
  SUSPENDED: { labelKey: 'adminlisting.statusSuspended', color: 'failure' },
};

// Mirrors the server's transition rules, so the buttons on screen can never ask
// for a move the API refuses (only pending can be approved, only published
// suspended, only suspended restored).
const REVIEW_ACTIONS = {
  PENDING_REVIEW: [
    { id: 'approve', labelKey: 'adminlisting.actionApprove', color: 'default' },
    { id: 'reject', labelKey: 'adminlisting.actionReject', color: 'failure' },
  ],
  PUBLISHED: [{ id: 'suspend', labelKey: 'adminlisting.actionSuspend', color: 'warning' }],
  SUSPENDED: [{ id: 'unsuspend', labelKey: 'adminlisting.actionUnsuspend', color: 'default' }],
};

const REVIEW_SUCCESS = {
  approve: 'adminlisting.successApprove',
  reject: 'adminlisting.successReject',
  suspend: 'adminlisting.successSuspend',
  unsuspend: 'adminlisting.successUnsuspend',
};

const NOTHING_TO_REVIEW = {
  DRAFT: 'adminlisting.nothingDraft',
  REJECTED: 'adminlisting.nothingRejected',
};

// Literal keys rather than a built string, so the key checker can prove each
// one exists in both languages.
const TYPE_LABELS = {
  apartment: 'adminlisting.typeApartment',
  studio: 'adminlisting.typeStudio',
  penthouse: 'adminlisting.typePenthouse',
};

const ROLE_LABELS = { USER: 'adminlisting.roleGuest', HOST: 'adminlisting.roleHost', ADMIN: 'adminlisting.roleAdmin' };

function formatDate(value, t, lang) {
  if (!value) return t('adminlisting.notRecorded');
  const date = new Date(value);
  const locale = lang === 'sw' ? 'sw-KE' : 'en-GB';
  return Number.isNaN(date.getTime()) ? t('adminlisting.notRecorded') : date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

function money(value, t) {
  const amount = Number(value);
  if (value === null || value === undefined || value === '' || Number.isNaN(amount)) return t('adminlisting.notSet');
  return `KES ${amount.toLocaleString()}`;
}

function countText(t, count, singularKey, pluralKey) {
  if (count === null || count === undefined || count === '') return null;
  const value = Number(count);
  if (Number.isNaN(value)) return null;
  return t(value === 1 ? singularKey : pluralKey, { count: value });
}

function StatusBadge({ status }) {
  const { t } = useLanguage();
  const meta = STATUS_META[status];
  // An unrecognised state falls back to the raw token with its underscores
  // opened out, which is still more useful to an admin than a blank badge.
  if (!meta) return <Badge color="gray">{String(status || '-').replace(/_/g, ' ')}</Badge>;
  return <Badge color={meta.color}>{t(meta.labelKey)}</Badge>;
}

function Panel({ title, children }) {
  return (
    <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
      <h2 className="text-base font-semibold text-navy">{title}</h2>
      <div className="mt-4">{children}</div>
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
  const { t, lang } = useLanguage();
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [host, setHost] = useState(null);
  // Distinguishes "this listing has no owner" from "the owner lookup failed".
  // Both used to render an empty card, which looked like a missing host.
  const [hostFailed, setHostFailed] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
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
    setHostFailed(false);
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
          .catch(() => { if (!cancelled) { setHost(null); setHostFailed(true); } });
      })
      .catch((cause) => {
        if (!cancelled) setLoadError(cause.response?.data?.error || t('adminlisting.loadFailed'));
      })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [id, reloadKey, t]);

  async function review(action) {
    if (!listing) return;
    if (action === 'reject' && !note.trim()) {
      setError(t('adminlisting.reasonRequired'));
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
      setMessage(REVIEW_SUCCESS[action] ? t(REVIEW_SUCCESS[action]) : t('adminlisting.updated'));
    } catch (cause) {
      setError(cause.response?.data?.error || t('adminlisting.reviewSaveFailed'));
    } finally {
      setBusy('');
    }
  }

  if (loading) {
    return (
      <div className="space-y-8">
        <div className="flex flex-col items-center gap-2 rounded-xl border border-border bg-elevated px-5 py-16 text-center shadow-sm" role="status">
          <Spinner size="lg" aria-hidden="true" />
          <strong className="text-sm font-semibold text-navy">{t('adminlisting.loadingTitle')}</strong>
          <p className="text-xs text-muted">{t('adminlisting.loadingBody')}</p>
        </div>
      </div>
    );
  }

  if (!listing) {
    return (
      <div className="space-y-8">
        <Link to="/admin/listings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {t('adminlisting.backToApprovals')}
        </Link>
        <section className="rounded-xl border border-border bg-elevated p-8 text-center shadow-sm">
          <strong className="block text-base font-semibold text-navy">{t('adminlisting.unavailableTitle')}</strong>
          <p role="alert" className="mx-auto mt-1 max-w-md text-sm leading-relaxed text-muted">
            {loadError || 'This listing does not exist, or it has been removed.'}
          </p>
          <Button as={Link} to="/admin/listings" size="sm" className="mx-auto mt-5 w-fit">{t('adminlisting.backToApprovals')}</Button>
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
    listing.location || listing.neighborhood || t('adminlisting.locationPending'),
    listing.type ? t(TYPE_LABELS[listing.type] || 'adminlisting.notSet') : null,
    countText(t, listing.bedrooms, 'adminlisting.bedroomOne', 'adminlisting.bedroomOther'),
    countText(t, listing.bathrooms, 'adminlisting.bathroomOne', 'adminlisting.bathroomOther'),
  ].filter(Boolean);
  // Property.rating is Float @default(0), so an unreviewed listing carries 0,
  // not null. Keying off the review count is the only way to avoid telling an
  // admin that a brand-new listing has a 0.0 rating.
  const ratingLabel = reviewCount === 0
    ? t('adminlisting.noReviewsYet')
    : t(reviewCount === 1 ? 'adminlisting.ratingOne' : 'adminlisting.ratingOther', { rating: Number(listing.rating || 0).toFixed(1), count: reviewCount });
  const facts = [
    [t('adminlisting.rowNightlyPrice'), money(listing.price, t)],
    [t('adminlisting.rowBedrooms'), countText(t, listing.bedrooms, 'adminlisting.bedroomOne', 'adminlisting.bedroomOther') || t('adminlisting.notSet')],
    [t('adminlisting.rowBathrooms'), countText(t, listing.bathrooms, 'adminlisting.bathroomOne', 'adminlisting.bathroomOther') || t('adminlisting.notSet')],
    [t('adminlisting.rowArea'), listing.area === null || listing.area === undefined ? t('adminlisting.notSet') : `${listing.area} m2`],
    [t('adminlisting.rowType'), t(TYPE_LABELS[listing.type] || 'adminlisting.notSet')],
    [t('adminlisting.rowNeighbourhood'), listing.neighborhood || t('adminlisting.notSet')],
    [t('adminlisting.rowAddress'), listing.address || t('adminlisting.notProvided')],
    [t('adminlisting.rowGuestRating'), ratingLabel],
    [t('adminlisting.rowAvailable'), listing.available ? t('adminlisting.yes') : t('adminlisting.no')],
    [t('adminlisting.rowFeatured'), listing.featured ? t('adminlisting.yes') : t('adminlisting.no')],
  ];

  return (
    <div className="space-y-8">
      <div>
        <Link to="/admin/listings" className="inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
          <ArrowLeft className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {t('adminlisting.backToApprovals')}
        </Link>
        <h1 className="text-2xl font-bold tracking-tight text-navy sm:text-3xl">{listing.title || t('adminlisting.untitledListing')}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
          <StatusBadge status={listing.status} />
          <p className="text-sm text-muted">{metaParts.join(' · ')}</p>
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-8">
          <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
            {activeImageUrl ? (
              <img
                src={activeImageUrl}
                alt={listing.title ? t('adminlisting.photoOf', { title: listing.title }) : t('adminlisting.listingPhoto')}
                className="aspect-[16/10] w-full rounded-xl object-cover"
              />
            ) : (
              <div className="flex aspect-[16/10] w-full flex-col items-center justify-center gap-2 rounded-xl bg-surface text-muted">
                <House className="h-8 w-8" strokeWidth={1.6} aria-hidden="true" />
                <p className="text-sm">{t('adminlisting.noPhotosYet')}</p>
              </div>
            )}
            {images.length > 1 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {images.map((url, index) => (
                  <button key={`${url}-${index}`} type="button" onClick={() => setActiveImage(index)} aria-label={`Show photo ${index + 1}`} aria-pressed={index === activeImage} className={`overflow-hidden rounded-lg border-2 transition-colors ${index === activeImage ? 'border-primary-600' : 'border-transparent hover:border-border'}`}>
                    <img src={url} alt="" className="h-16 w-20 object-cover" />
                  </button>
                ))}
              </div>
            )}
          </section>

          <Panel title={t('adminlisting.aboutThisStay')}>
            <p className="whitespace-pre-line text-sm leading-relaxed text-charcoal">{listing.description || 'No description provided.'}</p>
            <dl className="mt-5 grid grid-cols-1 gap-5 border-t border-border pt-4 sm:grid-cols-2">
              {facts.map(([label, value]) => (
                <div key={label} className="min-w-0">
                  <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</dt>
                  <dd className="mt-0.5 break-words text-sm font-medium text-navy">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>

          <Panel title={t('adminlisting.amenities')}>
            <Chips items={amenities} empty="No amenities listed" />
          </Panel>

          <Panel title={t('adminlisting.nearbyPlaces')}>
            <Chips items={nearby} empty="No nearby places listed" />
          </Panel>

          <Panel title={t('adminlisting.location')}>
            <p className="flex items-start gap-2 text-sm text-charcoal">
              <MapPin className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
              {listing.lat === null || listing.lat === undefined || listing.lng === null || listing.lng === undefined
                ? t('adminlisting.noMapPin')
                : `${listing.lat}, ${listing.lng}`}
            </p>
          </Panel>
        </div>

        <aside className="space-y-8">
          <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-base font-semibold text-navy">Review</h2>
              <StatusBadge status={listing.status} />
            </div>

            <dl className="mt-5 space-y-3">
              {[['adminlisting.submitted', listing.submittedAt], ['adminlisting.lastReviewed', listing.listingReviewedAt]].map(([labelKey, value]) => (
                <div key={labelKey} className="flex items-center justify-between gap-3">
                  <dt className="text-xs text-muted">{t(labelKey)}</dt>
                  <dd className="text-sm font-medium text-navy">{formatDate(value, t, lang)}</dd>
                </div>
              ))}
            </dl>

            {listing.listingReviewNote && (
              <div className="mt-5 rounded-lg border-l-2 border-primary-600 bg-surface px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t('adminlisting.latestNote')}</p>
                <p className="mt-1 text-sm leading-relaxed text-charcoal">{listing.listingReviewNote}</p>
              </div>
            )}

            {actions.length ? (
              <div className="mt-5 space-y-3">
                <div>
                  <Label htmlFor="listing-review-note" value={t('adminlisting.noteLabel')} />
                  <Textarea
                    id="listing-review-note"
                    value={note}
                    onChange={(event) => { setNote(event.target.value); setError(''); }}
                    rows={3}
                    maxLength={2000}
                    placeholder={t('adminlisting.notePlaceholder')}
                    disabled={Boolean(busy)}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {actions.map((action) => (
                    <Button key={action.id} type="button" color={action.color} disabled={Boolean(busy)} onClick={() => review(action.id)}>
                      {busy === action.id ? `${t(action.labelKey)}...` : t(action.labelKey)}
                    </Button>
                  ))}
                </div>
              </div>
            ) : (
              <p className="mt-5 rounded-lg bg-surface px-3 py-2 text-sm leading-relaxed text-muted">
                {NOTHING_TO_REVIEW[listing.status] ? t(NOTHING_TO_REVIEW[listing.status]) : t('adminlisting.nothingFallback')}
              </p>
            )}

            {error && <p role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
            {message && <p role="status" className="mt-4 rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-700">{message}</p>}

            {listing.status === 'PUBLISHED' && (
              <Link to={`/admin/listings/${listing.id}/preview`} className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-link hover:underline">
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
                <div className="mt-4 flex items-center gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-navy-bg text-xs font-bold text-white" aria-hidden="true">
                    {`${host.firstName?.[0] || ''}${host.lastName?.[0] || ''}`.toUpperCase() || 'H'}
                  </span>
                  <div className="min-w-0">
                    <strong className="block truncate text-sm font-semibold text-navy">
                      {`${host.firstName || ''} ${host.lastName || ''}`.trim() || t('adminlisting.unnamedHost')}
                    </strong>
                    <a href={`mailto:${host.email}`} className="block truncate text-xs text-link hover:underline">{host.email || t('adminlisting.emailNotProvided')}</a>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Badge color="gray">{ROLE_LABELS[host.role] ? t(ROLE_LABELS[host.role]) : host.role || t('adminlisting.accountFallback')}</Badge>
                  {host.suspended && <Badge color="failure">{t('adminlisting.statusSuspended')}</Badge>}
                </div>

                {host.phone && (
                  <p className="mt-4 flex items-center gap-2 text-xs text-charcoal">
                    <Phone className="h-3.5 w-3.5 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
                    {host.phone}
                  </p>
                )}

                <dl className="mt-5 grid grid-cols-2 gap-4 border-t border-border pt-4">
                  {[['adminlisting.hostListings', host._count?.properties], ['adminlisting.hostBookings', host._count?.bookings]].map(([label, value]) => (
                    <div key={label}>
                      <dt className="text-[11px] font-semibold uppercase tracking-wide text-muted">{t(label)}</dt>
                      <dd className="mt-0.5 text-lg font-bold text-navy">{value ?? 0}</dd>
                    </div>
                  ))}
                </dl>

                <p className="mt-5 text-xs text-muted">{t('adminlisting.memberSince', { date: formatDate(host.createdAt, t, lang) })}</p>
              </>
            ) : (
              <div className="mt-4">
                <p className="text-sm text-muted">
                  {listing.hostId ? t('adminlisting.hostLoadFailed') : t('adminlisting.noHostAssigned')}
                </p>
                {hostFailed && listing.hostId && (
                  <Button size="xs" color="light" className="mt-3" type="button" onClick={() => setReloadKey((key) => key + 1)}>
                    {t('adminlisting.tryAgain')}
                  </Button>
                )}
              </div>
            )}
          </section>
        </aside>
      </div>
    </div>
  );
}
