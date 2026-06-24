import { Request, Response, NextFunction } from 'express';
import * as paymentService from '../services/payment.service.js';

/** POST /api/payments/initialize — auth required */
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

    const result = await paymentService.initializeBookingPayment(booking);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/payments/verify/:reference — auth required */
export async function verify(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await paymentService.verifyAndConfirmPayment(req.params.reference);
    res.json({
      success: result.confirmed,
      data: { confirmed: result.confirmed, bookingId: result.bookingId },
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
}

/** GET /api/payments/banks — auth required (used by ProfilePage for dropdown) */
export async function banks(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const banks = await import('../config/paystack.js').then((m) => m.fetchBanks('KES', 'kepss'));
    res.json({ success: true, data: banks });
  } catch (error) {
    next(error);
  }
}

/** POST /api/payments/webhook — no auth (called by Paystack) */
export async function webhook(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const signature = (req.headers['x-paystack-signature'] as string) || '';
    const event = req.body?.event || '';

    // The body is already a Buffer from express.raw()
    const rawBody = req.body instanceof Buffer ? req.body.toString('utf-8') : JSON.stringify(req.body);

    const result = await paymentService.handleWebhookEvent(event, rawBody, signature);
    // Always return 200 so Paystack doesn't keep retrying
    res.status(200).json({ received: true, ...result });
  } catch (error) {
    // Always respond 200 for webhooks even on error
    console.error('Webhook error:', error);
    res.status(200).json({ received: true, error: true });
  }
}
