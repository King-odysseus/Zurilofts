import prisma from '../config/prisma.js';
import * as paystack from '../config/paystack.js';
import { env } from '../config/env.js';
import crypto from 'crypto';
import { isRangeAvailable } from './calendar.service.js';
import { calculateNights, computeExtraGuestFee } from '../utils/pricing.js';
import { sendTelegramAlert } from './chat.service.js';

const SERVICE_FEE_PERCENT = Number(env.SERVICE_FEE_PERCENT) / 100;
const WITHHOLDING_TAX_RATE = Number(env.WITHHOLDING_TAX_RATE) / 100;

/** Map the checkout choice to Paystack's channel names. */
export function paymentChannelsForMethod(method?: string): paystack.PaystackPaymentChannel[] | undefined {
  switch (method) {
    case 'card':
      return ['card'];
    case 'mpesa':
      return ['mobile_money'];
    case 'bank':
      return ['bank', 'bank_transfer'];
    default:
      return undefined;
  }
}

/** Calculate what the host actually earns after platform fee + WHT */
export function calculateHostNet(subtotal: number, discountAmount: number, extraGuestFee: number) {
  const hostGross = subtotal - discountAmount + extraGuestFee;
  const withholdingTax = Math.round(hostGross * WITHHOLDING_TAX_RATE);
  const hostNet = hostGross - withholdingTax;
  return { hostGross, withholdingTax, hostNet };
}

/** Generate a unique Paystack reference for a booking */
export function generatePaymentReference(bookingId: string): string {
  const short = bookingId.slice(-8);
  return `zrlft-${short}-${crypto.randomUUID().slice(0, 6)}`;
}

/** Initialize a Paystack payment for a booking. Returns the authorization URL. */
export async function initializeBookingPayment(booking: {
  id: string;
  total: number;
  paymentMethod?: string;
  user: { email: string };
  property: { title: string };
}): Promise<{ authorizationUrl: string; reference: string }> {
  const reference = generatePaymentReference(booking.id);
  const callbackUrl = `${env.CLIENT_URL}/payment/callback`;

  const result = await paystack.initializeTransaction({
    email: booking.user.email,
    amount: booking.total,
    reference,
    channels: paymentChannelsForMethod(booking.paymentMethod),
    callbackUrl,
    metadata: {
      bookingId: booking.id,
      propertyTitle: booking.property.title,
    },
  });

  // Store the reference on the booking
  await prisma.booking.update({
    where: { id: booking.id },
    data: {
      paymentReference: reference,
      paymentGateway: 'paystack',
    },
  });

  return { authorizationUrl: result.authorizationUrl, reference };
}

/**
 * Booking states in which payment is already settled (or parked for admin).
 * These must never be re-processed, which is the basis of callback/webhook
 * idempotency. Single source of truth for the guard and the conditional updates.
 */
export const TERMINAL_BOOKING_STATUSES = ['CONFIRMED', 'CONFLICT'] as const;

export function isTerminalBookingStatus(status: string): boolean {
  return (TERMINAL_BOOKING_STATUSES as readonly string[]).includes(status);
}

/** Minimal shape of a Paystack verification we need to trust a payment. */
interface VerifiedTransaction {
  reference: string;
  amount: number; // cent subunit, as returned by Paystack
  currency: string;
  status: string;
  metadata?: { bookingId?: string } | null;
}

export type PaymentCheckResult =
  | { ok: true }
  | { ok: false; reason: string; message: string };

/**
 * Decide whether a verified transaction may confirm a specific booking. Pure and
 * side-effect-free so it is exhaustively testable. Confirmation requires ALL of:
 * success status, matching reference, KES currency, and a paid amount that
 * exactly equals the booking's expected total converted to subunits. Metadata is
 * attacker-influenceable, so if it names a booking it must be THIS booking - it
 * can never redirect a payment onto a different reservation.
 */
