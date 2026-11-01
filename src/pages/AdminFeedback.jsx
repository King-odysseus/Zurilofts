import { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import {
  Alert,
  Button,
  Modal,
  ModalBody,
  ModalFooter,
  ModalHeader,
  Spinner,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeadCell,
  TableRow,
  TextInput,
} from 'flowbite-react';
import { Search, Star } from 'lucide-react';
import apiClient from '../api/client.js';
import AdminPageHeader from '../components/admin/AdminPageHeader.jsx';
import MetricCard from '../components/admin/MetricCard.jsx';
import Panel, { PanelFooter, PanelHead } from '../components/admin/Panel.jsx';
import StatusBadge from '../components/admin/StatusBadge.jsx';
import EmptyState from '../components/admin/EmptyState.jsx';
import ConfirmDialog from '../components/admin/ConfirmDialog.jsx';
import AdminPagination from '../components/admin/AdminPagination.jsx';
import SelectMenu from '../components/SelectMenu.jsx';
import TableActionsMenu from '../components/TableActionsMenu.jsx';
import usePagedResource from '../hooks/usePagedResource.js';
import { useLanguage } from '../context/LanguageContext.jsx';

// Module scope: rebuilt per render they would be new arrays every time, and the
// filter selects would remount on every keystroke in the search box.
const VISIBILITY_OPTIONS = [
  { value: '', label: 'All reviews' },
  { value: 'published', label: 'Published' },
  { value: 'hidden', label: 'Hidden' },
];

const RATING_OPTIONS = [
  { value: '', label: 'All ratings' },
  ...[5, 4, 3, 2, 1].map((rating) => ({
    value: String(rating),
    label: `${rating} star${rating === 1 ? '' : 's'}`,
  })),
];

// Stable identity for the hook's params argument. The endpoint supports paging
// only - every filter on this page is applied to the rows already loaded - so
// this must never change or the list would refetch for nothing.
const NO_QUERY_PARAMS = {};

const DATE_FORMAT = new Intl.DateTimeFormat('en-GB', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
});

/** A review can outlive its guest account and its listing, so neither is assumed. */
function guestName(review) {
  if (!review) return 'Guest';
  const name = [review.user?.firstName, review.user?.lastName].filter(Boolean).join(' ').trim();
  return name || 'Guest';
}

/** Intl.format throws on an invalid date, and one bad timestamp must not blank the table. */
function formatDay(value) {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return DATE_FORMAT.format(date);
}

