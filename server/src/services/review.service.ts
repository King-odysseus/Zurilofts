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

/** Public summary: average rating, total stays, satisfaction % for the landing page. */
export async function getPublicStats() {
  const [reviewAgg, confirmedStays] = await Promise.all([
    prisma.review.aggregate({ _avg: { rating: true }, _count: { _all: true } }),
    prisma.booking.count({ where: { status: 'CONFIRMED' } }),
  ]);

  const totalReviews = reviewAgg._count._all;
  const averageRating = reviewAgg._avg.rating
    ? Math.round(reviewAgg._avg.rating * 10) / 10
    : 0;

  // Satisfaction: % of reviews rated 4 or 5 stars
  const positiveReviews = totalReviews > 0
    ? await prisma.review.count({ where: { rating: { gte: 4 } } })
    : 0;
  const satisfaction = totalReviews > 0
    ? Math.round((positiveReviews / totalReviews) * 100)
    : 100;

  return {
    averageRating,
    totalReviews,
    confirmedStays,
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
