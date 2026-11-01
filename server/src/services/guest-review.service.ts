import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';

/**
 * Host-reviews-guest.
 *
 * A Review row is written by a guest about a property, so a host has nowhere to
 * record how a guest behaved. GuestReview is that counterpart: one row per
 * booking (bookingId is unique), written by the host who owns the listing on
 * that booking.
 *
 * Two rules shape this file:
 *
 * 1. Ownership is proved by the listing, not by the role. A HOST claim in the
 *    token says nothing about which booking is theirs, so every entry point
 *    compares the booking's property.hostId with the caller and answers 404 when
 *    it does not match. Another host's booking must never be confirmed to exist.
 * 2. A guest's reputation is public; the host's notes are not. publicComment is
 *    shown to any host considering that guest, privateNote is for ZuriLofts
 *    staff only, and hidden lets moderation pull a review from the public view.
 *    toPublicGuestReview is the only way a row leaves this service.
 */

// ============================================================
// Pure helpers (exported for tests - no DB access)
// ============================================================

// Minimal booking shape needed to decide whether a host may review a guest.
export interface GuestReviewEligibilityBooking {
  userId: string;
  status: string;
  paidAt: Date | string | null;
  checkOut: Date | string;
  // Property.hostId is nullable in the schema, so a listing whose host row was
  // removed must read as "not yours" rather than fail to typecheck.
  property?: { hostId: string | null } | null;
  guestReview?: { id: string } | null;
}

/** Why a host cannot review this guest yet, in the order the checks run. */
export type GuestReviewBlockReason = 'NOT_CONFIRMED' | 'UNPAID' | 'NOT_ENDED' | 'ALREADY_REVIEWED';

/**
 * The single ordered answer to "may this guest be reviewed yet", returning the
 * first blocker rather than throwing. The API reports the reason so the host UI
 * can say what is still missing, and assertGuestReviewEligibility throws from
 * the same list, so the two can never drift apart.
 */
export function guestReviewEligibilityReason(
  booking: {
    status: string;
    paidAt: Date | string | null;
    checkOut: Date | string;
    guestReview?: { id: string } | null;
  },
  now: Date = new Date(),
): GuestReviewBlockReason | null {
  if (booking.status !== 'CONFIRMED') return 'NOT_CONFIRMED';
  if (!booking.paidAt) return 'UNPAID';
  if (new Date(booking.checkOut) > now) return 'NOT_ENDED';
  if (booking.guestReview) return 'ALREADY_REVIEWED';
  return null;
}

/**
 * Throw unless the caller may review the guest on this booking. The caller must
 * own the listing (anything else is "not found", never "forbidden", so a host
 * cannot probe other bookings), the stay must be CONFIRMED, paid and already
 * ended, and the guest must not have been reviewed for that stay yet.
 * `now` is injectable so tests can pin the clock.
 */
export function assertGuestReviewEligibility(
  booking: GuestReviewEligibilityBooking | null | undefined,
  callerId: string,
  now: Date = new Date(),
): void {
  // Not found / not the caller's listing - never reveal that the booking exists.
  if (!booking || booking.property?.hostId !== callerId) throw new NotFoundError('Booking');

  switch (guestReviewEligibilityReason(booking, now)) {
    case 'NOT_CONFIRMED':
      throw new ValidationError('You can review a guest only after a confirmed stay');
    case 'UNPAID':
      throw new ValidationError('You can review a guest only after their stay has been paid');
    case 'NOT_ENDED':
      throw new ValidationError('You can review a guest only after their stay has ended');
    case 'ALREADY_REVIEWED':
      throw new ConflictError('You have already reviewed this guest');
    default:
      return;
  }
}

/**
 * The public shape of a guest review.
 *
 * This is the privacy boundary for the whole feature: privateNote is the host's
 * note to ZuriLofts, hidden is a moderation flag, and guestId/hostId/bookingId
 * plus any email or payment data are internal identifiers. Widening this
 * interface publishes that field to every host who views a guest, so add to it
 * only with the privacy rule in mind.
 */
export interface PublicGuestReview {
  id: string;
  rating: number;
  publicComment: string | null;
  createdAt: Date | string;
  host: { firstName: string; lastName: string } | null;
  property: { id: string; title: string } | null;
}

/** The row fields the public serializer is allowed to read. */
interface GuestReviewSource {
  id: string;
  rating: number;
  publicComment?: string | null;
  createdAt: Date | string;
  host?: { firstName: string; lastName: string } | null;
  property?: { id: string; title: string } | null;
}

/**
 * Serialize a guest review to the public allowlist. Everything not named in
 * PublicGuestReview is dropped here and nowhere else, so a caller cannot leak a
 * private note by forgetting to strip it.
 */
export function toPublicGuestReview(review: GuestReviewSource): PublicGuestReview {
  return {
    id: review.id,
    rating: review.rating,
    publicComment: review.publicComment ?? null,
    createdAt: review.createdAt,
    host: review.host
      ? { firstName: review.host.firstName, lastName: review.host.lastName }
      : null,
    property: review.property
      ? { id: review.property.id, title: review.property.title }
      : null,
  };
}

export interface GuestReviewAggregate {
  averageRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number }[];
}

/**
 * Compute a guest's public reputation from a list of ratings.
 *
 * Callers must pass only the ratings of visible (hidden:false) reviews: a hidden
 * review is a moderation action, and letting one influence the average would
 * keep it on the guest's record after it was taken down.
 */
export function computeGuestReviewAggregate(ratings: number[]): GuestReviewAggregate {
  const totalReviews = ratings.length;
  const averageRating = totalReviews
    ? Math.round((ratings.reduce((sum, rating) => sum + rating, 0) / totalReviews) * 10) / 10
    : 0;
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratings.filter((rating) => rating === stars).length,
  }));
  return { averageRating, totalReviews, distribution };
}

