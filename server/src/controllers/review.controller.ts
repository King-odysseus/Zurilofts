import { Request, Response, NextFunction } from 'express';
import * as reviewService from '../services/review.service.js';

// Guest: create a post-stay review for one of their bookings
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const review = await reviewService.createReview({
      userId: req.user!.sub,
      ...req.body,
    });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

// Admin: list all reviews + rating summary
export async function listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { page, limit } = req.query;
    const result = await reviewService.listAllReviews(
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
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
