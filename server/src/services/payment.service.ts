import prisma from '../config/prisma.js';
import * as paystack from '../config/paystack.js';
import { env } from '../config/env.js';
import crypto from 'crypto';

const SERVICE_FEE_PERCENT = Number(env.SERVICE_FEE_PERCENT) / 100;
const WITHHOLDING_TAX_RATE = Number(env.WITHHOLDING_TAX_RATE) / 100;

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
  user: { email: string };
  property: { title: string };
}): Promise<{ authorizationUrl: string; reference: string }> {
  const reference = generatePaymentReference(booking.id);
  const callbackUrl = `${env.CLIENT_URL}/payment/callback`;

  const result = await paystack.initializeTransaction({
    email: booking.user.email,
    amount: booking.total,
    reference,
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

/** Verify payment with Paystack and confirm the booking if successful */
export async function verifyAndConfirmPayment(reference: string): Promise<{
  confirmed: boolean;
  bookingId?: string;
  message: string;
}> {
  // Check if this reference was already processed
  const existing = await prisma.booking.findUnique({
    where: { paymentReference: reference },
    select: { id: true, status: true },
  });

  if (!existing) {
    return { confirmed: false, message: 'No booking found for this payment reference' };
  }
  if (existing.status === 'CONFIRMED') {
    return { confirmed: true, bookingId: existing.id, message: 'Already confirmed' };
  }

  const verification = await paystack.verifyTransaction(reference);
  if (!verification) {
    return { confirmed: false, message: 'Payment verification failed with Paystack' };
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
    include: { property: { select: { hostId: true } }, user: { select: { email: true } } },
  });

  if (!booking) throw new Error(`Booking ${bookingId} not found`);
  if (booking.status === 'CONFIRMED') return; // idempotent

  // Calculate host earnings
  const extraGuestFee = Math.max(0, booking.guests - (booking.bedOption === '2bed' ? 4 : 2)) * 800 *
    Math.ceil((new Date(booking.checkOut).getTime() - new Date(booking.checkIn).getTime()) / (1000 * 60 * 60 * 24));

  const { hostGross, withholdingTax, hostNet } = calculateHostNet(
    booking.subtotal,
    booking.discountAmount,
    extraGuestFee
  );

  // Update booking
  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: 'CONFIRMED',
      paymentChannel: payment.channel,
      paidAt: new Date(payment.paidAt),
      hostNetAmount: hostNet,
      withholdingTax,
    },
  });

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
