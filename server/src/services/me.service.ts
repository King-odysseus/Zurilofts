import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { ValidationError, ForbiddenError, NotFoundError } from '../types/index.js';
import { getConsentRecordsForUser } from './consent.service.js';

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

async function countAdmins(): Promise<number> {
  const admins = await prisma.user.findMany({
    where: { role: 'ADMIN' as any },
    select: { id: true },
  });
  return admins.length;
}

export async function deleteUserAccount(userId: string, confirm: string) {
  if (confirm !== 'DELETE') {
    throw new ValidationError(
      'You must send { confirm: "DELETE" } to proceed with account erasure'
    );
  }

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      bookings: {
        select: { id: true },
      },
    },
  });

  if (!user) throw new NotFoundError('User');

  // Refuse if user is the only remaining ADMIN
  if ((user.role as string) === 'ADMIN' && (await countAdmins()) <= 1) {
    throw new ForbiddenError(
      'You are the only remaining administrator. Please promote another user to ADMIN before deleting your account, or this platform will become unmanageable.'
    );
  }

  const hasBookings = user.bookings.length > 0;
  const logPrefix = `[ERASURE] userId=${userId} hasBookings=${hasBookings}`;

  if (hasBookings) {
    // Anonymise the User row -- financial history stays intact but de-identified
    const placeholderEmail = `deleted-${crypto.randomUUID()}@deleted.invalid`;

    await prisma.$transaction(async (tx) => {
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
          payoutFrequency: null,
          suspended: true,
        },
      });

      // Hard-delete purely personal data
      await tx.favorite.deleteMany({ where: { userId } });
      await tx.shortlistItem.deleteMany({
        where: { shortlist: { ownerId: userId } },
      });
      await tx.shortlist.deleteMany({ where: { ownerId: userId } });
      await tx.pushSubscription.deleteMany({ where: { userId } });

      // Delete reviews the user wrote
      await tx.review.deleteMany({ where: { userId } });

      // Delete messages the user sent
      await tx.conversationMessage.deleteMany({ where: { senderId: userId } });
      await tx.message.deleteMany({ where: { userId } });
    });

    console.log(`${logPrefix} path=ANONYMISE`);
    return {
      erased: true,
      path: 'anonymised',
      message:
        'Your personal data has been removed. Financial records related to your bookings have been retained as required by law but are no longer linked to an identifiable person.',
    };
  }

  // No bookings -- hard-delete the User and all related data
  await prisma.$transaction(async (tx) => {
    // Delete conversations and messages where user participated
    await tx.conversationMessage.deleteMany({ where: { senderId: userId } });

    // Find and delete conversations where user is a participant via their bookings
    // (should be none since hasBookings is false, but handle for safety)
    await tx.conversation.deleteMany({
      where: {
        booking: {
          OR: [
            { userId },
            { property: { hostId: userId } },
          ],
        },
      },
    });

    // Delete reviews
    await tx.review.deleteMany({ where: { userId } });

    // Delete personal data
    await tx.favorite.deleteMany({ where: { userId } });
    await tx.shortlistItem.deleteMany({
      where: { shortlist: { ownerId: userId } },
    });
    await tx.shortlist.deleteMany({ where: { ownerId: userId } });
    await tx.pushSubscription.deleteMany({ where: { userId } });
    await tx.message.deleteMany({ where: { userId } });

    // Hard-delete the user (no bookings means no cascade issues)
    await tx.user.delete({ where: { id: userId } });
  });

  console.log(`${logPrefix} path=HARD_DELETE`);
  return {
    erased: true,
    path: 'hard-deleted',
    message:
      'Your account and all associated data have been permanently deleted.',
  };
}