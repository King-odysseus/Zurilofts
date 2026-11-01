import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import PropTypes from 'prop-types';
import { Alert, Badge, Button, Label, Textarea } from 'flowbite-react';
import {
  CalendarDays,
  ChevronLeft,
  Clock3,
  Mail,
  MapPin,
  MessageCircleMore,
  Star,
  Users,
  Wallet,
} from 'lucide-react';
import apiClient from '../api/client.js';
import { useLanguage } from '../context/LanguageContext.jsx';
import { useTranslatedLookup } from '../i18n/useTranslated.js';
import { firstImage } from '../utils/images.js';
import HostCard, { HOST_EYEBROW } from '../components/HostCard.jsx';
import VerifiedBadge from '../components/VerifiedBadge.jsx';

// The host's own view of one reservation. The guest side of the same row lives
// at /bookings/:id inside the traveller shell; a host who clicked through from
// Today, Calendar or Messages used to land there by mistake, which is why this
// page exists. Same booking, host framing: who is arriving, what they asked for,
// and what the host actually earns.

const DAY_MS = 86_400_000;

// Status reads through the shared Badge, so the colours come from the theme
// rather than a set of hex fills copied onto this page. The label is a
// dictionary key: the words below the badge are translated where they render.
const STATUS_META = {
  PENDING: { label: 'hostpreview.statusAwaitingPayment', color: 'warning' },
  CONFIRMED: { label: 'hostpreview.statusConfirmed', color: 'success' },
  CANCELLED: { label: 'hostpreview.statusCancelled', color: 'failure' },
  CONFLICT: { label: 'hostpreview.statusNeedsReview', color: 'failure' },
};

function money(value) {
  if (value == null) return '-';
  return `KES ${Number(value).toLocaleString()}`;
}

function formatDate(iso) {
  if (!iso) return '-';
  const date = new Date(iso);
  return Number.isNaN(date.getTime())
    ? '-'
    : date.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
}

function formatTime(value) {
  if (!value) return null;
  const [hour, minute] = String(value).split(':').map(Number);
  if (Number.isNaN(hour)) return String(value);
  const suffix = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 === 0 ? 12 : hour % 12;
  return `${hour12}:${String(minute || 0).padStart(2, '0')} ${suffix}`;
}

function nightsBetween(checkIn, checkOut) {
  const start = new Date(checkIn);
  const end = new Date(checkOut);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return 0;
  const nights = Math.round((end - start) / DAY_MS);
  return nights > 0 ? nights : 0;
}

// A count and its noun are two dictionary entries, never a suffix glued on by
// the page: Swahili does not pluralise the way English does, so the sentence has
// to be assembled from whole strings.
function countLabel(t, count, singularKey, pluralKey) {
  return t(count === 1 ? singularKey : pluralKey, { count });
}

function StatusPill({ status }) {
  const { t } = useLanguage();
  const meta = STATUS_META[status];
  // An unknown status is data from the server, so it is shown as it arrives;
  // only the empty case needs words of its own.
  if (!meta) return <Badge color="gray">{status || t('hostpreview.statusUnavailable')}</Badge>;
  return <Badge color={meta.color}>{t(meta.label)}</Badge>;
}

StatusPill.propTypes = { status: PropTypes.string };

// A key/value row. Two columns with the label clamped to the free space and the
// figure kept unwrapped on the right, so every money card on the page lines its
// figures up in the same column no matter how long the label runs.
function MoneyRow({ label, value, tone, hint }) {
  return <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-x-4 py-3">
    <div className="min-w-0">
      <p className={`text-xs ${tone === 'total' ? 'font-semibold text-navy' : 'text-muted'}`}>{label}</p>
      {hint && <p className="mt-1.5 text-[11px] leading-relaxed text-muted">{hint}</p>}
    </div>
    <strong className={`shrink-0 whitespace-nowrap text-right tabular-nums ${tone === 'total' ? 'text-base font-bold text-navy' : 'text-xs text-navy'}`}>{value}</strong>
  </div>;
}

MoneyRow.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.string.isRequired,
  tone: PropTypes.string,
  hint: PropTypes.string,
};

