import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import * as paystack from '../config/paystack.js';
import crypto from 'crypto';
import { ValidationError, NotFoundError, ConflictError } from '../types/index.js';
import { maskPayoutAccount, normalizeKenyanMpesaPhone, payoutRecipientKey } from '../utils/payoutDestination.js';
import { isHostFundsDue } from '../utils/payoutTiming.js';
import {
  FAILURE_NOTICE_SOURCE_STATUSES,
  SETTLED_PAYOUT_STATUSES,
  canSettleFailedTransfer,
  isSettledPayoutStatus,
} from '../utils/payoutTransitions.js';
import { creditReferralForFirstEarning } from './referral.service.js';

/**
 * Get a host's wallet: the withdrawable balance plus what is still held.
 *
 * `balance` is the only number a payout may transfer, so money inside its hold
 * window is reported separately as `pendingBalance` rather than being counted
 * as available.
 */
export async function getHostWallet(hostId: string) {
  const wallet = await prisma.hostWallet.findUnique({ where: { hostId } });
  const held = await prisma.booking.aggregate({
    where: {
      property: { hostId },
      status: 'CONFIRMED',
      hostFundsReleasedAt: null,
      hostNetAmount: { gt: 0 },
    },
    _sum: { hostNetAmount: true },
    _count: true,
  });

  return {
    ...(wallet || { balance: 0, totalEarned: 0, totalPaidOut: 0, lastPayoutAt: null, nextPayoutAt: null }),
    pendingBalance: held._sum?.hostNetAmount ?? 0,
    pendingBookings: held._count ?? 0,
  };
}

/**
 * Move every confirmed booking whose hold has expired into the host's
 * withdrawable balance.
 *
 * Each booking is claimed and credited in one transaction, so overlapping
 * sweeps cannot credit the same stay twice: the conditional update only matches
 * while hostFundsReleasedAt is still null, and the wallet write happens in the
 * same transaction as that claim.
 */
export async function releaseDueHostFunds(
  now: Date = new Date(),
): Promise<{ released: number; amount: number }> {
  const candidates = await prisma.booking.findMany({
    where: {
      status: 'CONFIRMED',
      hostFundsReleasedAt: null,
      hostPayableAt: { not: null, lte: now },
      hostNetAmount: { gt: 0 },
    },
    select: {
      id: true,
      hostNetAmount: true,
      hostPayableAt: true,
      hostFundsReleasedAt: true,
      status: true,
      property: { select: { hostId: true, host: { select: { payoutFrequency: true } } } },
    },
  });

  let released = 0;
  let amount = 0;

  for (const booking of candidates) {
    const hostId = booking.property?.hostId;
    const hostNet = booking.hostNetAmount ?? 0;
    // Re-check in memory as well: the rule lives in one pure function, so the
    // sweep and its tests cannot drift apart.
    if (!hostId || hostNet <= 0 || !isHostFundsDue(booking, now)) continue;

    const frequency = booking.property?.host?.payoutFrequency ?? null;

    const credited = await prisma.$transaction(async (tx) => {
      const claim = await tx.booking.updateMany({
        where: { id: booking.id, hostFundsReleasedAt: null },
        data: { hostFundsReleasedAt: now },
      });
      if (claim.count === 0) return false;

      await tx.hostWallet.upsert({
        where: { hostId },
        create: { hostId, balance: hostNet, totalEarned: hostNet },
        update: { balance: { increment: hostNet }, totalEarned: { increment: hostNet } },
      });

      // New hosts have no next payout date, so without this the scheduled sweep
      // would never pick them up.
      if (frequency) {
        await tx.hostWallet.updateMany({
          where: { hostId, nextPayoutAt: null },
          data: { nextPayoutAt: computeNextPayoutDate(frequency) },
        });
      }

      return true;
    });

    if (credited) {
      released += 1;
      amount += hostNet;
      // This host has just earned for the first time, which is the event a
      // referral pays for. Called after the release has committed: a referral is
      // a bonus, and it must never be able to undo a host's own earnings.
      await creditReferralForFirstEarning(hostId, now);
    }
  }

  return { released, amount };
}

