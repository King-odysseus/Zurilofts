import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Badge, Button, Spinner } from 'flowbite-react';
import { ArrowLeft, Eye, ShieldCheck } from 'lucide-react';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
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

function displayDate(value, t, lang) {
  if (!value) return t('adminlisting.notRecorded');
  const date = new Date(value);
  const locale = lang === 'sw' ? 'sw-KE' : 'en-GB';
  return Number.isNaN(date.getTime())
    ? t('adminlisting.notRecorded')
    : date.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function AdminListingPreviewPage() {
  const { t, lang } = useLanguage();
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
        if (!cancelled) setError(cause.response?.data?.error || t('adminlisting.loadFailed'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [id, t]);

  const backLink = <Link to={`/admin/listings/${id}`} className="inline-flex items-center gap-1.5 text-sm font-semibold text-muted hover:text-navy">
    <ArrowLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
    {t('adminlisting.backToReviewRecord')}
  </Link>;

  if (loading) {
    return <div className="grid min-h-[40vh] place-items-center"><Spinner size="xl" /></div>;
  }

  if (error || !listing) {
    return <div className="space-y-5">
      {backLink}
      <Alert color="failure">{error || t('adminlisting.notFound')}</Alert>
    </div>;
  }

  const sidePanel = <section className="rounded-xl bg-elevated p-5 shadow-sm">
    <div className="flex items-center justify-between gap-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('adminlisting.moderation')}</p>
      <Badge color={BADGE_COLOR[listing.status] || 'gray'}>{listingStatusLabel(listing.status, t)}</Badge>
    </div>

    <dl className="mt-5 space-y-3 text-sm">
      <div>
        <dt className="text-xs text-muted">{t('adminlisting.submitted')}</dt>
        <dd className="font-medium text-navy">{displayDate(listing.submittedAt, t, lang)}</dd>
      </div>
      <div>
        <dt className="text-xs text-muted">{t('adminlisting.lastReviewed')}</dt>
        <dd className="font-medium text-navy">{displayDate(listing.listingReviewedAt, t, lang)}</dd>
      </div>
      {listing.listingReviewNote && (
        <div>
          <dt className="text-xs text-muted">{t('adminlisting.noteToHost')}</dt>
          <dd className="mt-1 whitespace-pre-wrap break-words rounded-lg bg-surface p-2 text-xs text-charcoal">
            {listing.listingReviewNote}
          </dd>
        </div>
      )}
    </dl>

    <div className="mt-5 flex items-start gap-2 rounded-lg bg-surface p-3 text-xs leading-relaxed text-muted">
      <Eye className="mt-0.5 h-4 w-4 shrink-0" strokeWidth={1.8} aria-hidden="true" />
      <p>{t('adminlisting.guestsAlsoSee')}</p>
    </div>

    <Button as={Link} to={`/admin/listings/${id}`} size="sm" color="light" className="mt-5 w-full rounded-full">
      <ShieldCheck className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden="true" />
      {t('adminlisting.openReviewActions')}
    </Button>
  </section>;

  return (
    <div className="space-y-6">
      <div>
        {backLink}
        <div className="mt-2 flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-muted">{t('adminlisting.adminEyebrow')}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{t('adminlisting.guestView')}</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              {t('adminlisting.guestViewDescription')}
            </p>
          </div>
          <Badge color={BADGE_COLOR[listing.status] || 'gray'}>{listingStatusLabel(listing.status, t)}</Badge>
        </div>
      </div>

      <section className="rounded-2xl bg-elevated p-4 shadow-sm sm:p-6">
        <ListingMirrorBody property={listing} sidePanel={sidePanel} />
      </section>
    </div>
  );
}