function DetailRow({ icon: Icon, label, children }) {
  return <div className="flex items-start gap-2.5">
    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted" strokeWidth={1.7} aria-hidden="true" />
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{label}</p>
      <div className="text-sm text-navy">{children}</div>
    </div>
  </div>;
}

DetailRow.propTypes = {
  icon: PropTypes.elementType.isRequired,
  label: PropTypes.string.isRequired,
  children: PropTypes.node.isRequired,
};

// The star row the rest of the app shows on a review. Empty stars keep the same
// brass hue at low opacity rather than a second pale hex: every arbitrary hex on
// this page has to be one styles.css already remaps for dark mode, and opacity
// needs no remap at all.
function GuestStars({ rating }) {
  const { t } = useLanguage();
  const value = Number(rating) || 0;
  return <span role="img" aria-label={t('stays.ratingOutOfFive', { rating: value })} className="flex items-center gap-0.5">
    {[1, 2, 3, 4, 5].map((star) => <Star
      key={star}
      className={`h-3.5 w-3.5 shrink-0 text-[#8A6B52] ${star <= value ? '' : 'opacity-30'}`}
      fill="currentColor"
      aria-hidden="true"
    />)}
  </span>;
}

GuestStars.propTypes = { rating: PropTypes.oneOfType([PropTypes.number, PropTypes.string]) };

// Clickable stars for the review form. Real buttons, so Enter and Space work and
// focus is visible without extra handling.
function RatingInput({ value, onChange }) {
  const { t } = useLanguage();
  // Every star up to the chosen value reports pressed, which matches the stars
  // drawn filled. The live line under the row names the number for anyone who
  // cannot see which stars filled in.
  return <div className="mt-1.5">
    <div role="group" aria-label={t('hostpreview.reviewGuestRating')} className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => <button
        key={star}
        type="button"
        aria-pressed={star <= value}
        aria-label={t('stays.ratingOutOfFive', { rating: star })}
        onClick={() => onChange(star)}
        className="grid h-11 w-10 place-items-center rounded-lg text-[#8A6B52] transition-colors hover:bg-surface"
      >
        <Star className={`h-6 w-6 ${star <= value ? '' : 'opacity-30'}`} fill="currentColor" aria-hidden="true" />
      </button>)}
    </div>
    <p aria-live="polite" className="text-xs text-muted">{value ? t('stays.ratingOutOfFive', { rating: value }) : ''}</p>
  </div>;
}

RatingInput.propTypes = {
  value: PropTypes.number.isRequired,
  onChange: PropTypes.func.isRequired,
};

// What other hosts said about this guest. A review comment is database text in
// whatever language its author wrote, so it goes through the translation hook
// rather than the dictionary, the same way the listing reviews do.
function GuestReviewList({ reviews }) {
  const { t } = useLanguage();
  const comments = useTranslatedLookup(reviews.map((review) => review.publicComment || ''));

  if (reviews.length === 0) {
    return <p className="text-xs leading-relaxed text-muted">{t('hostpreview.guestReviewsEmpty')}</p>;
  }

  return <ul className="flex flex-col divide-y divide-border">
    {reviews.map((review) => {
      const hostName = [review.host?.firstName, review.host?.lastName].filter(Boolean).join(' ');
      return <li key={review.id} className="flex flex-col gap-1.5 py-3 first:pt-0 last:pb-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <GuestStars rating={review.rating} />
          <span className="text-[11px] text-muted">{formatDate(review.createdAt)}</span>
        </div>
        {review.publicComment && <p className="text-sm leading-relaxed text-navy">{comments.get(review.publicComment) ?? review.publicComment}</p>}
        {/* A host can be deleted later, so the name is optional rather than a
            reason to drop the review. */}
        {hostName && <p className="text-[11px] text-muted">{hostName}</p>}
      </li>;
    })}
  </ul>;
}

GuestReviewList.propTypes = {
  reviews: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  })).isRequired,
};

// Placeholder cards, not bare bars: the loading shapes have to match the cards
// that land, otherwise the page jumps when the request resolves.
function Skeleton() {
  const { t } = useLanguage();
  return <div className="flex flex-col gap-4" role="status" aria-label={t('hostpreview.loadingReservation')}>
    <HostCard>
      <span className="block h-40 animate-pulse rounded-xl bg-inset" />
    </HostCard>
    <HostCard>
      <span className="block h-28 animate-pulse rounded-xl bg-inset" />
    </HostCard>
  </div>;
}

