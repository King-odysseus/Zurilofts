import prisma from '../config/prisma.js';
import { ValidationError } from '../types/index.js';
import { normalizeAttachments, withParsedAttachments } from '../utils/messageAttachments.js';

// A message needs text or a file. The text itself is optional so an
// attachment-only message is allowed, but one of the two must be there.
function readBody(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

// ---- Customer side ----

/** A customer's full conversation, oldest first. Marks admin replies as read. */
export async function getUserThread(userId: string) {
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  await prisma.message.updateMany({
    where: { userId, senderRole: 'ADMIN', readByUser: false },
    data: { readByUser: true },
  });
  return messages.map(withParsedAttachments);
}

/** Count of unread admin replies for the customer's nav badge. */
export async function getUserUnreadCount(userId: string) {
  return prisma.message.count({ where: { userId, senderRole: 'ADMIN', readByUser: false } });
}

export async function sendUserMessage(userId: string, rawBody: unknown, rawAttachments: unknown) {
  // Validate before the insert so a bad attachment list never leaves a partial
  // message behind.
  const attachments = normalizeAttachments(rawAttachments);
  const body = readBody(rawBody);
  if (!body && !attachments) {
    throw new ValidationError('Message cannot be empty');
  }

  const message = await prisma.message.create({
    data: { userId, senderRole: 'USER', body, attachments, readByAdmin: false, readByUser: true },
  });

  // Notify all admins of the new support message (best-effort)
  try {
    const { sendPushToUser } = await import('./push.service.js');
    const admins = await prisma.user.findMany({ where: { role: 'ADMIN' }, select: { id: true } });
    await Promise.allSettled(
      admins.map((a: { id: string }) =>
        sendPushToUser(a.id, 'New Support Message', 'A guest sent a new message.', '/admin/messages')
      )
    );
  } catch (err) { console.error('Push notification failed:', err); }

  return withParsedAttachments(message);
}

// ---- Admin side ----

/** Inbox: one row per customer with a conversation, latest first, with unread counts. */
export async function listConversations() {
  const users = await prisma.user.findMany({
    where: { messages: { some: {} } },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
    },
  });

  const rows = await Promise.all(
    users.map(async (u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      // Parsed so the inbox can show "sent a file" without knowing the column
      // holds JSON. content is left exactly as stored.
      lastMessage: u.messages[0] ? withParsedAttachments(u.messages[0]) : null,
      unread: await prisma.message.count({
        where: { userId: u.id, senderRole: 'USER', readByAdmin: false },
      }),
    }))
  );

  rows.sort(
    (a, b) =>
      new Date(b.lastMessage?.createdAt || 0).getTime() -
      new Date(a.lastMessage?.createdAt || 0).getTime()
  );
  return rows;
}

/** Total unread customer messages across all conversations (admin badge). */
export async function getAdminUnreadCount() {
  return prisma.message.count({ where: { senderRole: 'USER', readByAdmin: false } });
}

/** One customer's thread for the admin; marks their messages as read. */
export async function getAdminThread(userId: string) {
  const messages = await prisma.message.findMany({
    where: { userId },
    orderBy: { createdAt: 'asc' },
  });
  await prisma.message.updateMany({
    where: { userId, senderRole: 'USER', readByAdmin: false },
    data: { readByAdmin: true },
  });
  return messages.map(withParsedAttachments);
}

export async function sendAdminMessage(userId: string, rawBody: unknown, rawAttachments: unknown) {
  const attachments = normalizeAttachments(rawAttachments);
  const body = readBody(rawBody);
  if (!body && !attachments) {
    throw new ValidationError('Message cannot be empty');
  }

  const message = await prisma.message.create({
    data: { userId, senderRole: 'ADMIN', body, attachments, readByAdmin: true, readByUser: false },
  });

  try {
    const { sendPushToUser } = await import('./push.service.js');
    sendPushToUser(userId, 'New Message from ZuriLofts', 'Support has replied to your message.', '/messages');
  } catch (err) { console.error('Push notification failed:', err); }

  return withParsedAttachments(message);
}
