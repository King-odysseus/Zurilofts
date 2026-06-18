import prisma from '../config/prisma.js';
import * as paystack from '../config/paystack.js';
import { env } from '../config/env.js';
import crypto from 'crypto';
import { ValidationError, NotFoundError, ConflictError } from '../types/index.js';

const WITHHOLDING_TAX_RATE = Number(env.WITHHOLDING_TAX_RATE) / 100;

/** Calculate what the host earns from a specific booking */
export function calculateHostNet(subtotal: number, discountAmount: number, extraGuestFee: number) {
  const hostGross = subtotal - discountAmount + extraGuestFee;
  const withholdingTax = Math.round(hostGross * WITHHOLDING_TAX_RATE);
  const hostNet = hostGross - withholdingTax;
  return { hostGross, withholdingTax, hostNet };
}

/** Get a host's current wallet balance + stats */
export async function getHostWallet(hostId: string) {
  const wallet = await prisma.hostWallet.findUnique({ where: { hostId } });
  return wallet || { balance: 0, totalEarned: 0, totalPaidOut: 0, lastPayoutAt: null, nextPayoutAt: null };
}

/** Process a payout for a specific host — transfers their accumulated wallet balance */
export async function processHostPayout(hostId: string, initiatedBy: string = 'system'): Promise<{
  payout: any;
  message: string;
}> {
  // Check wallet balance
  const wallet = await prisma.hostWallet.findUnique({ where: { hostId } });
  if (!wallet || wallet.balance <= 0) {
    throw new ValidationError('No balance available for payout');
  }

  // Check host has bank details
  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: { firstName: true, lastName: true, bankAccountNo: true, bankCode: true, bankName: true, payoutFrequency: true },
  });
  if (!host || !host.bankAccountNo || !host.bankCode) {
    throw new ValidationError('Host has not set up bank account details');
  }

  // Check there isn't already a pending/processing payout
  const existing = await prisma.payout.findFirst({
    where: { hostId, status: { in: ['PENDING', 'PROCESSING'] } },
  });
  if (existing) {
    throw new ConflictError('Host already has a pending payout');
  }

  // Check Paystack balance before attempting
  const paystackBalance = await paystack.checkBalance();
  if (paystackBalance < wallet.balance) {
    throw new ValidationError(
      `Insufficient Paystack balance. Available: KES ${paystackBalance.toLocaleString()}, needed: KES ${wallet.balance.toLocaleString()}`
    );
  }

  const recipientName = `${host.firstName} ${host.lastName}`;

  // Create or reuse transfer recipient
  let recipientCode: string;
  try {
    const recipient = await paystack.createTransferRecipient({
      name: recipientName,
      accountNumber: host.bankAccountNo,
      bankCode: host.bankCode,
    });
    recipientCode = recipient.recipientCode;
  } catch (e: any) {
    throw new ValidationError(`Failed to create transfer recipient: ${e.message}`);
  }

  // Collect all unpaid bookings for this host to include in the payout
  const unpaidBookings = await prisma.booking.findMany({
    where: {
      property: { hostId },
      status: 'CONFIRMED',
      hostNetAmount: { gt: 0 },
      payoutBookings: { none: {} },
    },
    select: { id: true, hostNetAmount: true },
  });

  const transferRef = `zrlft-pay-${crypto.randomUUID().slice(0, 12)}`;
  const transferAmount = wallet.balance;

  // Initiate Paystack transfer
  let transferResult: { transferRef: string; status: string };
  try {
    transferResult = await paystack.initiateTransfer({
      recipientCode,
      amount: transferAmount,
      reason: `ZuriLofts payout — ${unpaidBookings.length} booking(s)`,
      reference: transferRef,
    });
  } catch (e: any) {
    throw new ValidationError(`Transfer initiation failed: ${e.message}`);
  }

  // Create payout record
  const payout = await prisma.payout.create({
    data: {
      hostId,
      amount: transferAmount,
      transferRef: transferResult.transferRef,
      recipientCode,
      status: 'PROCESSING',
      initiatedBy,
      bookingsCount: unpaidBookings.length,
    },
  });

  // Link bookings to this payout
  for (const b of unpaidBookings) {
    await prisma.payoutBooking.create({
      data: {
        payoutId: payout.id,
        bookingId: b.id,
        amount: b.hostNetAmount || 0,
      },
    });
  }

  // Reset wallet balance, update totals
  await prisma.hostWallet.update({
    where: { hostId },
    data: {
      balance: { decrement: transferAmount },
      totalPaidOut: { increment: transferAmount },
      lastPayoutAt: new Date(),
      // Calculate next payout based on frequency
      nextPayoutAt: host.payoutFrequency ? computeNextPayoutDate(host.payoutFrequency) : null,
    },
  });

  return { payout, message: `Payout of KES ${transferAmount.toLocaleString()} initiated` };
}

