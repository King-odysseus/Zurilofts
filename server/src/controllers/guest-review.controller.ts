import { Request, Response, NextFunction } from 'express';
import * as guestReviewService from '../services/guest-review.service.js';

// Host: review the guest who stayed on one of the host's own bookings. The host
// comes from the token and the booking from the body; ownership of the listing is
// proved in the service, which answers "not found" for anyone else's booking.
export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // hostId comes from the token, never from the body: a request that also sends
    // hostId cannot choose whose name the review is written in.
    const { bookingId, rating, publicComment, privateNote } = req.body ?? {};
    const review = await guestReviewService.createGuestReview({
      hostId: req.user!.sub,
      bookingId,
      rating,
      publicComment,
      privateNote,
    });
    res.status(201).json({ success: true, data: review });
  } catch (error) {
    next(error);
  }
}

// Host: the reviews I have received as a guest, plus my aggregate.
export async function mine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await guestReviewService.listGuestReviewsForGuest(req.user!.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// Host: guest profile and reputation for one booking, with what is still missing
// before this host may leave a review.
export async function forBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await guestReviewService.getGuestProfileForBooking(req.params.bookingId, req.user!.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