// ============================================================
// DB-backed operations
// ============================================================

export interface CreateGuestReviewInput {
  hostId: string;
  bookingId: string;
  rating: number;
  publicComment?: string;
  privateNote?: string;
}

/**
 * Create the host's review of a guest for one booking.
 *
 * Eligibility (ownership, confirmed, paid, ended, not already reviewed) is
 * enforced by assertGuestReviewEligibility so the HTTP layer cannot skip it.
 */
export async function createGuestReview(input: CreateGuestReviewInput) {
  // Fail fast on the two fields the body must supply. Without a bookingId Prisma
  // would reject the query itself and the caller would see a 500 instead of an
  // actionable message.
  if (!input.bookingId) throw new ValidationError('Booking is required');
  // Checked before the read so a malformed rating costs no query.
  if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
    throw new ValidationError('Rating must be between 1 and 5');
  }

  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: {
      guestReview: true,
      property: { select: { hostId: true, id: true } },
    },
  });

  assertGuestReviewEligibility(booking, input.hostId);

  try {
    // The returned row goes back to the host who just wrote it, so their own
    // privateNote is theirs to see. The public lists never use this shape.
    return await prisma.guestReview.create({
      data: {
        bookingId: booking!.id,
        hostId: input.hostId,
        guestId: booking!.userId,
        propertyId: booking!.propertyId,
        rating: input.rating,
        publicComment: input.publicComment?.trim() || null,
        privateNote: input.privateNote?.trim() || null,
        // A new review is visible: hiding is a moderation action, not a default.
        hidden: false,
      },
    });
  } catch (error) {
    // bookingId is unique, so a double submit that raced past the eligibility
    // read arrives as a duplicate-key error. Report it as the same conflict the
    // in-order path produces. Duck-typed because the generated Prisma error
    // class is not imported anywhere in this codebase.
    if ((error as { code?: string })?.code === 'P2002') {
      throw new ConflictError('You have already reviewed this guest');
    }
    throw error;
  }
}

/**
 * A guest's visible reviews plus their aggregate, newest first.
 *
 * Only hidden:false rows are read, and only the public columns are selected, so
 * neither a private note nor a moderated review can reach the response. The
 * summary is computed from the rows returned here, which is the set a host sees.
 */
export async function listGuestReviewsForGuest(guestId: string) {
  const rows = await prisma.guestReview.findMany({
    where: { guestId, hidden: false },
    orderBy: { createdAt: 'desc' },
    take: 50,
    // An explicit select mirrors PublicGuestReview: what is not asked for here
    // cannot be leaked by a later serializer change.
    select: {
      id: true,
      rating: true,
      publicComment: true,
      createdAt: true,
      host: { select: { firstName: true, lastName: true } },
      property: { select: { id: true, title: true } },
    },
  });

  return {
    summary: computeGuestReviewAggregate(rows.map((row) => row.rating)),
    reviews: rows.map(toPublicGuestReview),
  };
}

export interface GuestReviewEligibilityView {
  canReview: boolean;
  alreadyReviewed: boolean;
  reason: GuestReviewBlockReason | null;
}

export interface GuestProfileForBooking {
  guest: {
    id: string;
    firstName: string;
    lastName: string;
    avatar: string | null;
    memberSince: Date | string;
    identityVerified: boolean;
  };
  summary: GuestReviewAggregate;
  reviews: PublicGuestReview[];
  eligibility: GuestReviewEligibilityView;
  myReview: PublicGuestReview | null;
}

/**
 * Everything a host needs before deciding on a booking: who the guest is, the
 * reputation other hosts gave them, whether this stay can be reviewed yet, and
 * the review this host already wrote (if any).
 *
 * Scoped to the booking's listing owner so the guest's history is never handed
 * to someone who has no business with that stay.
 */
export async function getGuestProfileForBooking(
  bookingId: string,
  callerId: string,
): Promise<GuestProfileForBooking> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      guestReview: {
        include: {
          host: { select: { firstName: true, lastName: true } },
          property: { select: { id: true, title: true } },
        },
      },
      property: { select: { hostId: true } },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          avatar: true,
          createdAt: true,
          identityVerification: { select: { status: true } },
        },
      },
    },
  });

  // One answer for "no such booking" and "not your booking", so a host cannot
  // learn that another host's booking exists.
  if (!booking || booking.property.hostId !== callerId) throw new NotFoundError('Booking');

  // Reused rather than re-queried: the guest's public history has one definition
  // and one allowlist, and this screen must show exactly what anyone else sees.
  const { summary, reviews } = await listGuestReviewsForGuest(booking.user.id);
  // Same helper the create path throws from, so canReview:true here can never be
  // rejected a moment later by createGuestReview.
  const reason = guestReviewEligibilityReason(booking);

  return {
    guest: {
      id: booking.user.id,
      firstName: booking.user.firstName,
      lastName: booking.user.lastName,
      avatar: booking.user.avatar,
      memberSince: booking.user.createdAt,
      // A verified identity is what a host is really asking about; the raw
      // documents and the verdict's detail stay internal.
      identityVerified: booking.user.identityVerification?.status === 'APPROVED',
    },
    summary,
    reviews,
    eligibility: {
      canReview: reason === null,
      alreadyReviewed: reason === 'ALREADY_REVIEWED',
      reason,
    },
    // Serialized through the same boundary as the public list: this payload is
    // the reputation view of the guest, so the host's own privateNote is not
    // echoed back here.
    myReview: booking.guestReview ? toPublicGuestReview(booking.guestReview) : null,
  };
}
