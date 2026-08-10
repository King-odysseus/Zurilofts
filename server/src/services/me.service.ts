import crypto from 'crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { ValidationError, ForbiddenError, NotFoundError, ConflictError } from '../types/index.js';
import { getConsentRecordsForUser } from './consent.service.js';
import { deleteImage } from '../utils/imageStorage.js';
import { hasOutstandingHostFunds, requiresAccountRetention } from '../utils/accountErasure.js';

// ---------------------------------------------------------------
// Data export -- GDPR right of access + portability
// ---------------------------------------------------------------

export async function exportUserData(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      googleId: true,
      bankName: true,
      bankAccountNo: true,
      bankCode: true,
      payoutMethod: true,
      mpesaPhone: true,
      payoutFrequency: true,
      suspended: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) throw new NotFoundError('User');

  // Bookings with add-ons, payments, reviews
  const bookings = await prisma.booking.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: {
      property: {
        select: {
          id: true,
          title: true,
          location: true,
          hostId: true,
        },
      },
      addOns: {
        include: {
          addOn: {
            select: { id: true, name: true, category: true },
          },
        },
      },
      review: true,
      promoCode: {
        select: { code: true, discountPercent: true },
      },
    },
  });

  // Conversations the user participates in (only their own messages)
  const conversations = await prisma.conversation.findMany({
    where: {
      booking: {
        OR: [
          { userId },
          { property: { hostId: userId } },
        ],
      },
    },
    include: {
      booking: {
        select: {
          id: true,
          property: {
            select: {
              host: { select: { id: true, firstName: true, lastName: true } },
            },
          },
          user: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // For each conversation, fetch only the caller's own messages
  const conversationData = await Promise.all(
    conversations.map(async (c) => {
      const myMessages = await prisma.conversationMessage.findMany({
        where: { conversationId: c.id, senderId: userId },
        orderBy: { createdAt: 'asc' },
      });
      return {
        conversationId: c.id,
        bookingId: c.booking.id,
        counterparty:
          (c.booking.property.host as any)?.id === userId
            ? {
                id: (c.booking.user as any).id,
                displayName: `${(c.booking.user as any).firstName} ${(c.booking.user as any).lastName}`,
              }
            : {
                id: (c.booking.property.host as any)?.id,
                displayName: `${(c.booking.property.host as any)?.firstName} ${(c.booking.property.host as any)?.lastName}`,
              },
        myMessages,
      };
    })
  );

  // Legacy messages (in-app messages with admin)
  const legacyMessages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
  });

  // Favourites
  const favorites = await prisma.favorite.findMany({
    where: { userId },
    include: {
      property: {
        select: { id: true, title: true, location: true },
      },
    },
  });

  // Shortlists with their items
  const shortlists = await prisma.shortlist.findMany({
    where: { ownerId: userId },
    include: {
      items: {
        include: {
          property: {
            select: { id: true, title: true, location: true },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Push subscriptions
  const pushSubscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
  });

  // Consent records
  const consentRecords = await getConsentRecordsForUser(userId);

  return {
    profile: user,
    bookings,
    conversations: conversationData,
    legacyMessages,
    favorites,
    shortlists,
    pushSubscriptions,
    consentRecords,
  };
}

// ---------------------------------------------------------------
// Account erasure -- GDPR right to erasure
// ---------------------------------------------------------------

export interface AccountErasureActor {
  id: string;
  role: 'SELF' | 'ADMIN';
  reason?: string;
}

export async function deleteUserAccount(
  userId: string,
  confirm: string,
  actor: AccountErasureActor = { id: userId, role: 'SELF' },
) {
  if (confirm !== 'DELETE') {
    throw new ValidationError(
      'You must send { confirm: "DELETE" } to proceed with account erasure'
    );
  }

  const logPrefix = `[ERASURE] target=${userId} actor=${actor.id} actorRole=${actor.role}`;

  const erasePersonalRelations = async (tx: Prisma.TransactionClient) => {
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.shortlistItem.deleteMany({ where: { shortlist: { ownerId: userId } } });
    await tx.shortlist.deleteMany({ where: { ownerId: userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.review.deleteMany({ where: { userId } });
    await tx.conversationMessage.deleteMany({ where: { senderId: userId } });
    await tx.message.deleteMany({ where: { userId } });
    await tx.hostApplication.deleteMany({ where: { userId } });
    await tx.consentRecord.updateMany({ where: { userId }, data: { userId: null } });
  };

  // Serializable isolation makes the eligibility check and erasure one atomic
  // decision, preventing a booking or payout from being added mid-erasure.
  const erasure = await prisma.$transaction(async (tx) => {
    const user = await tx.user.findUnique({
      where: { id: userId },
      include: {
        bookings: { select: { id: true } },
        properties: { select: { id: true } },
        payouts: { select: { id: true, status: true } },
        wallet: { select: { balance: true } },
      },
    });

    if (!user || user.deletedAt) throw new NotFoundError('User');

    if ((user.role as string) === 'ADMIN') {
      const adminCount = await tx.user.count({
        where: { role: 'ADMIN' as any, deletedAt: null },
      });
      if (adminCount <= 1) {
        throw new ForbiddenError(
          'You cannot delete the only remaining administrator. Promote another administrator first.'
        );
      }
    }

    if (hasOutstandingHostFunds({
      walletBalance: user.wallet?.balance ?? 0,
      payoutStatuses: user.payouts.map((payout) => payout.status),
    })) {
      throw new ConflictError(
        'This account has an outstanding wallet balance or payout. Resolve it before deleting the account.'
      );
    }

    const retainAccount = requiresAccountRetention({
      guestBookings: user.bookings.length,
      properties: user.properties.length,
      payouts: user.payouts.length,
      hasWallet: Boolean(user.wallet),
    });
    const path = retainAccount ? 'anonymised' : 'hard-deleted';

    if (retainAccount) {
      const placeholderEmail = `deleted-${crypto.randomUUID()}@deleted.invalid`;
      await tx.user.update({
        where: { id: userId },
        data: {
          email: placeholderEmail,
          firstName: '',
          lastName: '',
          phone: null,
          avatar: null,
          googleId: null,
          passwordHash: null,
          bankName: null,
          bankAccountNo: null,
          bankCode: null,
          payoutMethod: null,
          mpesaPhone: null,
          paystackRecipientCode: null,
          paystackRecipientKey: null,
          payoutFrequency: null,
          suspended: true,
          deletedAt: new Date(),
          role: 'USER' as any,
        },
      });

      // A deleted host must not receive new bookings. Existing bookings and
      // financial records remain available to staff for fulfilment and audit.
      await tx.property.updateMany({ where: { hostId: userId }, data: { available: false } });
      await erasePersonalRelations(tx);
    } else {
      await erasePersonalRelations(tx);
      await tx.user.delete({ where: { id: userId } });
    }

    await tx.accountErasureLog.create({
      data: {
        targetUserId: userId,
        actorId: actor.id,
        actorRole: actor.role,
        path,
        reason: actor.reason,
      },
    });

    return { avatar: user.avatar, path };
  }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });

  await deleteImage(erasure.avatar).catch((error) => {
    console.error(`${logPrefix} avatar_cleanup_failed`, error);
  });
  console.log(`${logPrefix} path=${erasure.path.toUpperCase()}`);

  if (erasure.path === 'anonymised') {
    return {
      erased: true,
      path: erasure.path,
      message:
        'The account personal data has been removed. Business and financial records were retained in anonymised form as required for operations and legal compliance.',
    };
  }

  return {
    erased: true,
    path: erasure.path,
    message:
      'The account and all associated personal data have been permanently deleted.',
  };
}
