/**
 * One wording for a listing's publication state.
 *
 * The host listings grid, the host preview and the admin preview all describe
 * the same status to different readers. Three copies of the same sentence drift
 * within a release, and a host who sees "In review" on the card and "Pending
 * review" on the preview cannot tell whether anything changed.
 *
 * These are plain functions with no React context, so the translator is passed
 * in by the caller. Without one they fall back to English, which keeps the
 * utilities usable from tests and from code that has no language in scope.
 */

const STATUS_KEY = {
  DRAFT: 'listingStatus.draft',
  PENDING_REVIEW: 'listingStatus.inReview',
  PUBLISHED: 'listingStatus.published',
  REJECTED: 'listingStatus.needsChanges',
  SUSPENDED: 'listingStatus.suspended',
};

const STATUS_FALLBACK = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'In review',
  PUBLISHED: 'Published',
  REJECTED: 'Needs changes',
  SUSPENDED: 'Suspended',
};

export const LISTING_STATUS_LABEL = STATUS_FALLBACK;

export function listingStatusLabel(status, t) {
  const key = STATUS_KEY[status];
  if (t && key) return t(key);
  return STATUS_FALLBACK[status] || STATUS_FALLBACK.DRAFT;
}

/** What the status means for the person reading it, not a repeat of the label. */
export function listingStatusCopy(property, t) {
  const fallback = (key, english) => (t ? t(key) : english);
  const status = property?.status;

  if (status === 'PUBLISHED') return fallback('listingStatus.copyPublished', 'Visible to guests and open for bookings.');
  if (status === 'PENDING_REVIEW') return fallback('listingStatus.copyInReview', 'Submitted for review. Changes stay private until it is approved.');
  // A reviewer's own note is already written for this listing, so it wins over
  // the generic sentence: it says what to fix, not just that something is wrong.
  if (status === 'REJECTED') {
    return property?.listingReviewNote || fallback('listingStatus.copyRejected', 'Update the requested details before submitting again.');
  }
  if (status === 'SUSPENDED') {
    return property?.listingReviewNote || fallback('listingStatus.copySuspended', 'Hidden from guests while it is suspended.');
  }
  return fallback('listingStatus.copyDraft', 'Add the details, photos and pricing, then submit for review.');
}
