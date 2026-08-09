import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';

interface CreateReviewInput {
  userId: string;
  bookingId: string;
  rating: number;
  satisfaction?: string;
  publicComment?: string;
  privateNote?: string;
}

// ============================================================
// Pure helpers (exported for tests - no DB access)
// ============================================================

// Minimal booking shape needed to decide review eligibility.
export interface ReviewEligibilityBooking {
  userId: string;
  status: string;
  paidAt: Date | string | null;
  checkOut: Date | string;
  review?: { id: string } | null;
}

/**
 * Throw unless the caller may review this booking. A stay is reviewable only
 * when it belongs to the caller, was CONFIRMED, has been paid (paidAt set), has
 * already ended (check-out in the past), and has not already been reviewed.
 * PENDING/CANCELLED/CONFLICT, unpaid, and future stays are all rejected. `now`
 * is injectable so tests can pin the clock.
 */
export function assertReviewEligibility(
  booking: ReviewEligibilityBooking | null | undefined,
  callerId: string,
  now: Date = new Date(),
): void {
  // Not found / not the caller's booking - never reveal existence.
  if (!booking || booking.userId !== callerId) throw new NotFoundError('Booking');
  if (booking.status !== 'CONFIRMED') {
    throw new ValidationError('You can review only a confirmed stay');
  }
  if (!booking.paidAt) {
    throw new ValidationError('You can review a stay only after it has been paid');
  }
  if (new Date(booking.checkOut) > now) {
    throw new ValidationError('You can leave a review only after your stay has ended');
  }
  if (booking.review) {
    throw new ConflictError('You have already reviewed this stay');
  }
}

// Explicit public-safe review shape. Only these fields ever reach the public.
export interface PublicReview {
  id: string;
  rating: number;
  publicComment: string | null;
  createdAt: Date | string;
  user: { firstName: string; lastName: string } | null;
}

/**
 * Serialize a review to the public allowlist. privateNote, satisfaction, email,
 * userId, bookingId and any payment/booking data are intentionally dropped -
 * only the fields returned here are ever exposed publicly.
 */
export function toPublicReview(review: any): PublicReview {
  return {
    id: review.id,
    rating: review.rating,
    publicComment: review.publicComment ?? null,
    createdAt: review.createdAt,
    user: review.user
      ? { firstName: review.user.firstName, lastName: review.user.lastName }
      : null,
  };
}

export interface ReviewAggregate {
  averageRating: number;
  totalReviews: number;
  distribution: { stars: number; count: number }[];
}

/**
 * Compute public aggregates from a list of ratings. Callers must pass only the
 * ratings of visible (non-hidden) reviews so hidden reviews never influence the
 * public average, count, or star distribution.
 */
export function computeReviewAggregate(ratings: number[]): ReviewAggregate {
  const totalReviews = ratings.length;
  const averageRating = totalReviews
    ? Math.round((ratings.reduce((sum, r) => sum + r, 0) / totalReviews) * 10) / 10
    : 0;
  const distribution = [5, 4, 3, 2, 1].map((stars) => ({
    stars,
    count: ratings.filter((r) => r === stars).length,
  }));
  return { averageRating, totalReviews, distribution };
}

// ============================================================
// DB-backed operations
// ============================================================

/**
 * Recalculate a property's cached rating/reviews columns from its visible
 * (non-hidden) reviews only. Run after every create/hide/unhide/delete so the
 * public aggregate stays consistent.
 */
async function recalcPropertyAggregate(propertyId: string): Promise<void> {
  const agg = await prisma.review.aggregate({
    where: { propertyId, hidden: false },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      rating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      reviews: agg._count._all,
    },
  });
}

/**
 * Create a post-stay review. Eligibility is enforced by assertReviewEligibility:
 * the caller must own a CONFIRMED, paid, already-ended booking that has not been
 * reviewed yet.
 */
