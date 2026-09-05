import { Request, Response, NextFunction } from 'express';
import * as bookingService from '../services/booking.service.js';
import * as paymentService from '../services/payment.service.js';
import { isApprovedForPayment } from '../services/identity-verification.service.js';
import prisma from '../config/prisma.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const booking = await bookingService.createBooking({
      userId: req.user!.sub,
      ...req.body,
    });

    // A guest who has not been identity-verified may still hold their dates -
    // the booking above is created either way, preserving checkout progress -
    // but payment never opens until verification is APPROVED. The guest is
    // sent to complete verification and can resume payment afterward via
    // POST /bookings/:id/payment, which re-checks this same gate.
    const verification = await prisma.identityVerification.findUnique({
      where: { userId: req.user!.sub },
      select: { status: true },
    });
    if (!isApprovedForPayment(verification?.status)) {
      res.status(201).json({
        success: true,
        data: { booking, paymentUrl: null, requiresIdentityVerification: true },
      });
      return;
    }

    // Initialize Paystack payment - returns authorization URL for redirect
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
    // Admins see any booking; everyone else is scoped to bookings they own as a
    // guest or that sit on one of their own listings (host).
    const isAdmin = req.user?.role === 'ADMIN';
    const scope = isAdmin ? undefined : { userId: req.user!.sub, hostId: req.user!.sub };
    const booking = await bookingService.getBooking(req.params.id, scope);
    res.json({ success: true, data: booking });
  } catch (error) {
    next(error);
  }
}

// List bookings. Admins see all; any other role is scoped to bookings on the
// properties they own. The scoping is derived from the token, never the client,
// so this controller is safe to mount on both admin and host routes.
export async function listAll(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page, limit } = req.query;
    const hostId = req.user!.role === 'ADMIN' ? undefined : req.user!.sub;
    const result = await bookingService.listAllBookings(
      status as string | undefined,
      page ? Number(page) : 1,
      limit ? Number(limit) : 20,
      hostId
    );
    res.json({ success: true, data: result.bookings, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

// Per-property booking counts + earnings. Admins see all properties; other
// roles are scoped to their own listings (token-derived).
export async function propertyEarnings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { from, to } = req.query;
    const dateFilter = {
      ...(from ? { from: new Date(from as string) } : {}),
      ...(to ? { to: new Date(to as string) } : {}),
    };
    const hostId = req.user!.role === 'ADMIN' ? undefined : req.user!.sub;
    const data = await bookingService.getPropertyEarnings(
      Object.keys(dateFilter).length > 0 ? dateFilter : undefined,
      hostId
    );
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}


export async function hostToday(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await bookingService.getHostToday(req.user!.sub);
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

// Admin: cancel stale PENDING bookings that were abandoned before payment
export async function cleanupStale(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await bookingService.abandonStaleBookings();
    res.json({ success: true, data: { cancelled: count } });
  } catch (error) {
    next(error);
  }
}

// Guest: re-initialize payment for an existing booking (includes add-ons in total)
export async function initializePayment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = req.params.id;

    // Fetch booking with user + property info for authorization and Paystack call
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { email: true } },
        property: { select: { title: true } },
      },
    });

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    // Auth: must be the booking's guest (admin can also pay on behalf of guest)
    const isAdmin = req.user!.role === 'ADMIN';
    if (!isAdmin && booking.userId !== req.user!.sub) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    // Validate status
    if (booking.status === 'CANCELLED') {
      res.status(400).json({ success: false, error: 'Cannot pay for a cancelled booking' });
      return;
    }
    if (booking.status === 'CONFIRMED') {
      res.status(400).json({ success: false, error: 'Booking is already confirmed' });
      return;
    }

    // Payment never opens for an unverified guest, even if the client tries to
    // skip the verification step - the booking itself stays intact either way.
    if (!isAdmin) {
      const verification = await prisma.identityVerification.findUnique({
        where: { userId: req.user!.sub },
        select: { status: true },
      });
      if (!isApprovedForPayment(verification?.status)) {
        res.status(403).json({ success: false, error: 'IDENTITY_VERIFICATION_REQUIRED' });
        return;
      }
    }

    // The guest picks their payment method on the last checkout step, which is
    // AFTER createBooking already minted a Paystack transaction from whatever
    // the form defaulted to. Persist the final choice here so the transaction
    // we are about to create opens on the channel they actually asked for.
    const chosenMethod = req.body?.paymentMethod as string | undefined;
    if (chosenMethod && chosenMethod !== booking.paymentMethod) {
      await prisma.booking.update({
        where: { id: bookingId },
        data: { paymentMethod: chosenMethod },
      });
    }

    // Recompute authoritative total (includes add-ons) before initialising Paystack
    await bookingService.recalculateBookingTotal(bookingId);

    // Re-fetch for the updated total (and the payment method just stored)
    const updated = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        user: { select: { email: true } },
        property: { select: { title: true } },
      },
    });

    if (!updated) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }

    const payment = await paymentService.initializeBookingPayment(updated);

    res.json({
      success: true,
      data: { authorizationUrl: payment.authorizationUrl, reference: payment.reference },
    });
  } catch (error) {
    next(error);
  }
}
