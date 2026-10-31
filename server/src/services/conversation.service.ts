import prisma from '../config/prisma.js';
import { NotFoundError, ForbiddenError, ValidationError } from '../types/index.js';
import { normalizeAttachments, withParsedAttachments } from '../utils/messageAttachments.js';

// ---------------------------------------------------------------
// Normalize helpers
// ---------------------------------------------------------------

function stripHtml(input: string): string {
  return input.replace(/<[^>]*>/g, '');
}

// Text is optional when the message carries a file, so emptiness is the caller's
// decision; only trimming, length and markup are handled here.
function sanitizeContent(raw: unknown): string {
  const trimmed = typeof raw === 'string' ? raw.trim() : '';
  // Deliberately no emptiness check here: an attachment-only message is valid.
  if (trimmed.length > 5000) throw new ValidationError('Message content exceeds 5000 characters');
  return stripHtml(trimmed);
}

// ---------------------------------------------------------------
// Participation check - enforces at DB level, never in JS
// ---------------------------------------------------------------

async function requireParticipant(
  conversationId: string,
  userId: string,
  isAdmin: boolean
): Promise<{ conversation: any; role: 'guest' | 'host' }> {
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      booking: {
        include: {
          property: { select: { hostId: true, host: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      },
    },
  });

  if (!conversation) throw new NotFoundError('Conversation');

  if (!isAdmin) {
    const isGuest = conversation.booking.userId === userId;
    const isHost = conversation.booking.property.hostId === userId;
    if (!isGuest && !isHost) throw new ForbiddenError('You are not a participant in this conversation');
    return { conversation, role: isGuest ? 'guest' : 'host' };
  }

  return { conversation, role: 'host' }; // admins treated as host for read-purposes
}

// ---------------------------------------------------------------
// Public API
// ---------------------------------------------------------------

interface GetOrCreateInput {
  bookingId: string;
  userId: string;
}

