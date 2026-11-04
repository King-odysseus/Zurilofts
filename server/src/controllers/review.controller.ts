import { Request, Response, NextFunction } from 'express';
import * as reviewService from '../services/review.service.js';
import { parseBoolean, parseSearch } from '../utils/paging.js';

// Guest: create a post-stay review for one of their bookings
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await reviewService.createReview({
      // Identity last: a body field named userId must never win over the session.
      ...req.body,
      userId: req.user!.sub,
    });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

// Host: ratings and reviews across the host's own listings, plus follow-ups
export async function hostInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { limit } = req.query;
    const data = await reviewService.getHostInsights(req.user!.sub, limit ? Number(limit) : 20);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// Public: summary stats for the landing page (rating, stays, satisfaction)
export async function publicStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const stats = await reviewService.getPublicStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    next(error);
  }
}

// Admin: list all reviews + rating summary
export async function listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit, rating, propertyId, hidden, search, from, to } = req.query;
    const result = await reviewService.listAllReviews({
      page: page === undefined ? undefined : Number(page),
      limit: limit === undefined ? undefined : Number(limit),
      rating: rating === undefined ? undefined : Number(rating),
      propertyId: typeof propertyId === 'string' ? propertyId : undefined,
      hidden: parseBoolean(hidden),
      search: parseSearch(search),
      from: typeof from === 'string' ? from : undefined,
      to: typeof to === 'string' ? to : undefined,
    });



    res.json({
      success: true,
      data: result.reviews,
      summary: result.summary,
      pagination: result.pagination,
    });
  } catch (error) {
    next(error);
  }
}

// Admin: hide / unhide a review
export async function adminUpdateReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await reviewService.updateReview(req.params.id, req.body);
    res.json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

// Admin: delete a review
export async function adminDeleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await reviewService.deleteReview(req.params.id);
    res.json({ success: true, message: 'Review deleted' });
  } catch (error) {
    next(error);
  }
}
