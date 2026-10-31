import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { Alert, Button } from 'flowbite-react';
import { CalendarDays, ChevronLeft, MapPin, PencilLine, Users } from 'lucide-react';
import apiClient from '../api/client.js';
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

function statusSentence(property) {
  if (property.status === 'PUBLISHED') return 'Guests can find this listing and book it.';
  if (property.status === 'PENDING_REVIEW') return 'Guests cannot see this listing until review approves it.';
  if (property.status === 'REJECTED') return property.listingReviewNote || 'Guests cannot see this listing. Update the requested details, then submit it again.';
  if (property.status === 'SUSPENDED') return property.listingReviewNote || 'Guests cannot see this listing while it is suspended.';
  return 'Guests cannot see this listing yet. Finish the details, then submit it for review.';
}

export default function HostListingPreviewPage() {
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
        if (active) setError(err.response?.data?.error || 'Could not load this listing. Please try again.');
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [id]);

  if (loading) {
    return <div className="grid min-h-[40vh] place-items-center"><Spinner /></div>;
  }

  if (error || !property) {
    return <div className="space-y-4">
      <Link to="/host/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy">
        <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
        Back to listings
      </Link>
      <Alert color="failure">{error || 'This listing could not be found.'}</Alert>
    </div>;
  }

  const price = formatPrice(property.price);

  const sidePanel = <HostCard eyebrow="Guest side" title="What a guest can do here">
    <div className="flex flex-col gap-4">
      <p className="text-2xl font-bold text-navy">
        {price || 'No rate set'}
        {price && <span className="text-sm font-medium text-muted"> /night</span>}
      </p>
      <p className="text-xs leading-relaxed text-muted">
        The rate guests start from, before any weekly or monthly discount you have set.
      </p>

      <ul className="flex flex-col gap-2 border-t border-border pt-4 text-sm text-charcoal">
        <li className="flex items-start gap-2"><Users className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
          Pick dates, choose guests and book.
        </li>
        <li className="flex items-start gap-2"><AlertIcon />
          Booking and payment happen in the traveller app, so there is no Book button on this page.
        </li>
      </ul>

      <div className="flex flex-col gap-2 border-t border-border pt-4">
        <Button as={Link} to={`/host/properties/${property.id}/edit`} size="sm" className="rounded-full">
          <PencilLine className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Edit listing
        </Button>
        <Button as={Link} to={`/host/calendar/${property.id}`} size="sm" color="light" className="rounded-full">
          <CalendarDays className="mr-1.5 h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Manage calendar
        </Button>
        <Link
          to={`/host/properties/${property.id}/arrival-guide`}
          className="inline-flex min-h-[40px] items-center justify-center gap-1.5 rounded-full px-3 text-xs font-semibold text-muted hover:text-navy"
        >
          <MapPin className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          Arrival guide
        </Link>
      </div>
    </div>
  </HostCard>;

  return (
    <div className="space-y-5">
      <div>
        <Link to="/host/listings" className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-navy">
          <ChevronLeft className="h-4 w-4" strokeWidth={2} aria-hidden="true" />
          Back to listings
        </Link>
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={HOST_EYEBROW}>Host workspace</p>
            <h1 className="mt-1 text-2xl font-semibold tracking-tight text-navy sm:text-3xl">Guest preview</h1>
            <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
              Your own copy of this listing, laid out as a guest reads it. Nothing you click here books or pays for anything.
            </p>
          </div>
        </div>
      </div>

      <div className={`rounded-xl border px-4 py-3 text-sm ${STATUS_TONE[property.status] || STATUS_TONE.DRAFT}`}>
        <strong className="font-semibold">{listingStatusLabel(property.status)}</strong>
        <span className="ml-2">{statusSentence(property)}</span>
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