export async function getOrCreateConversation(input: GetOrCreateInput) {
  const booking = await prisma.booking.findUnique({
    where: { id: input.bookingId },
    include: { property: { select: { hostId: true } } },
  });

  if (!booking) throw new NotFoundError('Booking');

  // Only the guest or the host may start a conversation about this booking
  if (booking.userId !== input.userId && booking.property.hostId !== input.userId) {
    throw new ForbiddenError('You are not a participant in this booking');
  }

  // Idempotent: return existing conversation if one already exists
  const existing = await prisma.conversation.findUnique({
    where: { bookingId: input.bookingId },
    include: {
      booking: {
        include: {
          property: { select: { id: true, title: true, location: true, imagesJson: true, hostId: true, host: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      },
    },
  });

  if (existing) return existing;

  const conversation = await prisma.conversation.create({
    data: { bookingId: input.bookingId },
    include: {
      booking: {
        include: {
          property: { select: { id: true, title: true, location: true, imagesJson: true, hostId: true, host: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      },
    },
  });

  return conversation;
}

/**
 * Which side of a conversation the caller is asking about. One account can be on
 * both sides at once - a host who books a stay is a guest in that conversation -
 * and those are two separate inboxes rather than one merged list.
 */
export type ConversationSide = 'guest' | 'host';

/** The relation filter for one side, or both when no side is asked for. */
function conversationSideFilter(userId: string, side?: ConversationSide) {
  if (side === 'guest') return { booking: { userId } };
  if (side === 'host') return { booking: { property: { hostId: userId } } };
  // Unscoped callers (admin tooling) still want everything the account touches.
  return { booking: { OR: [{ userId }, { property: { hostId: userId } }] } };
}

export async function listUserConversations(userId: string, side?: ConversationSide) {
  const conversations = await prisma.conversation.findMany({
    where: conversationSideFilter(userId, side),
    include: {
      messages: {
        orderBy: { createdAt: 'desc' },
        take: 1,
        select: {
          id: true,
          content: true,
          attachments: true,
          senderId: true,
          read: true,
          createdAt: true,
        },
      },
      booking: {
        include: {
          property: { select: { id: true, title: true, location: true, imagesJson: true, hostId: true, host: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
          user: { select: { id: true, firstName: true, lastName: true, avatar: true } },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  });

  // Compute unread count per conversation (messages from the other party, unread by caller)
  const result = await Promise.all(
    conversations.map(async (c: { id: string; messages: any[] }) => {
      const unreadCount = await prisma.conversationMessage.count({
        where: {
          conversationId: c.id,
          senderId: { not: userId },
          read: false,
        },
      });
      return {
        ...c,
        // Parsed so a preview can show that a file was sent; content is unchanged.
        lastMessage: c.messages[0] ? withParsedAttachments(c.messages[0]) : null,
        unreadCount,
        messages: undefined,
      };
    })
  );

  return result;
}

export async function getConversation(conversationId: string, userId: string, isAdmin: boolean) {
  const { conversation } = await requireParticipant(conversationId, userId, isAdmin);
  return conversation;
}

export async function getMessages(
  conversationId: string,
  userId: string,
  isAdmin: boolean,
  page = 1,
  limit = 50
) {
  await requireParticipant(conversationId, userId, isAdmin);

  const skip = (page - 1) * limit;

  const [messages, total] = await Promise.all([
    prisma.conversationMessage.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
      include: {
        sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
      },
    }),
    prisma.conversationMessage.count({ where: { conversationId } }),
  ]);

  return {
    messages: messages.reverse().map(withParsedAttachments), // return chronological order
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  rawContent: unknown,
  rawAttachments: unknown
) {
  // Both validations run before the insert, so a rejected attachment list never
  // leaves a partial message behind.
  const attachments = normalizeAttachments(rawAttachments);
  const content = sanitizeContent(rawContent);
  if (!content && !attachments) {
    throw new ValidationError('Message content cannot be empty');
  }

  // Verify participation via the booking
  const conversation = await prisma.conversation.findUnique({
    where: { id: conversationId },
    include: {
      booking: {
        include: {
          property: { select: { hostId: true, host: { select: { id: true, firstName: true, lastName: true, avatar: true } } } },
        },
      },
    },
  });

  if (!conversation) throw new NotFoundError('Conversation');

  const isGuest = conversation.booking.userId === senderId;
  const isHost = conversation.booking.property.hostId === senderId;
  if (!isGuest && !isHost) {
    throw new ForbiddenError('You are not a participant in this conversation');
  }

  const message = await prisma.conversationMessage.create({
    data: {
      conversationId,
      senderId,
      content,
      attachments,
    },
    include: {
      sender: { select: { id: true, firstName: true, lastName: true, avatar: true } },
    },
  });

  // Touch the conversation's updatedAt
  await prisma.conversation.update({
    where: { id: conversationId },
    data: { updatedAt: new Date() },
  });

  // Notify the other participant of the new message (best-effort)
  const recipientId = isGuest ? conversation.booking.property.hostId : conversation.booking.userId;
  if (recipientId) {
    try {
      const { sendPushToUser } = await import('./push.service.js');
      sendPushToUser(recipientId, 'New Message', 'You have a new message about your booking.', `/inbox/${conversationId}`);
    } catch (err) { console.error('Push notification failed:', err); }
  }

  return withParsedAttachments(message);
}

export async function markAsRead(conversationId: string, userId: string, isAdmin: boolean) {
  await requireParticipant(conversationId, userId, isAdmin);

  // Mark messages from the OTHER party as read
  const result = await prisma.conversationMessage.updateMany({
    where: {
      conversationId,
      senderId: { not: userId },
      read: false,
    },
    data: { read: true },
  });

  return { markedRead: result.count };
}

export async function getUnreadCount(userId: string, side?: ConversationSide) {
  // Count unread messages where the message is NOT from the caller, across the
  // conversations of one side so each header badge counts its own inbox only.
  const conversations = await prisma.conversation.findMany({
    where: conversationSideFilter(userId, side),
    select: { id: true },
  });

  if (conversations.length === 0) return { count: 0 };

  const count = await prisma.conversationMessage.count({
    where: {
      conversationId: { in: conversations.map((c: { id: string }) => c.id) },
      senderId: { not: userId },
      read: false,
    },
  });

  return { count };
}