export function checkVerifiedPayment(params: {
  verification: VerifiedTransaction;
  expectedReference: string;
  expectedBookingId: string;
  expectedTotalKes: number;
}): PaymentCheckResult {
  const { verification, expectedReference, expectedBookingId, expectedTotalKes } = params;

  if (verification.status !== 'success') {
    return { ok: false, reason: 'not_success', message: `Transaction status is "${verification.status}", not success` };
  }
  if (verification.reference !== expectedReference) {
    return { ok: false, reason: 'reference_mismatch', message: 'Transaction reference does not match the booking' };
  }
  const metaBookingId = verification.metadata?.bookingId;
  if (metaBookingId != null && metaBookingId !== expectedBookingId) {
    return { ok: false, reason: 'booking_mismatch', message: 'Transaction metadata references a different booking' };
  }
  if ((verification.currency || '').toUpperCase() !== 'KES') {
    return { ok: false, reason: 'currency_mismatch', message: `Transaction currency is "${verification.currency}", not KES` };
  }
  // Compare in integer subunits on both sides - no floating-point money.
  const expectedSubunit = paystack.toPaystackSubunit(expectedTotalKes);
  if (verification.amount !== expectedSubunit) {
    return {
      ok: false,
      reason: 'amount_mismatch',
      message: `Paid amount ${verification.amount} does not equal expected ${expectedSubunit} (KES subunits)`,
    };
  }
  return { ok: true };
}

/** Verify payment with Paystack and confirm the booking if successful */
export async function verifyAndConfirmPayment(reference: string): Promise<{
  confirmed: boolean;
  bookingId?: string;
  message: string;
  reason?: string;
}> {
  // Check if this reference was already processed
  const existing = await prisma.booking.findUnique({
    where: { paymentReference: reference },
    select: { id: true, status: true, total: true },
  });

  if (!existing) {
    return { confirmed: false, reason: 'not_found', message: 'No booking found for this payment reference' };
  }
  if (isTerminalBookingStatus(existing.status)) {
    return { confirmed: true, bookingId: existing.id, message: 'Already confirmed' };
  }

  // A transport/API failure throws out of here and propagates to the caller, so a
  // provider outage surfaces as an error and is never mistaken for a rejected or
  // mismatched payment.
  const verification = await paystack.verifyTransaction(reference);

  const check = checkVerifiedPayment({
    verification,
    expectedReference: reference,
    expectedBookingId: existing.id,
    expectedTotalKes: existing.total,
  });

  if (!check.ok) {
    // A verified-but-invalid transaction (wrong amount/currency/reference/booking,
    // or not success). Persist for audit; never confirm or credit a host.
    console.error(`PAYMENT-REJECTED ref=${reference} booking=${existing.id} reason=${check.reason} - ${check.message}`);
    try {
      await prisma.paymentLog.create({
        data: { event: 'verify.rejected', reference, bookingId: existing.id, payload: check.message.slice(0, 2000) },
      });
    } catch {
      // Best-effort audit log - never turn a rejection into a 500.
    }
    return { confirmed: false, bookingId: existing.id, reason: check.reason, message: check.message };
  }

  // Confirm the booking
  await confirmBookingPayment(existing.id, {
    reference: verification.reference,
    channel: verification.channel,
    paidAt: verification.paid_at,
  });

  return { confirmed: true, bookingId: existing.id, message: 'Payment confirmed' };
}