export default function HostReservationDetailPage() {
  const { t } = useLanguage();
  const { id: routeId } = useParams();
  const navigate = useNavigate();
  const [booking, setBooking] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [messagePending, setMessagePending] = useState(false);

  // The guest block (identity, past reviews, review eligibility) is its own
  // request. A failure here is reported inside that section only, because the
  // reservation itself loaded fine.
  const [guestBlock, setGuestBlock] = useState(null);
  const [guestState, setGuestState] = useState('loading');
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewComment, setReviewComment] = useState('');
  const [reviewPrivateNote, setReviewPrivateNote] = useState('');
  const [reviewSaving, setReviewSaving] = useState(false);
  // '' | 'rating' | 'failed'. The key is chosen where it renders, so the copy
  // stays translated if the language changes while the form is open.
  const [reviewError, setReviewError] = useState('');
  // The review this host just posted, kept until the refetch returns the
  // server's own copy of it.
  const [submittedReview, setSubmittedReview] = useState(null);
  // A second click can land before React re-renders the disabled button, so the
  // in-flight guard is a ref; the state flag only drives the button label.
  const reviewInFlightRef = useRef(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await apiClient.get(`/bookings/${routeId}`);
      setBooking(response.data.data);
    } catch (loadError) {
      setError(loadError.response?.status === 404
        ? t('hostpreview.reservationNotFound')
        : t('hostpreview.loadReservationFailed'));
    } finally {
      setLoading(false);
    }
  }, [routeId, t]);

  useEffect(() => {
    load();
  }, [load]);

  const loadGuestBlock = useCallback(async () => {
    setGuestState('loading');
    try {
      const response = await apiClient.get(`/guest-reviews/booking/${routeId}`);
      setGuestBlock(response.data.data);
      setGuestState('ready');
    } catch {
      // The section keeps whatever it already had; only a first load has nothing
      // to show, and that case renders the failure line with a retry.
      setGuestState('failed');
    }
  }, [routeId]);

  useEffect(() => {
    // Everything in this block belongs to one reservation, so switching
    // reservations drops it (and any half-written review of the previous guest)
    // before the new request starts.
    setGuestBlock(null);
    setSubmittedReview(null);
    setReviewOpen(false);
    setReviewError('');
    setReviewRating(0);
    setReviewComment('');
    setReviewPrivateNote('');
    loadGuestBlock();
  }, [loadGuestBlock]);

  async function submitGuestReview(event) {
    event.preventDefault();
    if (reviewInFlightRef.current) return;
    if (!reviewRating) {
      setReviewError('rating');
      return;
    }

    reviewInFlightRef.current = true;
    setReviewSaving(true);
    setReviewError('');
    try {
      const response = await apiClient.post('/guest-reviews', {
        bookingId: booking.id,
        rating: reviewRating,
        publicComment: reviewComment.trim() || undefined,
        privateNote: reviewPrivateNote.trim() || undefined,
      });
      const created = response.data.data;
      // Shown at the top of the list straight away so the host sees their words
      // without waiting for the round trip below.
      if (created) {
        setGuestBlock((current) => (current
          ? { ...current, reviews: [created, ...(current.reviews || []).filter((item) => item.id !== created.id)] }
          : current));
        setSubmittedReview(created);
      }
      setReviewOpen(false);
      // Eligibility and the list come from the server afterwards: a cached
      // "canReview: true" must not leave the form open for a second review.
      await loadGuestBlock();
    } catch {
      setReviewError('failed');
    } finally {
      reviewInFlightRef.current = false;
      setReviewSaving(false);
    }
  }

  async function openConversation() {
    if (!booking) return;
    setMessagePending(true);
    try {
      const response = await apiClient.post('/conversations', { bookingId: booking.id });
      navigate(`/host/inbox/${response.data.data.id}`);
    } catch {
      setError(t('hostpreview.openConversationFailed'));
    } finally {
      setMessagePending(false);
    }
  }

  if (loading) return <Skeleton />;

  if (error && !booking) {
    return <HostCard>
      <div className="mx-auto flex max-w-md flex-col items-center gap-3 py-6 text-center">
        <span className="grid h-11 w-11 place-items-center rounded-full bg-surface text-muted">
          <CalendarDays className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" />
        </span>
        <h1 className="mt-1 text-base font-semibold text-navy">{t('hostpreview.reservationUnavailable')}</h1>
        <p className="text-sm leading-relaxed text-muted">{error}</p>
        <div className="mt-2 flex flex-wrap justify-center gap-2">
          <Button type="button" size="sm" onClick={load} className="min-h-11 sm:min-h-0">{t('hostpreview.tryAgain')}</Button>
          <Button as={Link} to="/host/reservations" color="light" size="sm" className="min-h-11 sm:min-h-0">
            {t('hostpreview.allReservations')}
          </Button>
        </div>
      </div>
    </HostCard>;
  }

  if (!booking) return null;

  const property = booking.property || {};
  const guest = booking.user || {};
  const image = firstImage(property);
  const nights = nightsBetween(booking.checkIn, booking.checkOut);
  const guestName = [guest.firstName, guest.lastName].filter(Boolean).join(' ') || t('hostpreview.guest');
  const addOnTotal = booking.addonsSubtotal ?? (booking.addOns || []).reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
  const additionalGuests = booking.additionalGuests || [];

  // The guest block arrives separately, so every field here is optional.
  const guestProfile = guestBlock?.guest || null;
  const guestProfileName = [guestProfile?.firstName, guestProfile?.lastName].filter(Boolean).join(' ') || guestName;
  const guestReviews = guestBlock?.reviews || [];
  const guestSummary = guestBlock?.summary || null;
  const guestEligibility = guestBlock?.eligibility || {};
  // The server's copy of this host's review wins once the refetch lands; until
  // then the one just posted stands in for it.
  const myReview = guestBlock?.myReview || submittedReview;
  const reviewIsDone = Boolean(myReview) || Boolean(guestEligibility.alreadyReviewed);
  // Not reviewable and not yet reviewed means not reviewable yet. Reading an
  // unknown reason that way keeps a form from opening that the API would reject.
  const reviewIsWaiting = !reviewIsDone && !guestEligibility.canReview;
  const listedReviewIds = new Set(guestReviews.map((review) => review.id));

  return <div className="flex flex-col gap-5 sm:gap-6">
    <div className="flex flex-wrap items-center justify-between gap-3">
      <Link to="/host/reservations" className="inline-flex min-h-11 items-center gap-1.5 text-xs font-semibold text-muted transition-colors hover:text-navy">
        <ChevronLeft className="h-3.5 w-3.5" strokeWidth={2} aria-hidden="true" />
        {t('hostpreview.allReservations')}
      </Link>
      <StatusPill status={booking.status} />
    </div>

    {error && <Alert color="failure">
      <div className="flex w-full flex-wrap items-center justify-between gap-3">
        <p className="min-w-0 flex-1">{error}</p>
        <Button size="sm" color="light" onClick={load} className="min-h-11 sm:min-h-0">{t('hostpreview.tryAgain')}</Button>
      </div>
    </Alert>}

    <header className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="min-w-0">
        <p className={HOST_EYEBROW}>{t('hostpreview.reservationEyebrow')}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-navy sm:text-3xl">{guestName}</h1>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {property.title || t('hostpreview.yourListing')} <span aria-hidden="true" className="text-border">|</span> {countLabel(t, booking.guests || 1, 'hostpreview.guestOne', 'hostpreview.guestOther')} <span aria-hidden="true" className="text-border">|</span> {countLabel(t, nights, 'hostpreview.nightOne', 'hostpreview.nightOther')}
        </p>
      </div>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button type="button" size="sm" onClick={openConversation} disabled={messagePending} className="min-h-11 sm:min-h-0">
          <MessageCircleMore className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
          {messagePending ? t('hostpreview.opening') : t('hostpreview.messageGuest')}
        </Button>
        {property.id && <Button as={Link} to={`/host/calendar/${property.id}`} color="light" size="sm" className="min-h-11 sm:min-h-0">{t('hostpreview.calendar')}</Button>}
      </div>
    </header>

    <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,340px)]">
      <div className="flex flex-col gap-5 lg:gap-6">
        {/* flush: the special-request hairline runs to the card edge, so the
            body and that strip re-apply the same 16px gutter as the card head. */}
        <HostCard flush title={t('hostpreview.stay')} className="overflow-hidden">
          <div className="flex flex-col gap-4 px-4 py-4 sm:flex-row">
            <div className="h-32 w-full shrink-0 overflow-hidden rounded-xl bg-surface sm:h-24 sm:w-32">
              {image
                ? <img src={image} alt="" className="h-full w-full object-cover" />
                : <span className="grid h-full w-full place-items-center text-muted"><CalendarDays className="h-5 w-5" strokeWidth={1.6} aria-hidden="true" /></span>}
            </div>
            <div className="min-w-0 flex-1 space-y-3">
              <DetailRow icon={CalendarDays} label={t('hostpreview.stay')}>
                {formatDate(booking.checkIn)} <span className="text-muted">{t('hostpreview.to')}</span> {formatDate(booking.checkOut)}
              </DetailRow>
              <DetailRow icon={Clock3} label={t('hostpreview.arrivalAndDeparture')}>
                {t('hostpreview.checkIn')} {formatTime(booking.checkInTime) || t('hostpreview.timeFlexible')} <span aria-hidden="true" className="text-border">|</span> {t('hostpreview.checkOut')} {formatTime(booking.checkOutTime) || t('hostpreview.byCheckoutTime')}
              </DetailRow>
              <DetailRow icon={MapPin} label={t('hostpreview.listing')}>
                {property.title || t('hostpreview.yourListing')}{property.location ? `, ${property.location}` : ''}
              </DetailRow>
            </div>
          </div>

          {booking.specialRequests && <div className="border-t border-border px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('hostpreview.whatGuestAskedFor')}</p>
            <p className="mt-2 text-sm leading-relaxed text-navy">{booking.specialRequests}</p>
          </div>}
        </HostCard>

        <HostCard title={t('hostpreview.whoIsArriving')}>
          <div className="flex items-center gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-full bg-navy-bg text-xs font-bold text-white">
              {guest.avatar ? <img src={guest.avatar} alt="" className="h-full w-full object-cover" /> : (guestName[0] || 'G').toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-navy">{guestName}</p>
              <p className="flex items-center gap-1.5 truncate text-xs text-muted">
                <Users className="h-3 w-3 shrink-0" strokeWidth={1.8} aria-hidden="true" />
                {countLabel(t, booking.guests || 1, 'hostpreview.guestOne', 'hostpreview.guestOther')}
              </p>
            </div>
          </div>

          {guest.email && <p className="flex items-center gap-2 text-xs text-muted">
            <Mail className="h-3.5 w-3.5 shrink-0" strokeWidth={1.8} aria-hidden="true" />
            <a href={`mailto:${guest.email}`} className="min-w-0 truncate underline underline-offset-2 hover:text-navy">{guest.email}</a>
          </p>}

          {/* Inset rather than outlined: a border here would be a box inside the
              card's own border. */}
          {additionalGuests.length > 0 && <div className="rounded-xl bg-surface px-4 py-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('hostpreview.alsoStaying')}</p>
            <ul className="mt-2 space-y-1.5">
              {additionalGuests.map((person, index) => <li key={`${person.firstName}-${person.lastName}-${index}`} className="text-sm text-navy">
                {[person.firstName, person.lastName].filter(Boolean).join(' ') || t('hostpreview.guest')}
              </li>)}
            </ul>
          </div>}
        </HostCard>

        {/* Who this guest is and what other hosts made of them, plus the review
            this host leaves behind. Loaded after the reservation so a slow
            review service can never hold up the details above it. */}
        <HostCard title={t('hostpreview.guestReviewsTitle')}>
          {guestState === 'failed' && <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="min-w-0 flex-1 text-xs leading-relaxed text-muted">{t('hostpreview.guestReviewsFailed')}</p>
            <Button type="button" size="sm" color="light" onClick={loadGuestBlock} className="min-h-11 sm:min-h-0">{t('hostpreview.tryAgain')}</Button>
          </div>}

          {/* Only the first load has nothing to show; later refetches keep the
              block on screen instead of flashing a loading line. */}
          {guestState === 'loading' && !guestBlock && <p role="status" className="text-xs text-muted">{t('common.loading')}</p>}

          {guestBlock && <div className="flex flex-col gap-4">
            {/* On one reservation an unverified identity is a legitimate
                caution, so it is stated as a fact and left at that. */}
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1.5">
              <p className="min-w-0 truncate text-sm font-semibold text-navy">{guestProfileName}</p>
              {guestProfile?.identityVerified
                ? <VerifiedBadge label={t('hostpreview.verifiedGuest')} hint={t('hostpreview.verifiedGuestHint')} />
                : guestProfile && <span className="text-xs text-muted">{t('hostpreview.guestIdentityUnverified')}</span>}
            </div>

            {guestSummary && guestSummary.totalReviews > 0 && <p className="text-xs font-semibold text-navy">
              {t(guestSummary.totalReviews === 1
                ? 'hostpreview.guestReviewsSummary_one'
                : 'hostpreview.guestReviewsSummary_other', {
                rating: Number(guestSummary.averageRating || 0).toFixed(1),
                count: guestSummary.totalReviews,
              })}
            </p>}

            <GuestReviewList reviews={guestReviews} />

            {reviewIsDone
              ? <div className="rounded-xl bg-surface px-4 py-3">
                <p className="text-sm font-semibold text-navy">
                  {submittedReview ? t('hostpreview.reviewGuestSaved') : t('hostpreview.reviewGuestDone')}
                </p>
                {myReview && <div className="mt-2 flex flex-col gap-1.5">
                  <GuestStars rating={myReview.rating} />
                  {/* The same review can arrive in both the list above and
                      myReview, so its words are only repeated when the list does
                      not already carry them. */}
                  {myReview.publicComment && !listedReviewIds.has(myReview.id) && <p className="text-xs leading-relaxed text-muted">{myReview.publicComment}</p>}
                </div>}
              </div>
              : reviewIsWaiting
                ? <p className="rounded-xl bg-surface px-4 py-3 text-xs leading-relaxed text-muted">{t('hostpreview.reviewGuestWaiting')}</p>
                : !reviewOpen
                  ? <div>
                    <Button type="button" size="sm" onClick={() => setReviewOpen(true)} className="min-h-11 sm:min-h-0">
                      <Star className="h-4 w-4" strokeWidth={1.8} aria-hidden="true" />
                      {t('hostpreview.reviewGuest')}
                    </Button>
                  </div>
                  : <form onSubmit={submitGuestReview} className="flex flex-col gap-3 rounded-xl bg-surface px-4 py-3">
                    <h3 className="text-sm font-semibold text-navy">{t('hostpreview.reviewGuestHeading')}</h3>

                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">{t('hostpreview.reviewGuestRating')}</p>
                      <RatingInput value={reviewRating} onChange={(next) => { setReviewRating(next); if (reviewError === 'rating') setReviewError(''); }} />
                      {/* Beside the stars, which is where the mistake is. */}
                      {reviewError === 'rating' && <p role="alert" className="mt-1 text-xs font-semibold text-red-600">{t('hostpreview.reviewGuestRatingRequired')}</p>}
                    </div>

                    <div>
                      <Label htmlFor="guest-review-comment" className="mb-1.5 block">{t('hostpreview.reviewGuestComment')}</Label>
                      <Textarea
                        id="guest-review-comment"
                        rows={4}
                        value={reviewComment}
                        onChange={(event) => setReviewComment(event.target.value)}
                        placeholder={t('hostpreview.reviewGuestCommentPlaceholder')}
                      />
                    </div>

                    <div>
                      <Label htmlFor="guest-review-private" className="mb-1.5 block">{t('hostpreview.reviewGuestPrivate')}</Label>
                      <Textarea
                        id="guest-review-private"
                        rows={3}
                        value={reviewPrivateNote}
                        onChange={(event) => setReviewPrivateNote(event.target.value)}
                        placeholder={t('hostpreview.reviewGuestPrivatePlaceholder')}
                      />
                    </div>

                    {reviewError === 'failed' && <p role="alert" className="text-xs font-semibold text-red-600">{t('hostpreview.reviewGuestFailed')}</p>}

                    <div className="flex flex-wrap gap-2">
                      <Button type="submit" size="sm" disabled={reviewSaving} className="min-h-11 sm:min-h-0">
                        {reviewSaving ? t('hostpreview.reviewGuestSubmitting') : t('hostpreview.reviewGuestSubmit')}
                      </Button>
                      {/* Cancelling keeps the typed text, so reopening the form
                          does not lose a half-written review. */}
                      <Button type="button" size="sm" color="light" disabled={reviewSaving} onClick={() => { setReviewOpen(false); setReviewError(''); }} className="min-h-11 sm:min-h-0">
                        {t('common.cancel')}
                      </Button>
                    </div>
                  </form>}
          </div>}
        </HostCard>
      </div>

      <div className="flex flex-col gap-5 lg:gap-6">
        <HostCard title={<span className="flex items-center gap-2">
          <Wallet className="h-4 w-4 shrink-0 text-muted" strokeWidth={1.8} aria-hidden="true" />
          {t('hostpreview.whatYouEarn')}
        </span>}>
          <div className="divide-y divide-border">
            {booking.hostNetAmount != null
              ? <>
                <MoneyRow label={t('hostpreview.yourEarnings')} value={money(booking.hostNetAmount)} tone="total" />
                {booking.hostCommission != null && <MoneyRow label={t('hostpreview.platformCommission')} value={`- ${money(booking.hostCommission)}`} hint={t('hostpreview.platformCommissionHint')} />}
                {booking.withholdingTax != null && <MoneyRow label={t('hostpreview.withholdingTax')} value={`- ${money(booking.withholdingTax)}`} hint={t('hostpreview.withholdingTaxHint')} />}
                {booking.hostPayableAt && <MoneyRow label={t('hostpreview.releasesToBalance')} value={formatDate(booking.hostPayableAt)} />}
                {booking.hostFundsReleasedAt && <MoneyRow label={t('hostpreview.released')} value={formatDate(booking.hostFundsReleasedAt)} />}
              </>
              : <p className="py-4 text-xs leading-relaxed text-muted">
                {t('hostpreview.earningsPending')}
              </p>}
          </div>
        </HostCard>

        <HostCard title={t('hostpreview.whatGuestPaid')}>
          <div className="divide-y divide-border">
            <MoneyRow label={countLabel(t, nights, 'hostpreview.nightsAtRateOne', 'hostpreview.nightsAtRateOther')} value={money(booking.subtotal)} />
            {booking.cleaningFee > 0 && <MoneyRow label={t('hostpreview.cleaningFee')} value={money(booking.cleaningFee)} />}
            {booking.serviceFee > 0 && <MoneyRow label={t('hostpreview.guestServiceFee')} value={money(booking.serviceFee)} />}
            {booking.lateCheckoutFee > 0 && <MoneyRow label={t('hostpreview.lateCheckOut')} value={money(booking.lateCheckoutFee)} />}
            {(booking.discountAmount || 0) > 0 && <MoneyRow label={`${t('hostpreview.discount')}${booking.promoCode?.code ? ` (${booking.promoCode.code})` : ''}`} value={`- ${money(booking.discountAmount)}`} />}
            {addOnTotal > 0 && <MoneyRow label={t('hostpreview.addOns')} value={money(addOnTotal)} />}
            <MoneyRow label={t('hostpreview.guestTotal')} value={money(booking.total)} tone="total" />
          </div>
          {booking.paymentMethod && <p className="text-[11px] text-muted">
            {t('hostpreview.paidBy', { method: booking.paymentMethod === 'mpesa' ? 'M-PESA' : booking.paymentMethod })}
            {booking.paidAt ? ` ${t('hostpreview.paidOn', { date: formatDate(booking.paidAt) })}` : ''}
          </p>}
        </HostCard>

        {(booking.addOns || []).length > 0 && <HostCard title={t('hostpreview.addOnsBooked')}>
          <ul className="space-y-2">
            {booking.addOns.map((item) => <li key={item.id} className="flex items-center justify-between gap-3 text-xs">
              <span className="min-w-0 truncate text-navy">{item.addOn?.name || t('hostpreview.addOn')} <span className="text-muted">x{item.quantity}</span></span>
              <span className="shrink-0 tabular-nums text-muted">{money(item.quantity * item.unitPrice)}</span>
            </li>)}
          </ul>
        </HostCard>}
      </div>
    </div>
  </div>;
}