function satisfactionLabel(value) {
  if (!value) return 'Not recorded';
  const text = String(value);
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/**
 * Five stars plus the number. The wrapper carries the accessible rating and the
 * glyphs are hidden, so a screen reader hears "Rated 4 out of 5" once instead of
 * five separate star images.
 */
function StarRating({ rating }) {
  const numeric = Number(rating);
  const filled = Number.isFinite(numeric) ? Math.round(numeric) : 0;
  return (
    <span className="inline-flex items-center gap-0.5" role="img" aria-label={`Rated ${filled} out of 5`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`h-3.5 w-3.5 ${star <= filled ? 'text-primary-600' : 'text-muted'}`}
          fill={star <= filled ? 'currentColor' : 'none'}
          strokeWidth={1.8}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

StarRating.propTypes = {
  rating: PropTypes.number,
};

/** One optional sub-score. Nulls are normal: a guest may skip the sub-ratings. */
function SubRating({ label, value }) {
  const { t } = useLanguage();
  const numeric = Number(value);
  const rated = Number.isFinite(numeric) && numeric > 0;
  return (
    <div>
      <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</span>
      {rated ? (
        <span className="mt-1 flex items-center gap-2">
          <StarRating rating={numeric} />
          <span className="text-xs text-charcoal">{numeric}/5</span>
        </span>
      ) : (
        <span className="mt-1 block text-xs text-muted">{t('admin.notRated')}</span>
      )}
    </div>
  );
}

SubRating.propTypes = {
  label: PropTypes.string.isRequired,
  value: PropTypes.number,
};

function ReviewRow({ review, onView, onModerate }) {
  const { t } = useLanguage();
  const comment = (review.publicComment || '').trim();
  const isLongComment = comment.length > 90;

  // Only actions that make sense in this row's current state are listed. A
  // "Hide" item on an already-hidden review reads as a broken button.
  const actions = [
    { label: 'View details', icon: 'view', onClick: () => onView(review) },
    review.hidden
      ? { label: 'Unhide review', icon: 'approve', onClick: () => onModerate(review, 'unhide') }
      : { label: 'Hide review', icon: 'pause', onClick: () => onModerate(review, 'hide') },
    { label: 'Delete review', icon: 'delete', danger: true, onClick: () => onModerate(review, 'delete') },
  ];

  return (
    <TableRow>
      <TableCell>
        <strong className="block truncate text-sm font-semibold text-navy">{guestName(review)}</strong>
        <span className="block truncate text-xs text-muted">{review.user?.email || 'No email on file'}</span>
      </TableCell>

      <TableCell>
        <strong className="block text-sm font-semibold text-navy">
          {review.property?.title || 'Listing removed'}
        </strong>
        {review.property?.location && (
          <span className="block text-xs text-muted">{review.property.location}</span>
        )}
      </TableCell>

      <TableCell>
        <StarRating rating={Number(review.rating)} />
        <span className="mt-1 block text-xs text-muted">{review.rating} out of 5</span>
      </TableCell>

      <TableCell className="max-w-xs">
        {comment ? (
          <>
            <p className="line-clamp-2 text-sm leading-relaxed text-charcoal">{comment}</p>
            {isLongComment && (
              <button
                type="button"
                onClick={() => onView(review)}
                className="mt-1 text-xs font-semibold text-primary-600 hover:underline"
              >
                {t('admin.readFullReview')}
              </button>
            )}
          </>
        ) : (
          <p className="text-sm text-muted">{t('admin.noPublicComment')}</p>
        )}
      </TableCell>

      <TableCell>
        <span className="block whitespace-nowrap text-sm text-charcoal">{formatDay(review.createdAt)}</span>
      </TableCell>

      <TableCell>
        <StatusBadge tone={review.hidden ? 'warning' : 'success'}>
          {review.hidden ? 'Hidden' : 'Published'}
        </StatusBadge>
      </TableCell>

      <TableCell>
        <div className="flex justify-end">
          <TableActionsMenu label={`Actions for the review by ${guestName(review)}`} actions={actions} />
        </div>
      </TableCell>
    </TableRow>
  );
}

ReviewRow.propTypes = {
  review: PropTypes.shape({
    id: PropTypes.string.isRequired,
    rating: PropTypes.number,
    publicComment: PropTypes.string,
    hidden: PropTypes.bool,
    createdAt: PropTypes.string,
    user: PropTypes.shape({
      firstName: PropTypes.string,
      lastName: PropTypes.string,
      email: PropTypes.string,
    }),
    property: PropTypes.shape({
      title: PropTypes.string,
      location: PropTypes.string,
    }),
  }).isRequired,
  onView: PropTypes.func.isRequired,
  onModerate: PropTypes.func.isRequired,
};

/**
 * Wording for the confirmation step. Deleting a review removes what a guest
 * wrote with no undo, so it always points at hiding as the reversible option.
 */
function moderationCopy(dialog) {
  if (!dialog) return null;
  const name = guestName(dialog.review);
  const propertyTitle = dialog.review.property?.title || 'this listing';

  if (dialog.kind === 'delete') {
    return {
      title: 'Delete this review',
      description: (
        <>
          The review by <strong className="font-semibold text-navy">{name}</strong> for{' '}
          <strong className="font-semibold text-navy">{propertyTitle}</strong> will be removed
          permanently. This cannot be undone. If the concern is the wording rather than the stay
          itself, hiding it keeps the record and takes it off the public listing.
        </>
      ),
      confirmLabel: 'Delete review',
      cancelLabel: 'Keep review',
      tone: 'danger',
    };
  }

  if (dialog.kind === 'hide') {
    return {
      title: 'Hide this review',
      description: (
        <>
          The review by <strong className="font-semibold text-navy">{name}</strong> for{' '}
          <strong className="font-semibold text-navy">{propertyTitle}</strong> will stop showing on
          the public listing. The record is kept, so you can publish it again at any time.
        </>
      ),
      confirmLabel: 'Hide review',
      cancelLabel: 'Keep it published',
      tone: 'warning',
    };
  }

  return {
    title: 'Publish this review again',
    description: (
      <>
        The review by <strong className="font-semibold text-navy">{name}</strong> for{' '}
        <strong className="font-semibold text-navy">{propertyTitle}</strong> will be shown on the
        public listing again.
      </>
    ),
    confirmLabel: 'Unhide review',
    cancelLabel: 'Leave it hidden',
    tone: 'warning',
  };
}

function AdminFeedback() {
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('');
  const [ratingFilter, setRatingFilter] = useState('');
  const [detailId, setDetailId] = useState(null);
  const [dialog, setDialog] = useState(null);
  const [moderating, setModerating] = useState(false);
  const [dialogError, setDialogError] = useState('');
  const [message, setMessage] = useState('');
  const [messageTone, setMessageTone] = useState('success');

  const {
    data, pagination, extra, page, setPage, loading, error, refetch,
  } = usePagedResource('/admin/reviews', NO_QUERY_PARAMS, { limit: 20 });

  // The endpoint's summary block is platform-wide; the hook keeps every top-level
  // block other than data/pagination in `extra`, and a refetch replaces it with
  // fresh numbers rather than zeroing it while the request is in flight.
  const summary = extra?.summary || null;
  const averageRating = summary ? Number(summary.averageRating) || 0 : null;
  const totalReviews = summary ? Number(summary.totalReviews) || 0 : null;

  // Page-scoped counts. The labels say "on this page" because the server pages
  // this list: an admin must never read one page as the whole platform.
  const hiddenOnPage = data.filter((review) => review.hidden).length;
  const lowRatedOnPage = data.filter((review) => Number(review.rating) <= 2).length;

  const filtersActive = Boolean(search.trim() || visibility || ratingFilter);

  // Search, visibility and rating are applied to the loaded page only. The API
  // accepts paging and nothing else, and a fake "filtered" total would be a lie,
  // so the toolbar states the scope instead of pretending it is server-side.
  const visibleReviews = useMemo(() => {
    const query = search.trim().toLowerCase();
    return data.filter((review) => {
      if (visibility === 'published' && review.hidden) return false;
      if (visibility === 'hidden' && !review.hidden) return false;
      if (ratingFilter && Number(review.rating) !== Number(ratingFilter)) return false;
      if (!query) return true;
      const haystack = [
        review.user?.firstName,
        review.user?.lastName,
        review.property?.title,
        review.publicComment,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return haystack.includes(query);
    });
  }, [data, search, visibility, ratingFilter]);

  // Read the open review from the fetched rows rather than from a copy, so a
  // refetch after a moderation action shows the new state, and a deleted review
  // closes the modal by itself because it is no longer in the list.
  const detail = useMemo(
    () => data.find((review) => review.id === detailId) || null,
    [data, detailId],
  );

  function clearFilters() {
    setSearch('');
    setVisibility('');
    setRatingFilter('');
    setMessage('');
  }

  function changeFilter(setter, value) {
    setter(value);
    // Page 4 of an unfiltered list rarely exists once a filter is applied, and
    // asking for it would come back empty and read as a broken filter.
    setPage(1);
    setMessage('');
  }

  function openModeration(review, kind) {
    // One modal at a time: the detail view hands over to the confirmation step
    // instead of stacking a second dialog on top of it.
    setDetailId(null);
    setDialogError('');
    setDialog({ review, kind });
  }

  function closeDialog() {
    // A dialog closed mid-request would let the in-flight result land on the
    // next review the admin opens.
    if (moderating) return;
    setDialog(null);
    setDialogError('');
  }

  async function runModeration() {
    if (!dialog) return;
    const { review, kind } = dialog;
    const name = guestName(review);

    setModerating(true);
    setDialogError('');
    setMessage('');

    try {
      if (kind === 'delete') {
        await apiClient.delete(`/admin/reviews/${review.id}`);
        setMessage(`Review by ${name} deleted.`);
        setMessageTone('success');
        // Deleting the only row on a later page would leave the admin staring at
        // an empty page, so step back as well. Both updates land in one render,
        // which is one request, not two.
        if (data.length === 1 && page > 1) setPage(page - 1);
        refetch();
      } else {
        const hidden = kind === 'hide';
        await apiClient.patch(`/admin/reviews/${review.id}`, { hidden });
        setMessage(
          hidden
            ? `Review by ${name} is now hidden from the public listing.`
            : `Review by ${name} is published again.`,
        );
        setMessageTone('success');
        // The server owns the stored state and recomputes the summary, so the
        // row is re-read rather than patched locally.
        refetch();
      }
      setDialog(null);
    } catch (err) {
      const detailMessage = err.response?.data?.error
        || 'That action could not be completed. Please try again.';
      // Kept in the dialog and in the page banner, so the reason survives the
      // dialog being dismissed.
      setDialogError(detailMessage);
      setMessageTone('error');
      setMessage(detailMessage);
    } finally {
      setModerating(false);
    }
  }

  const copy = moderationCopy(dialog);

  return (
    <div className="space-y-8">
      <AdminPageHeader
        title={t('admin.reviewsTitle')}
        description={t('admin.reviewsDescription')}
        actions={(
          <Button color="light" type="button" onClick={refetch}>
            Refresh
          </Button>
        )}
      />

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label={t('admin.averageRating')}
          value={averageRating === null ? '-' : averageRating.toFixed(1)}
          note={t('admin.averageNote')}
        />
        <MetricCard
          label={t('admin.totalReviews')}
          value={totalReviews === null ? '-' : totalReviews}
          note={t('admin.platformWide')}
        />
        <MetricCard
          label={t('admin.hiddenOnPage')}
          value={hiddenOnPage}
          note={`Of the ${data.length} review${data.length === 1 ? '' : 's'} shown here`}
          tone={hiddenOnPage > 0 ? 'warning' : 'default'}
        />
        <MetricCard
          label={t('admin.lowRatedOnPage')}
          value={lowRatedOnPage}
          note={t('admin.ratedTwoOrFewer')}
          tone={lowRatedOnPage > 0 ? 'warning' : 'default'}
        />
      </div>

      <Panel>
        <PanelHead
          title={t('admin.reviewModeration')}
          subtitle={t('admin.reviewModerationHint')}
        />

        <div className="space-y-3 border-b border-border px-5 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative w-full lg:max-w-xs [&_input]:border-0 [&_input]:bg-surface [&_input]:pl-9">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
                strokeWidth={1.8}
                aria-hidden="true"
              />
              <TextInput
                type="search"
                value={search}
                onChange={(event) => changeFilter(setSearch, event.target.value)}
                placeholder={t('admin.searchReview')}
                aria-label={t('admin.searchReviewLabel')}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <SelectMenu
                value={visibility}
                onChange={(next) => changeFilter(setVisibility, next)}
                options={VISIBILITY_OPTIONS}
                ariaLabel={t('admin.filterVisibility')}
                wrapperClassName="w-40"
                sizing="sm"
              />
              <SelectMenu
                value={ratingFilter}
                onChange={(next) => changeFilter(setRatingFilter, next)}
                options={RATING_OPTIONS}
                ariaLabel={t('admin.filterRating')}
                wrapperClassName="w-40"
                sizing="sm"
              />
              {filtersActive && (
                <Button size="xs" color="light" type="button" onClick={clearFilters}>
                  {t('admin.clearFilters')}
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted" aria-live="polite">
            {filtersActive
              ? `Showing ${visibleReviews.length} of ${data.length} review${data.length === 1 ? '' : 's'} on this page. These filters do not search other pages.`
              : `Filters and the counts above cover the ${data.length} review${data.length === 1 ? '' : 's'} on this page, not the whole platform.`}
          </p>
        </div>

        {message && (
          <Alert
            color={messageTone === 'error' ? 'failure' : 'success'}
            className="mx-5 mt-5 text-center"
            role="status"
          >
            {message}
          </Alert>
        )}

        {loading ? (
          <div className="flex flex-col items-center gap-2 px-5 py-12 text-center">
            <Spinner size="lg" />
            <strong className="text-sm font-semibold text-navy">{t('admin.loadingReviews')}</strong>
            <p className="text-xs text-muted">{t('admin.loadingReviewsHint')}</p>
          </div>
        ) : error ? (
          // A failed request must not look like an empty list, so it gets its own
          // state, the server's reason, and a way to retry.
          <EmptyState
            kind="error"
            title={t('admin.couldNotLoadReviews')}
            description={error}
            action={(
              <Button color="light" type="button" onClick={refetch}>
                Try again
              </Button>
            )}
          />
        ) : data.length === 0 ? (
          // Nothing on this page at all. With a filter active the page itself is
          // empty, which is a different story from "the platform has no reviews".
          <EmptyState
            kind="empty"
            title={filtersActive ? t('admin.noReviewsOnPage') : t('admin.noReviewsYet')}
            description={
              filtersActive
                ? 'Filters only cover the page in view, and this page has no reviews. Clear the filters or open another page.'
                : 'Reviews appear here once a guest rates a stay after check-out.'
            }
            action={
              filtersActive ? (
                <Button color="light" type="button" onClick={clearFilters}>
                  {t('admin.clearFilters')}
                </Button>
              ) : undefined
            }
          />
        ) : visibleReviews.length === 0 ? (
          <EmptyState
            kind="empty"
            title={t('admin.noReviewsMatch')}
            description={t('admin.noReviewsMatchHint')}
            action={(
              <Button color="light" type="button" onClick={clearFilters}>
                {t('admin.clearFilters')}
              </Button>
            )}
          />
        ) : (
          <div className="overflow-x-auto">
            <Table hoverable aria-label={t('admin.guestReviews')}>
              <TableHead>
                <TableRow>
                  <TableHeadCell>{t('admin.colGuest').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colProperty').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colRating').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colComment').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colSubmitted').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>{t('admin.colVisibility').toUpperCase()}</TableHeadCell>
                  <TableHeadCell>
                    <span className="block text-right">ACTIONS</span>
                  </TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {visibleReviews.map((review) => (
                  <ReviewRow
                    key={review.id}
                    review={review}
                    onView={(target) => setDetailId(target.id)}
                    onModerate={openModeration}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* No footer under a failed or empty list: "0 reviews" adds nothing to
            the state already on screen. */}
        {!loading && !error && data.length > 0 && (
          <PanelFooter>
            <AdminPagination
              page={page}
              limit={pagination.limit}
              total={pagination.total}
              totalPages={pagination.totalPages}
              onChange={setPage}
              noun="review"
            />
          </PanelFooter>
        )}
      </Panel>

      <Modal show={Boolean(detail)} onClose={() => setDetailId(null)} size="lg" dismissible>
        {detail && (
          <>
            <ModalHeader>
              <span className="block text-[11px] font-semibold uppercase tracking-[0.14em] text-primary-600">
                Review - {detail.rating} out of 5
              </span>
              <span className="block text-base font-semibold text-navy">
                {detail.property?.title || 'Listing removed'}
              </span>
            </ModalHeader>

            <ModalBody className="space-y-5">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Guest</span>
                  <strong className="mt-1 block text-sm font-semibold text-navy">{guestName(detail)}</strong>
                  <span className="block text-xs text-muted">{detail.user?.email || 'No email on file'}</span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.stayDates')}</span>
                  <strong className="mt-1 block text-sm font-semibold text-navy">
                    {detail.booking
                      ? `${formatDay(detail.booking.checkIn)} to ${formatDay(detail.booking.checkOut)}`
                      : 'Stay dates not available'}
                  </strong>
                  <span className="block text-xs text-muted">
                    {detail.property?.location || 'Location not recorded'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">Submitted</span>
                  <strong className="mt-1 block text-sm font-semibold text-navy">{formatDay(detail.createdAt)}</strong>
                  <span className="mt-1 block">
                    <StatusBadge tone={detail.hidden ? 'warning' : 'success'}>
                      {detail.hidden ? 'Hidden' : 'Published'}
                    </StatusBadge>
                  </span>
                </div>
              </div>

              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.overallRating')}</span>
                <div className="mt-1 flex items-center gap-2">
                  <StarRating rating={Number(detail.rating)} />
                  <span className="text-sm text-charcoal">{detail.rating} out of 5</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 rounded-lg bg-surface p-4 shadow-sm sm:grid-cols-3">
                <SubRating label="Cleanliness" value={detail.cleanlinessRating} />
                <SubRating label="Location" value={detail.locationRating} />
                <SubRating label="Value" value={detail.valueRating} />
              </div>

              <div>
                <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.publicComment')}</span>
                <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-charcoal">
                  {(detail.publicComment || '').trim() || 'No public comment was left.'}
                </p>
              </div>

              {/* Admin-only fields. Labelled as private in the UI so nobody
                  mistakes them for something the guest or host can read. */}
              <div className="space-y-3 rounded-lg bg-surface p-4 shadow-sm">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-primary-600">
                  Private - visible to admins only
                </p>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.guestSatisfaction')}</span>
                  <strong className="mt-1 block text-sm font-semibold text-navy">
                    {satisfactionLabel(detail.satisfaction)}
                  </strong>
                </div>
                <div>
                  <span className="block text-[11px] font-semibold uppercase tracking-wide text-muted">{t('admin.privateNote')}</span>
                  <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-charcoal">
                    {(detail.privateNote || '').trim() || 'No private note was supplied.'}
                  </p>
                </div>
              </div>
            </ModalBody>

            <ModalFooter>
              <Button color="light" type="button" onClick={() => setDetailId(null)}>
                Close
              </Button>
              <Button
                color="light"
                type="button"
                onClick={() => openModeration(detail, detail.hidden ? 'unhide' : 'hide')}
              >
                {detail.hidden ? 'Unhide review' : 'Hide review'}
              </Button>
              <Button color="failure" type="button" onClick={() => openModeration(detail, 'delete')}>
                Delete review
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>

      <ConfirmDialog
        open={Boolean(dialog)}
        title={copy?.title || ''}
        description={copy?.description}
        confirmLabel={copy?.confirmLabel}
        cancelLabel={copy?.cancelLabel}
        tone={copy?.tone || 'danger'}
        busy={moderating}
        error={dialogError}
        onConfirm={runModeration}
        onCancel={closeDialog}
      />
    </div>
  );
}

export default AdminFeedback;
