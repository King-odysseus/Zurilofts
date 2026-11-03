import type { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { ValidationError } from '../types/index.js';
import { normalizeAttachments, withParsedAttachments } from '../utils/messageAttachments.js';
import { paginationMeta, parsePaging } from '../utils/paging.js';

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

export interface ConversationFilters {
  search?: string;
  unreadOnly?: boolean;
  page?: number;
  limit?: number;
}

/**
 * Inbox: one row per customer with a conversation, latest first, with unread
 * counts.
 *
 * This used to issue a `message.count` per user inside a Promise.all, so an
 * inbox of 500 customers meant 501 round trips. The unread tally is now a
 * filtered relation count riding on the single user query.
 *
 * The ordering is deliberately in memory: Prisma cannot order a parent by an
 * aggregate of its children (max(message.createdAt)), and raw SQL here would tie
 * the service to one database. What gets sorted is the filtered conversation
 * list itself, so the cost is proportional to what an admin can actually see.
 *
 * The totals are therefore exact for the filters: they describe the conversation
 * count before slicing, not just the page.
 */
export async function listConversations(filters: ConversationFilters = {}) {
  const paging = parsePaging({ page: filters.page, limit: filters.limit });

  const where: Prisma.UserWhereInput = { messages: { some: {} } };

  const search = filters.search?.trim();
  if (search) {
    // One filter for both schemas: Postgres compares insensitively through
    // Prisma's `mode`, SQLite's LIKE is already ASCII case-insensitive.
    where.OR = [
      { firstName: { contains: search } },
      { lastName: { contains: search } },
      { email: { contains: search } },
    ];
  }
  if (filters.unreadOnly) {
    // Narrow the base relation too, so a customer with only read messages is not
    // returned at all rather than returned with a zero badge.
    where.messages = { some: { senderRole: 'USER', readByAdmin: false } };
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      messages: { orderBy: { createdAt: 'desc' }, take: 1 },
      // Filtered relation count: the unread tally without a query per row.
      _count: {
        select: {
          messages: { where: { senderRole: 'USER', readByAdmin: false } },
        },
      },
    },
  });

  const rows = users
    .map((u) => ({
      userId: u.id,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      // Parsed so the inbox can show "sent a file" without knowing the column
      // holds JSON. content is left exactly as stored.
      lastMessage: u.messages[0] ? withParsedAttachments(u.messages[0]) : null,
      unread: u._count.messages,
    }))
    .sort(
      (a, b) =>
        new Date(b.lastMessage?.createdAt || 0).getTime() -
        new Date(a.lastMessage?.createdAt || 0).getTime()
    );

  return {
    rows: rows.slice(paging.skip, paging.skip + paging.limit),
    pagination: paginationMeta(rows.length, paging),
  };
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

/**
 * Explicit "the admin has read this customer's thread" marker.
 *
 * getAdminThread() already clears the flag, but only as a side effect of a
 * fetch: if that response never reaches the browser the messages stay unread
 * while the inbox looks clean, and nothing can be retried. This gives the client
 * an intentional, idempotent call it can await before it hides the badge, and
 * returns how many messages it actually cleared so a caller can tell a real
 * change from a no-op.
 */
export async function markThreadReadByAdmin(userId: string) {
  const { count } = await prisma.message.updateMany({
    where: { userId, readByAdmin: false },
    data: { readByAdmin: true },
  });
  return count;
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