export async function getHostPayoutDestination(hostId: string) {
  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: { payoutMethod: true, mpesaPhone: true, bankName: true, bankAccountNo: true },
  });
  if (!host) throw new NotFoundError('User');

  const method = host.payoutMethod || (host.bankAccountNo ? 'bank' : null);
  return method === 'mpesa'
    ? { method, label: 'M-PESA', maskedAccount: maskPayoutAccount(host.mpesaPhone) }
    : method === 'bank'
      ? { method, label: host.bankName || 'Bank account', maskedAccount: maskPayoutAccount(host.bankAccountNo) }
      : { method: null, label: null, maskedAccount: null };
}

/** Process a payout for a specific host - transfers their accumulated wallet balance */
export async function processHostPayout(hostId: string, initiatedBy: string = 'system'): Promise<{
  payout: any;
  message: string;
}> {
  // Release anything whose hold has expired first, so an admin pressing the
  // button and the hourly sweep pay the same amount.
  await releaseDueHostFunds();

  // Check wallet balance
  const wallet = await prisma.hostWallet.findUnique({ where: { hostId } });
  if (!wallet || wallet.balance <= 0) {
    throw new ValidationError('No balance available for payout');
  }

  // Load the selected bank or M-PESA payout destination.
  const host = await prisma.user.findUnique({
    where: { id: hostId },
    select: {
      firstName: true,
      lastName: true,
      bankAccountNo: true,
      bankCode: true,
      bankName: true,
      payoutMethod: true,
      mpesaPhone: true,
      paystackRecipientCode: true,
      paystackRecipientKey: true,
      payoutFrequency: true,
    },
  });
  if (!host) throw new NotFoundError('User');

  // Check there isn't already a pending/processing payout
  const existing = await prisma.payout.findFirst({
    where: { hostId, status: { in: ['PENDING', 'PROCESSING'] } },
  });
  if (existing) {
    throw new ConflictError('Host already has a pending payout');
  }

  // Check Paystack balance before attempting
  // Paystack deducts its own transfer fee from the balance, so a payout for the
  // exact balance gets refused even though the money looks sufficient. Reserve
  // the configured headroom up front rather than discovering it as a failed
  // transfer. The reserve is only a pre-flight estimate: the real fee is taken
  // by Paystack, and a transfer that still fails is reversed.
  const transferFeeReserve = Number(env.PAYSTACK_TRANSFER_FEE_RESERVE_KES);
  const paystackBalance = await paystack.checkBalance();
  const balanceNeeded = wallet.balance + transferFeeReserve;
  if (paystackBalance < balanceNeeded) {
    throw new ValidationError(
      `Insufficient Paystack balance. Available: KES ${paystackBalance.toLocaleString()}, needed: KES ${balanceNeeded.toLocaleString()} ` +
      `(payout KES ${wallet.balance.toLocaleString()} plus KES ${transferFeeReserve.toLocaleString()} held back for Paystack's transfer fee)`
    );
  }

  const recipientName = `${host.firstName} ${host.lastName}`;

  const payoutMethod = host.payoutMethod || (host.bankAccountNo ? 'bank' : null);
  let recipientDetails: {
    type: 'kepss' | 'mobile_money';
    accountNumber: string;
    bankCode: string;
    key: string;
  };

  if (payoutMethod === 'mpesa') {
    if (!host.mpesaPhone) throw new ValidationError('Host has not set up an M-PESA payout number');
    const accountNumber = normalizeKenyanMpesaPhone(host.mpesaPhone);
    recipientDetails = {
      type: 'mobile_money',
      accountNumber,
      bankCode: 'MPESA',
      key: payoutRecipientKey('mpesa', accountNumber, 'MPESA'),
    };
  } else {
    if (!host.bankAccountNo || !host.bankCode) {
      throw new ValidationError('Host has not set up payout details');
    }
    recipientDetails = {
      type: 'kepss',
      accountNumber: host.bankAccountNo,
      bankCode: host.bankCode,
      key: payoutRecipientKey('bank', host.bankAccountNo, host.bankCode),
    };
  }

  // Create or reuse transfer recipient
  let recipientCode: string;
  if (host.paystackRecipientCode && host.paystackRecipientKey === recipientDetails.key) {
    recipientCode = host.paystackRecipientCode;
  } else {
    try {
      const recipient = await paystack.createTransferRecipient({
        name: recipientName,
        accountNumber: recipientDetails.accountNumber,
        bankCode: recipientDetails.bankCode,
        type: recipientDetails.type,
      });
      recipientCode = recipient.recipientCode;
      await prisma.user.update({
        where: { id: hostId },
        data: { paystackRecipientCode: recipientCode, paystackRecipientKey: recipientDetails.key },
      });
    } catch (e: any) {
      throw new ValidationError(`Failed to create transfer recipient: ${e.message}`);
    }
  }

  // Collect the unpaid bookings this payout covers. Only released funds count:
  // the wallet balance is built from those, so listing a booking still inside
  // its hold would mark it paid without its money having moved.
  const unpaidBookings = await prisma.booking.findMany({
    where: {
      property: { hostId },
      status: 'CONFIRMED',
      hostNetAmount: { gt: 0 },
      hostFundsReleasedAt: { not: null },
      payoutBookings: { none: {} },
    },
    select: { id: true, hostNetAmount: true },
  });

  const transferAmount = wallet.balance;

  // Claim the balance before touching Paystack. This conditional update only
  // matches while the balance is still exactly what we quoted, so an admin
  // click and the scheduled sweep can never both transfer the same money.
  const claimed = await prisma.hostWallet.updateMany({
    where: { hostId, balance: transferAmount },
    data: {
      balance: { decrement: transferAmount },
      totalPaidOut: { increment: transferAmount },
    },
  });
  if (claimed.count === 0) {
    throw new ConflictError('A payout for this host is already in progress');
  }

  const transferRef = `zrlft-pay-${crypto.randomUUID().slice(0, 12)}`;

  // Record the payout before the transfer so a failure always leaves something
  // to reverse the balance against.
  let payout;
  try {
    payout = await prisma.payout.create({
      data: {
        hostId,
        amount: transferAmount,
        transferRef,
        recipientCode,
        status: 'PENDING',
        initiatedBy,
        bookingsCount: unpaidBookings.length,
      },
    });
  } catch (e) {
    await refundClaim(hostId, transferAmount);
    throw e;
  }

  let transferResult: { transferRef: string; status: string };
  try {
    transferResult = await paystack.initiateTransfer({
      recipientCode,
      amount: transferAmount,
      reason: `ZuriLofts payout - ${unpaidBookings.length} booking(s)`,
      reference: transferRef,
    });
  } catch (e: any) {
    if (paystack.isPaystackTimeout(e)) {
      // Paystack may have accepted the transfer and the reply never arrived. The
      // balance is already claimed, so leaving the payout PENDING holds the money
      // instead of paying it a second time. reconcilePendingPayouts asks the
      // provider what happened and settles it either way.
      await prisma.payout.updateMany({
        where: { id: payout.id, status: 'PENDING' },
        data: {
          failureReason:
            'Transfer outcome unknown: the provider did not answer in time. Awaiting reconciliation.',
        },
      });
      console.error(`PAYOUT-TIMEOUT ${transferRef} left PENDING for reconciliation`);
      throw new ValidationError(
        'The payment provider did not answer, so the transfer outcome is unknown. ' +
          'The payout is held and will be reconciled automatically; it has not been retried.',
      );
    }
    // A refusal is definite: nothing was sent, so put the claim back.
    await settleFailedTransfer(transferRef, 'FAILED', `Transfer initiation failed: ${e.message}`);
    throw new ValidationError(`Transfer initiation failed: ${e.message}`);
  }

  // Conditional on PENDING: a `transfer.success` webhook can land between the
  // Paystack call returning and this write. An unconditional update forces the
  // payout back to PROCESSING, which reopens the failure direction and lets a
  // later failure notice refund money the provider already delivered.
  const advanced = await prisma.payout.updateMany({
    where: { id: payout.id, status: 'PENDING' },
    data: { status: 'PROCESSING', transferRef: transferResult.transferRef },
  });

  if (advanced.count === 0) {
    // A webhook settled this payout first. Do not link the bookings now: a
    // payoutBooking row excludes a booking from every future payout, and the
    // failure path has already deleted the rows it knew about, so writing them
    // here would strand that money for good.
    const settled = await prisma.payout.findUnique({ where: { id: payout.id } });
    return {
      payout: settled ?? payout,
      message:
        `Payout of KES ${transferAmount.toLocaleString()} was settled by the payment provider ` +
        'before it could be recorded as processing',
    };
  }

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

  // The balance was already reduced when the claim was taken, so only the
  // payout timing fields are left to record.
  await prisma.hostWallet.update({
    where: { hostId },
    data: {
      lastPayoutAt: new Date(),
      nextPayoutAt: host.payoutFrequency ? computeNextPayoutDate(host.payoutFrequency) : null,
    },
  });

  return {
    payout: { ...payout, status: 'PROCESSING', transferRef: transferResult.transferRef },
    message: `Payout of KES ${transferAmount.toLocaleString()} initiated`,
  };
}