/** Process all scheduled payouts for hosts whose next payout date is due */
export async function processScheduledPayouts(): Promise<{ processed: string[]; failed: { hostId: string; reason: string }[] }> {
  const now = new Date();

  const dueWallets = await prisma.hostWallet.findMany({
    where: {
      nextPayoutAt: { lte: now },
      balance: { gt: 0 },
    },
    include: { host: { select: { payoutFrequency: true } } },
  });

  const processed: string[] = [];
  const failed: { hostId: string; reason: string }[] = [];

  for (const w of dueWallets) {
    try {
      await processHostPayout(w.hostId, 'system');
      processed.push(w.hostId);
    } catch (e: any) {
      failed.push({ hostId: w.hostId, reason: e.message });
    }
  }

  return { processed, failed };
}

/** List payouts with optional filters */
export async function listPayouts(options: {
  hostId?: string;
  status?: string;
  page?: number;
  limit?: number;
}) {
  const { hostId, status, page = 1, limit = 20 } = options;
  const where: any = {};
  if (hostId) where.hostId = hostId;
  if (status) where.status = status;

  const skip = (page - 1) * limit;
  const [payouts, total] = await Promise.all([
    prisma.payout.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        host: { select: { firstName: true, lastName: true, email: true } },
        bookings: {
          include: { booking: { select: { id: true, property: { select: { title: true } } } } },
        },
      },
    }),
    prisma.payout.count({ where }),
  ]);

  return {
    payouts,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

/** Calculate the next payout date based on frequency */
function computeNextPayoutDate(frequency: string): Date {
  const now = new Date();
  switch (frequency) {
    case 'weekly': {
      // Next Monday
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      const next = new Date(now);
      next.setDate(next.getDate() + daysUntilMonday);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    case 'biweekly': {
      // Every other Monday
      const daysUntilMonday = (8 - now.getDay()) % 7 || 7;
      const next = new Date(now);
      next.setDate(next.getDate() + daysUntilMonday + 7); // +7 for bi-weekly
      next.setHours(0, 0, 0, 0);
      return next;
    }
    case 'monthly': {
      // 1st of next month
      const next = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      next.setHours(0, 0, 0, 0);
      return next;
    }
    default:
      // Default to monthly
      const fallback = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      fallback.setHours(0, 0, 0, 0);
      return fallback;
  }
}

/** Get WHT report data for a specific host */
export async function getHostWhtData(hostId: string, year?: number, month?: number) {
  const where: any = {
    property: { hostId },
    status: 'CONFIRMED',
    withholdingTax: { gt: 0 },
  };

  if (year && month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    where.paidAt = { gte: start, lt: end };
  } else if (year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    where.paidAt = { gte: start, lt: end };
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      subtotal: true,
      discountAmount: true,
      hostNetAmount: true,
      withholdingTax: true,
      paidAt: true,
      property: { select: { title: true } },
    },
    orderBy: { paidAt: 'asc' },
  });

  const totalEarnings = bookings.reduce((sum, b) => sum + (b.hostNetAmount || 0), 0);
  const totalWht = bookings.reduce((sum, b) => sum + (b.withholdingTax || 0), 0);

  return { bookings, totalEarnings, totalWht };
}

/** Get consolidated WHT data for all hosts (admin/accountant) */
export async function getAllWhtData(year?: number, month?: number) {
  const where: any = {
    status: 'CONFIRMED',
    withholdingTax: { gt: 0 },
  };

  if (year && month) {
    const start = new Date(year, month - 1, 1);
    const end = new Date(year, month, 1);
    where.paidAt = { gte: start, lt: end };
  } else if (year) {
    const start = new Date(year, 0, 1);
    const end = new Date(year + 1, 0, 1);
    where.paidAt = { gte: start, lt: end };
  }

  const bookings = await prisma.booking.findMany({
    where,
    select: {
      id: true,
      subtotal: true,
      discountAmount: true,
      hostNetAmount: true,
      withholdingTax: true,
      paidAt: true,
      property: {
        select: {
          title: true,
          host: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      },
    },
    orderBy: { paidAt: 'asc' },
  });

  // Group by host
  const byHost = new Map<string, { host: any; bookings: any[]; totalEarnings: number; totalWht: number }>();
  for (const b of bookings) {
    const h = b.property.host;
    if (!h) continue;
    if (!byHost.has(h.id)) {
      byHost.set(h.id, { host: h, bookings: [], totalEarnings: 0, totalWht: 0 });
    }
    const entry = byHost.get(h.id)!;
    entry.bookings.push(b);
    entry.totalEarnings += b.hostNetAmount || 0;
    entry.totalWht += b.withholdingTax || 0;
  }

  return Array.from(byHost.values());
}