/** Update booking with payment details and credit host wallet */
async function confirmBookingPayment(
  bookingId: string,
  payment: { reference: string; channel: string; paidAt: string }
): Promise<void> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { property: { select: { hostId: true, title: true } }, user: { select: { email: true } } },
  });

  if (!booking) throw new Error(`Booking ${bookingId} not found`);
  if (isTerminalBookingStatus(booking.status)) return; // idempotent

  // Re-check availability - the guest's hold may have lapsed and another
  // booking may have taken the dates in the meantime.
  const available = await isRangeAvailable(
    booking.propertyId,
    booking.checkIn,
    booking.checkOut,
    bookingId,
  );

  if (!available) {
    // Record payment details but flag the booking for admin resolution.
    // Host wallet is NOT credited until admin resolves the conflict. The
    // conditional update makes the transition happen at most once even under
    // concurrent callback + webhook delivery, so we only alert on a real flip.
    const flagged = await prisma.booking.updateMany({
      where: { id: bookingId, status: { notIn: [...TERMINAL_BOOKING_STATUSES] } },
      data: {
        status: 'CONFLICT',
        paymentChannel: payment.channel,
        paidAt: new Date(payment.paidAt),
      },
    });

    if (flagged.count === 0) return; // another delivery already handled it

    const msg = `DOUBLE-BOOK_CONFLICT booking=${bookingId} property=${booking.propertyId} ` +
      `checkIn=${booking.checkIn.toISOString().slice(0,10)} checkOut=${booking.checkOut.toISOString().slice(0,10)} ` +
      `user=${booking.user.email}`;
    console.error(msg);

    sendTelegramAlert(
      `DOUBLE-BOOK CONFLICT \u2014 Booking ${bookingId.slice(-8)} for ${booking.property.title}\n` +
      `Dates: ${booking.checkIn.toISOString().slice(0,10)} \u2192 ${booking.checkOut.toISOString().slice(0,10)}\n` +
      `Guest: ${booking.user.email}\n` +
      `Payment ref: ${payment.reference}\n` +
      `Status set to CONFLICT \u2014 admin action required.`
    );

    return;
  }

  // Calculate host earnings
  const nights = calculateNights(booking.checkIn, booking.checkOut);
  const extraGuestFee = computeExtraGuestFee(booking.guests, booking.bedOption, nights);

  const { hostGross, withholdingTax, hostNet } = calculateHostNet(
    booking.subtotal,
    booking.discountAmount,
    extraGuestFee
  );

  // Atomically flip PENDING -> CONFIRMED. The affected-row count tells us whether
  // THIS delivery performed the transition; the host wallet is credited only on
  // that one transition, so duplicate callback/webhook deliveries can never
  // double-credit a host.
  const confirmedNow = await prisma.booking.updateMany({
    where: { id: bookingId, status: { notIn: [...TERMINAL_BOOKING_STATUSES] } },
    data: {
      status: 'CONFIRMED',
      paymentChannel: payment.channel,
      paidAt: new Date(payment.paidAt),
      hostNetAmount: hostNet,
      withholdingTax,
    },
  });

  if (confirmedNow.count === 0) return; // another delivery already confirmed it

  // Credit host wallet
  const hostId = booking.property.hostId;
  if (hostId) {
    await prisma.hostWallet.upsert({
      where: { hostId },
      create: {
        hostId,
        balance: hostNet,
        totalEarned: hostNet,
      },
      update: {
        balance: { increment: hostNet },
        totalEarned: { increment: hostNet },
      },
    });
  }
}

/** Handle an incoming Paystack webhook event */
export async function handleWebhookEvent(
  event: string,
  body: string,
  signature: string
): Promise<{ handled: boolean; message: string }> {
  // Verify signature
  if (!paystack.verifyWebhookSignature(body, signature)) {
    // Log the event for auditing even if signature is invalid
    await prisma.paymentLog.create({
      data: {
        event,
        payload: body.slice(0, 2000),
        reference: 'invalid-signature',
      },
    });
    return { handled: false, message: 'Invalid webhook signature' };
  }

  const data = JSON.parse(body);

  // Log the event
  await prisma.paymentLog.create({
    data: {
      event,
      reference: data.data?.reference,
      bookingId: data.data?.metadata?.bookingId,
      payload: body.slice(0, 4000),
    },
  });

  switch (event) {
    case 'charge.success': {
      const ref = data.data?.reference;
      if (!ref) return { handled: false, message: 'No reference in charge.success event' };

      const result = await verifyAndConfirmPayment(ref);
      return { handled: result.confirmed, message: result.message };
    }

    case 'transfer.success': {
      const transferRef = data.data?.reference;
      if (!transferRef) return { handled: false, message: 'No transfer reference' };

      await prisma.payout.updateMany({
        where: { transferRef },
        data: { status: 'SUCCESS', completedAt: new Date() },
      });
      return { handled: true, message: 'Payout marked SUCCESS' };
    }

    case 'transfer.failed': {
      const transferRef = data.data?.reference;
      const reason = data.data?.reason || 'Unknown failure';
      if (!transferRef) return { handled: false, message: 'No transfer reference' };

      await prisma.payout.updateMany({
        where: { transferRef },
        data: { status: 'FAILED', failureReason: reason },
      });
      return { handled: true, message: 'Payout marked FAILED' };
    }

    case 'transfer.reversed': {
      const transferRef = data.data?.reference;
      if (!transferRef) return { handled: false, message: 'No transfer reference' };

      await prisma.payout.updateMany({
        where: { transferRef },
        data: { status: 'REVERSED' },
      });
      return { handled: true, message: 'Payout marked REVERSED' };
    }

    default:
      return { handled: true, message: `Unhandled event type: ${event}` };
  }
}