/** Put a claimed balance back when the payout record could not be created. */
async function refundClaim(hostId: string, amount: number): Promise<void> {
  await prisma.hostWallet.update({
    where: { hostId },
    data: { balance: { increment: amount }, totalPaidOut: { decrement: amount } },
  });
}

/**
 * What a provider transfer notice did.
 *
 * 'not_found' is its own answer rather than another "ignored": a notice for a
 * reference we do not hold means the provider and this database disagree about a
 * transfer of real money, and a person has to look. It used to be reported as
 * false, the same as a harmless redelivery, so the alarming case was invisible.
 */
export type TransferOutcome = 'applied' | 'already' | 'not_found';

/**
 * Mark a payout SUCCESS when the provider reports the transfer arrived.
 *
 * Conditional, because transfer notices are retried and can arrive out of
 * order: a success landing after the balance was already restored for a failed
 * or reversed transfer must not reopen that payout. Reporting an ignored
 * notice honestly is what keeps a provider-side replay visible in the logs
 * instead of letting it move money later.
 *
 * Reports what the notice did, so a reference we cannot match is not filed as a
 * routine replay.
 */
export async function markTransferSucceeded(transferRef: string): Promise<TransferOutcome> {
  const payout = await prisma.payout.findUnique({ where: { transferRef } });
  if (!payout) return 'not_found';
  if (isSettledPayoutStatus(payout.status)) return 'already';

  const flipped = await prisma.payout.updateMany({
    where: { transferRef, status: { notIn: [...SETTLED_PAYOUT_STATUSES] } },
    data: { status: 'SUCCESS', completedAt: new Date() },
  });
  return flipped.count > 0 ? 'applied' : 'already';
}

