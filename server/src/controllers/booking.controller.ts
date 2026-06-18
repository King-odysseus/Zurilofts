import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/booking.service.js';
import * as paymentService from '../services/payment.service.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await bookingService.createBooking({
      userId: req.user!.sub,
      ...req.body,
    });

    // Initialize Paystack payment — returns authorization URL for redirect
    const payment = await paymentService.initializeBookingPayment(booking);

    res.status(201).json({
      success: true,
      data: { booking, paymentUrl: payment.authorizationUrl, reference: payment.reference },
    });
  } catch (error) {
    next(error);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page, limit } = req.query;
    const result = await bookingService.listUserBookings(
      req.user!.sub,
      status as string | undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 10
    );
    res.json({ success: true, data: result.bookings, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user?.role === 'ADMIN';
    const booking = await bookingService.getBooking(req.params.id, isAdmin ? undefined : req.user!.sub);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

// Admin: list all bookings
export async function listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page, limit } = req.query;
    const result = await bookingService.listAllBookings(
      status as string | undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20
    );
    res.json({ success: true, data: result.bookings, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

// Admin: per-property booking counts + earnings
export async function propertyEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to } = req.query;
    const dateFilter = {
      ...(from ? { from: new Date(from as string) } : {}),
      ...(to ? { to: new Date(to as string) } : {}),
    };
    const data = await bookingService.getPropertyEarnings(
      Object.keys(dateFilter).length > 0 ? dateFilter : undefined
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// Admin: update booking status
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await bookingService.updateBookingStatus(req.params.id, req.body.status);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

// Admin: update booking details
export async function updateBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await bookingService.updateBooking(req.params.id, req.body);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

// Admin: delete booking
export async function deleteBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await bookingService.deleteBooking(req.params.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
