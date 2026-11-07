import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service.js';
import * as bookingService from '../services/booking.service.js';
import { assertApprovedForPayment } from '../services/identity-verification.service.js';

/** POST /api/payments/initialize - auth required */
export async function initialize(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const bookingId = req.body.bookingId;
    if (!bookingId) {
      res.status(400).json({ success: false, error: 'bookingId is required' });
      return;
    }

    // Look up booking to ensure it belongs to this user
    const booking = await import('../config/prisma.js').then((p) =>
      p.default.booking.findUnique({
        where: { id: bookingId },
        include: { user: { select: { email: true } }, property: { select: { title: true } } },
      })
    );

    if (!booking) {
      res.status(404).json({ success: false, error: 'Booking not found' });
      return;
    }
    if (booking.userId !== req.user!.sub) {
      res.status(403).json({ success: false, error: 'Access denied' });
      return;
    }
    if (booking.status === 'CONFIRMED') {
      res.status(400).json({ success: false, error: 'Booking is already confirmed' });
      return;
    }

    // Same age rule as POST /bookings/:id/payment; this older route must not be a
    // way around it.
    const ageGate = await bookingService.checkGuestAge(req.user!.sub);
    if (ageGate !== 'OK') {
      res.status(ageGate === 'UNDER_AGE' ? 403 : 422).json({ success: false, error: ageGate });
      return;
    }

    // Same identity rule as POST /bookings/:id/payment (admins are exempt there too).
    // Throws a 403 IDENTITY_VERIFICATION_REQUIRED that the error handler returns.
    if (req.user!.role !== 'ADMIN') {
      await assertApprovedForPayment(req.user!.sub);
    }

    const result = await paymentService.initializeBookingPayment(booking);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/payments/verify/:reference - auth required */
export async function verify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentService.verifyAndConfirmPayment(req.params.reference, {
      userId: req.user!.sub,
      isAdmin: req.user!.role === 'ADMIN',
    });
    res.json({
      success: result.confirmed,
      data: {
        confirmed: result.confirmed,
        bookingId: result.bookingId,
        providerStatus: result.providerStatus,
        // Lets the callback screen distinguish "dates were taken after paying"
        // from "the payment did not go through".
        reason: result.reason,
      },
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/payments/banks - auth required (used by ProfilePage for dropdown) */
export async function banks(_req: Request, res: Response, _next: NextFunction): Promise<void> {
  try {
    const bankList = await import('../config/paystack.js').then((m) => m.fetchBanks('KES', 'kepss'));
    // An empty list is a real answer, so it must not be confused with an outage.
    res.json({ success: true, data: bankList });
  } catch (error) {
    // A payment provider being unreachable is expected operationally, not a
    // fault here. It gets a controlled answer the screens can explain and offer
    // to retry, instead of a server error that leaves an empty dropdown.
    console.error('Bank list unavailable:', error);
    res.status(503).json({
      success: false,
      code: 'BANK_LIST_UNAVAILABLE',
      error: 'The bank list is temporarily unavailable. Try again in a moment.',
    });
  }
}

/** POST /api/payments/webhook - no auth (called by Paystack) */
export async function webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = (req.headers['x-paystack-signature'] as string) || '';

    // The body is a Buffer from express.raw(), so req.body.event is undefined.
    // The event type lives inside the JSON payload - parse it from the raw string.
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf-8') : JSON.stringify(req.body);

    let event = '';
    try {
      event = JSON.parse(rawBody)?.event || '';
    } catch {
      // A body that is not JSON cannot become a payment event later either, so
      // this is permanent. Answer 200: a 4xx tells Paystack to redeliver, which
      // retried a body that could never succeed.
      console.warn('Webhook body was not JSON; rejected without retry.');
      res.status(200).json({ received: true, handled: false, error: 'invalid_payload' });
      return;
    }

    const result = await paymentService.handleWebhookEvent(event, rawBody, signature);
    // A bad signature is not going to become valid on a retry, so answer 200
    // and stop Paystack resending it.
    res.status(200).json({ received: true, ...result });
  } catch (error) {
    // A database or provider outage is the opposite case: answering 200 would
    // tell Paystack the event was handled, it would never resend, and the
    // payment would be silently lost. Ask for redelivery instead; every handler
    // is idempotent, so a repeat cannot apply money twice.
    console.error('Webhook processing failed, asking for redelivery:', error);
    res.status(500).json({ received: false, error: 'processing_failed' });
  }
}