/**
 * Settle a payout Paystack reports as FAILED or REVERSED.
 *
 * The host's balance is reduced when a transfer is initiated, so without this
 * the host looked paid while receiving nothing. Releasing the payout's bookings
 * matters just as much: they are excluded from every future payout while a
 * payoutBooking row points at them, so a failed transfer used to strand that
 * money permanently.
 *
 * Reports what the notice did: 'not_found' when no payout holds the reference.
 */
export async function settleFailedTransfer(
  transferRef: string,
  status: 'FAILED' | 'REVERSED',
  reason?: string,
): Promise<TransferOutcome> {
  const payout = await prisma.payout.findUnique({ where: { transferRef } });
  if (!payout) return 'not_found';
  // Two guards, because they answer different questions. This one refuses a
  // notice that may not apply to this state at all - a failure arriving against
  // a payout the provider already confirmed, or a repeat of one already applied.
  if (!canSettleFailedTransfer(payout.status, status)) return 'already';
  if (isSettledPayoutStatus(payout.status)) return 'already';

  return prisma.$transaction(async (tx) => {
    const flipped = await tx.payout.updateMany({
      where: { id: payout.id, status: { in: [...FAILURE_NOTICE_SOURCE_STATUSES[status]] } },
      data: { status, failureReason: reason ?? null },
    });
    if (flipped.count === 0) return 'already' as const;

    await tx.hostWallet.update({
      where: { hostId: payout.hostId },
      data: {
        balance: { increment: payout.amount },
        totalPaidOut: { decrement: payout.amount },
      },
    });
    await tx.payoutBooking.deleteMany({ where: { payoutId: payout.id } });
    return 'applied' as const;
  });
}

