import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button } from 'flowbite-react';
import { CalendarDays, ChevronLeft, MapPin, PencilLine, Users } from 'lucide-react';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
import ListingMirrorBody from '../components/ListingMirrorBody.jsx';
import Spinner from '../components/Spinner.jsx';
import { formatPrice } from '../utils/currency.js';
import { listingStatusLabel } from '../utils/listingStatus.js';

// A host's view of their own listing, as a guest reads it.
//
// This is not the traveller page. It renders the host's copy of the listing
// content and swaps the booking box for the host's own controls, so a host sees
// what guests see without ever entering the traveller app or being offered a
// "Book" button on a stay they own. It reads /properties/:id, which the API
// already soft-auths for the owner: that is the one way to look at an
// unpublished listing, and it never exposes anyone else's draft.

const STATUS_TONE = {
  PUBLISHED: 'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-100',
  PENDING_REVIEW: 'border-blue-200 bg-blue-50 text-blue-900 dark:border-blue-500/30 dark:bg-blue-500/10 dark:text-blue-100',
  REJECTED: 'border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-100',
  SUSPENDED: 'border-red-200 bg-red-50 text-red-900 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-100',
  DRAFT: 'border-border bg-surface text-navy',
};

function statusSentence(property, t) {
  if (property.status === 'PUBLISHED') return t('hostpreview.statusPublished');
  if (property.status === 'PENDING_REVIEW') return t('hostpreview.statusPendingReview');
  if (property.status === 'REJECTED') return property.listingReviewNote || t('hostpreview.statusRejected');
  if (property.status === 'SUSPENDED') return property.listingReviewNote || t('hostpreview.statusSuspended');
  return t('hostpreview.statusDraft');
}

export default function HostListingPreviewPage() {
  const { t } = useLanguage();
  const { id } = useParams();
  const [property, setProperty] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      try {
        const response = await apiClient.get(`/properties/${id}`);
        if (!active) return;
        setProperty(response.data.data);
      } catch (err) {
        if (active) setError(err.response?.data?.error || t('hostpreview.listingLoadFailed'));
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id, t]);

  if (loading) {
    return <div className="grid min-h-[40vh] place-items-center"><Spinner /></div>;
  }

  if (error || !property) {
    return <div className="space-y-4">
      <Link to="/host/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        {t('hostpreview.backToListings')}
      </Link>
      <Alert color="failure">{error || t('hostpreview.listingNotFound')}</Alert>
    </div>;
  }

  const price = formatPrice(property.price);

  const sidePanel = <HostCard eyebrow={t('hostpreview.guestSide')} title={t('hostpreview.whatGuestCanDo')}>
    <div className="flex flex-col gap-4">
      <p className="text-2xl font-bold text-navy">
        {price || t('hostpreview.noRateSet')}
        {price && <span className="text-sm font-medium text-muted"> {t('hostpreview.perNight')}</span>}
      </p>
      <p className="text-xs leading-relaxed text-muted">
        {t('hostpreview.rateHint')}
      </p>

      <ul className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-charcoal">
        <li className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
          {t('hostpreview.pickDates')}
        </li>
        <li className="flex items-start gap-2"><AlertIcon />
          {t('hostpreview.bookingHappensInTravellerApp')}
        </li>
      </ul>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button as={Link} to={`/host/listings/${property.id}/edit`} size="sm" className="rounded-full">
          <PencilLine className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t('hostpreview.editListing')}
        </Button>
        <Button as={Link} to={`/host/calendar/${property.id}`} size="sm" color="light" className="rounded-full">
          <CalendarDays className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t('hostpreview.manageCalendar')}
        </Button>
        <Link
          to={`/host/listings/${property.id}/arrival-guide`}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted hover:text-navy"
        >
          <MapPin className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {t('hostpreview.arrivalGuide')}
        </Link>
      </div>
    </div>
  </HostCard>;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/host/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          {t('hostpreview.backToListings')}
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={HOST_EYEBROW}>{t('hostpreview.hostWorkspace')}</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">{t('hostpreview.guestPreview')}</h1>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
              {t('hostpreview.guestPreviewHint')}
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${STATUS_TONE[property.status] || STATUS_TONE.DRAFT}`}>
        <strong className="font-semibold">{listingStatusLabel(property.status, t)}</strong>
        <span className="ml-2">{statusSentence(property, t)}</span>
      </div>

      <HostCard>
        <ListingMirrorBody property={property} sidePanel={sidePanel} />
      </HostCard>
    </div>
  );
}

// The booking note gets the same quiet mark as the other list item without
// pulling in a whole icon set name that reads as an error.
function AlertIcon() {
  return <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bronze" />;
}