export async function createReview(input: CreateReviewInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { review: true },
  });

  assertReviewEligibility(booking, input.userId);

  const review = await prisma.review.create({
    data: {
      bookingId: booking!.id,
      userId: input.userId,
      propertyId: booking!.propertyId,
      rating: input.rating,
      publicComment: input.publicComment?.trim() || null,
      satisfaction: input.satisfaction || null,
      privateNote: input.privateNote?.trim() || null,
    },
  });

  await recalcPropertyAggregate(booking!.propertyId);

  return review;
}

/** Public summary: rating, stays, satisfaction for the landing page.
 *  Aggregates count visible reviews only; admin can override via settings. */
export async function getPublicStats() {
  const { getLandingStats } = await import('./settings.service.js');
  const [reviewAgg, confirmedStays, landingStats] = await Promise.all([
    prisma.review.aggregate({ where: { hidden: false }, _avg: { rating: true }, _count: { _all: true } }),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    getLandingStats(),
  ]);

  const totalReviews = reviewAgg._count._all;

  // Star rating: auto-computed from visible reviews, admin can override
  const autoRating = reviewAgg._avg.rating
    ? Math.round(reviewAgg._avg.rating * 10) / 10
    : 5.0;
  const averageRating = landingStats.starRating > 0 ? landingStats.starRating : autoRating;

  // Happy stays: auto-computed from confirmed bookings, admin can override.
  // This is a marketing count separate from review sentiment.
  const happyStays = landingStats.happyStays > 0 ? landingStats.happyStays : confirmedStays;

  // Satisfaction: share of visible reviews rated 4+ stars, admin can override.
  // Derived from public star ratings only - never from private satisfaction/notes.
  const positiveReviews = totalReviews > 0
    ? await prisma.review.count({ where: { hidden: false, rating: { gte: 4 } } })
    : 0;
  const computedSatisfaction = totalReviews > 0
    ? Math.round((positiveReviews / totalReviews) * 100)
    : 100;
  const satisfaction = landingStats.satisfaction > 0 ? landingStats.satisfaction : computedSatisfaction;

  return {
    averageRating,
    totalReviews,
    confirmedStays,
    happyStays,
    satisfaction,
  };
}

/** Admin: all reviews newest-first, plus a rating summary for the dashboard card. */
export async function listAllReviews(page = 1, limit = 20) {
  const skip = (page - 1) * limit;
  const [reviews, total, agg] = await Promise.all([
    prisma.review.findMany({
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
        property: { select: { id: true, title: true, location: true } },
        booking: { select: { id: true, checkIn: true, checkOut: true } },
      },
    }),
    prisma.review.count(),
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
  ]);

  return {
    reviews,
    summary: {
      averageRating: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : 0,
      totalReviews: agg._count._all,
    },
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Public: reviews for a specific property, newest-first, excluding hidden ones.
 *  Uses an explicit select + serializer so no private fields can leak, and
 *  aggregates over all visible reviews (not just the returned page). */
export async function getPropertyReviews(propertyId: string) {
  const [reviews, visible] = await Promise.all([
    prisma.review.findMany({
      where: { propertyId, hidden: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
      select: {
        id: true,
        rating: true,
        publicComment: true,
        createdAt: true,
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.review.findMany({
      where: { propertyId, hidden: false },
      select: { rating: true },
    }),
  ]);

  return {
    reviews: reviews.map(toPublicReview),
    summary: computeReviewAggregate(visible.map((r) => r.rating)),
  };
}

/** Admin: toggle hidden status on a review, then recalculate the public aggregate. */
export async function updateReview(id: string, data: { hidden?: boolean }) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new NotFoundError('Review');
  const updated = await prisma.review.update({ where: { id }, data: { hidden: data.hidden } });
  await recalcPropertyAggregate(review.propertyId);
  return updated;
}

/** Admin: delete a review and recalculate the public aggregate. */
export async function deleteReview(id: string) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new NotFoundError('Review');

  await prisma.review.delete({ where: { id } });
  await recalcPropertyAggregate(review.propertyId);

  return { deleted: true };
}