/**
 * Resolve payouts whose transfer outcome was never learned.
 *
 * A transfer whose reply is lost is left PENDING with the host's balance already
 * claimed. Without this the money sits there: the sweep skips a host who has a
 * pending payout, and nothing else ever asks the provider what happened.
 */
export async function reconcilePendingPayouts(
  olderThanMinutes = 15,
): Promise<{ checked: number; settled: number }> {
  if (!env.PAYSTACK_SECRET_KEY) return { checked: 0, settled: 0 };

  const cutoff = new Date(Date.now() - olderThanMinutes * 60 * 1000);
  const stuck = await prisma.payout.findMany({
    where: { status: 'PENDING', createdAt: { lt: cutoff } },
    select: { id: true, transferRef: true },
  });

  let settled = 0;

  for (const payout of stuck) {
    // A payout without a reference cannot be looked up, and cannot be one of the
    // rows this routine is for: the reference is written before the transfer.
    const transferRef = payout.transferRef;
    if (!transferRef) continue;

    let transfer: { status: string } | null;
    try {
      transfer = await paystack.verifyTransfer(transferRef);
    } catch (err: any) {
      // Still unreachable. The payout stays held and is retried next run.
      console.error(`Reconcile ${transferRef}: provider call failed: ${err?.message || err}`);
      continue;
    }

    if (!transfer) {
      // Paystack never saw this reference, so nothing moved: reverse the claim.
      const reverted = await settleFailedTransfer(
        transferRef,
        'FAILED',
        'Provider had no record of this transfer - claim reversed on reconciliation',
      );
      if (reverted === 'applied') settled += 1;
      continue;
    }

    const status = transfer.status.toLowerCase();
    if (status === 'success') {
      if ((await markTransferSucceeded(transferRef)) === 'applied') settled += 1;
      continue;
    }

    if (['failed', 'reversed', 'abandoned', 'blocked'].includes(status)) {
      const notice = status === 'reversed' ? 'REVERSED' : 'FAILED';
      const reverted = await settleFailedTransfer(
        transferRef,
        notice,
        `Provider reported the transfer as ${status} (reconciliation)`,
      );
      if (reverted === 'applied') settled += 1;
    }
    // pending, otp and anything unknown carry no answer yet: check again next run.
  }

  return { checked: stuck.length, settled };
}

/** Process all scheduled payouts for hosts whose next payout date is due */
export async function processScheduledPayouts(): Promise<{ processed: string[]; failed: { hostId: string; reason: string }[] }> {
  // Stays whose hold has expired become payable here, then get paid in the same
  // run, so a host never waits an extra scheduling cycle for money already due.
  await releaseDueHostFunds();
  const now = new Date();

  const dueWallets = await prisma.hostWallet.findMany({
    where: {
      nextPayoutAt: { lte: now },
      balance: { gt: 0 },
      // Skip hosts with nowhere to send money, otherwise an unattended hourly
      // sweep would retry them forever and bury the real failures in logs.
      host: {
        OR: [
          { payoutMethod: { not: null } },
          { bankAccountNo: { not: null } },
          { mpesaPhone: { not: null } },
        ],
      },
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
export function computeNextPayoutDate(frequency: string): Date {
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
