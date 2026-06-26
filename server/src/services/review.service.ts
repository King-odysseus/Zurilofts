import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';

interface CreateReviewInput {
  userId: string;
  bookingId: string;
  rating: number;
  satisfaction?: string;
  privateNote?: string;
}

/**
 * Create a post-stay review. Only the guest who made the booking may review it,
 * only after the stay has ended (check-out in the past), only for a stay that
 * wasn't cancelled, and only once per booking.
 */
export async function createReview(input: CreateReviewInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { review: true },
  });

  if (!booking || booking.userId !== input.userId) throw new NotFoundError('Booking');
  if (booking.status === 'CANCELLED') {
    throw new ValidationError('You cannot review a cancelled booking');
  }
  if (new Date(booking.checkOut) > new Date()) {
    throw new ValidationError('You can leave a review only after your stay has ended');
  }
  if (booking.review) {
    throw new ConflictError('You have already reviewed this stay');
  }

  const review = await prisma.review.create({
    data: {
      bookingId: booking.id,
      userId: input.userId,
      propertyId: booking.propertyId,
      rating: input.rating,
      satisfaction: input.satisfaction || null,
      privateNote: input.privateNote?.trim() || null,
    },
  });

  // Update the property's aggregate rating after the review is posted
  const propertyAgg = await prisma.review.aggregate({
    where: { propertyId: booking.propertyId },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.property.update({
    where: { id: booking.propertyId },
    data: {
      rating: propertyAgg._avg.rating ? Math.round(propertyAgg._avg.rating * 10) / 10 : 0,
      reviews: propertyAgg._count._all,
    },
  });

  return review;
}

/** Public summary: rating, stays, satisfaction for the landing page.
 *  Defaults to live data from reviews and bookings. Admin can override via settings. */
export async function getPublicStats() {
  const { getLandingStats } = await import('./settings.service.js');
  const [reviewAgg, confirmedStays, landingStats] = await Promise.all([
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
    getLandingStats(),
  ]);

  const totalReviews = reviewAgg._count._all;

  // Star rating: auto-computed from reviews, admin can override
  const autoRating = reviewAgg._avg.rating
    ? Math.round(reviewAgg._avg.rating * 10) / 10
    : 5.0;
  const averageRating = landingStats.starRating > 0 ? landingStats.starRating : autoRating;

  // Happy stays: auto-computed from confirmed bookings, admin can override
  const happyStays = landingStats.happyStays > 0 ? landingStats.happyStays : confirmedStays;

  // Satisfaction: auto-computed from reviews rated 4+ stars, admin can override
  const positiveReviews = totalReviews > 0
    ? await prisma.review.count({ where: { rating: { gte: 4 } } })
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

/** Public: reviews for a specific property, newest-first, excluding hidden ones. */
export async function getPropertyReviews(propertyId: string) {
  const [reviews, agg] = await Promise.all([
    prisma.review.findMany({
      where: { propertyId, hidden: false },
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.review.aggregate({
      where: { propertyId, hidden: false },
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  // Star distribution (5, 4, 3, 2, 1)
  const distribution = await Promise.all(
    [5, 4, 3, 2, 1].map(async (star) => ({
      stars: star,
      count: await prisma.review.count({ where: { propertyId, hidden: false, rating: star } }),
    })),
  );

  return {
    reviews,
    summary: {
      averageRating: (agg as any)._avg?.rating ? Math.round((agg as any)._avg.rating * 10) / 10 : 0,
      totalReviews: (agg as any)._count?._all ?? 0,
      distribution,
    },
  };
}

/** Admin: toggle hidden status on a review. */
export async function updateReview(id: string, data: { hidden?: boolean }) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new NotFoundError('Review');
  return prisma.review.update({ where: { id }, data: { hidden: data.hidden } } as any);
}

/** Admin: delete a review and recalculate property aggregate. */
export async function deleteReview(id: string) {
  const review = await prisma.review.findUnique({ where: { id } });
  if (!review) throw new NotFoundError('Review');

  await prisma.review.delete({ where: { id } });

  // Recalculate property aggregate
  const agg = await prisma.review.aggregate({
    where: { propertyId: review.propertyId, hidden: false } as any,
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.property.update({
    where: { id: review.propertyId },
    data: { rating: (agg as any)._avg?.rating ? Math.round((agg as any)._avg.rating * 10) / 10 : 0, reviews: (agg as any)._count?._all ?? 0 },
  });

  return { deleted: true };
}
