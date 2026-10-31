/**
 * One wording for a listing's publication state.
 *
 * The host listings grid, the host preview and the admin preview all describe
 * the same status to different readers. Three copies of the same sentence drift
 * within a release, and a host who sees "In review" on the card and "Pending
 * review" on the preview cannot tell whether anything changed.
 */

export const LISTING_STATUS_LABEL = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'In review',
  PUBLISHED: 'Published',
  REJECTED: 'Needs changes',
  SUSPENDED: 'Suspended',
};

export function listingStatusLabel(status) {
  return LISTING_STATUS_LABEL[status] || LISTING_STATUS_LABEL.DRAFT;
}

/** What the status means for the person reading it, not a repeat of the label. */
export function listingStatusCopy(property) {
  if (property?.status === 'PUBLISHED') return 'Visible to guests and open for bookings.';
  if (property?.status === 'PENDING_REVIEW') return 'Submitted for review. Changes stay private until it is approved.';
  if (property?.status === 'REJECTED') return property?.listingReviewNote || 'Update the requested details before submitting again.';
  if (property?.status === 'SUSPENDED') return property?.listingReviewNote || 'Hidden from guests while it is suspended.';
  return 'Add the details, photos and pricing, then submit for review.';
}
