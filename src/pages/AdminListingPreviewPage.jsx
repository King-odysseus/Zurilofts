import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Spinner } from 'flowbite-react';
import { ArrowLeft, Eye, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client.js';
import ListingMirrorBody from '../components/ListingMirrorBody.jsx';
import { listingStatusLabel } from '../utils/listingStatus.js';

// The admin's read of a listing as a guest would meet it.
//
// Deliberately separate from the traveller page and from the host preview: it
// reads the admin-scoped endpoint (so a draft or suspended listing is viewable
// without borrowing a traveller URL) and replaces the booking box with the
// moderation context an admin actually needs. There is no Book button and no
// checkout here, because an admin never transacts as the guest.

const BADGE_COLOR = {
  DRAFT: 'gray',
  PENDING_REVIEW: 'warning',
  PUBLISHED: 'success',
  REJECTED: 'failure',
  SUSPENDED: 'failure',
};

function displayDate(value) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? 'Not recorded'
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminListingPreviewPage() {
  const { id } = useParams();
  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    apiClient.get(`/admin/properties/${id}`)
      .then((response) => {
        if (!cancelled) setListing(response.data.data);
      })
      .catch((cause) => {
        if (!cancelled) setError(cause.response?.data?.error || 'This listing could not be loaded.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id]);

  const backLink = <Link to={`/admin/properties/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-navy">
    <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
    Back to review record
  </Link>;

  if (loading) {
    return <div className="grid min-h-[40vh] place-items-center"><Spinner size="xl" /></div>;
  }

  if (error || !listing) {
    return <div className="space-y-4">
      {backLink}
      <Alert color="failure">{error || 'This listing could not be found.'}</Alert>
    </div>;
  }

  const sidePanel = <section className="rounded-xl border border-border bg-elevated p-5 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Moderation</p>
      <Badge color={BADGE_COLOR[listing.status] || 'gray'}>{listingStatusLabel(listing.status)}</Badge>
    </div>

    <dl className="mt-4 space-y-3 text-sm">
      <div>
        <dt className="text-xs text-muted">Submitted</dt>
        <dd className="font-medium text-navy">{displayDate(listing.submittedAt)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">Last reviewed</dt>
        <dd className="font-medium text-navy">{displayDate(listing.listingReviewedAt)}</dd>
      </div>
      {listing.listingReviewNote && (
        <div>
          <dt className="text-xs text-muted">Note to host</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words rounded-lg border border-border bg-surface p-2 text-xs text-charcoal">
            {listing.listingReviewNote}
          </dd>
        </div>
      )}
    </dl>

    <div className="mt-4 flex items-start gap-2 rounded-lg border border-border bg-surface p-3 text-xs leading-relaxed text-muted">
      <Eye className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <p>
        Guests also see live availability, a Book button and the checkout. None of that is shown here,
        because an admin does not book on a guest&apos;s behalf.
      </p>
    </div>

    <Button as={Link} to={`/admin/properties/${id}`} size="sm" color="light" className="mt-4 w-full rounded-full">
      <ShieldCheck className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden="true" />
      Open review actions
    </Button>
  </section>;

  return (
    <div className="space-y-5">
      <div>
        {backLink}
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">Admin</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">Guest view</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              The listing as a guest meets it, with the booking controls removed and the moderation record in their place.
            </p>
          </div>
          <Badge color={BADGE_COLOR[listing.status] || 'gray'}>{listingStatusLabel(listing.status)}</Badge>
        </div>
      </div>

      <section className="rounded-2xl border border-border bg-elevated p-4 shadow-sm sm:p-6">
        <ListingMirrorBody property={listing} sidePanel={sidePanel} />
      </section>
    </div>
  );
}
