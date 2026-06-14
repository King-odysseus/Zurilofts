import prisma from '../config/prisma.js';

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
  return messages;
}

/** Count of unread admin replies for the customer's nav badge. */
export async function getUserUnreadCount(userId: string) {
  return prisma.message.count({ where: { userId, senderRole: 'ADMIN', readByUser: false } });
}

export async function sendUserMessage(userId: string, body: string) {
  return prisma.message.create({
    data: { userId, senderRole: 'USER', body, readByAdmin: false, readByUser: true },
  });
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
      lastMessage: u.messages[0] || null,
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
  return messages;
}

export async function sendAdminMessage(userId: string, body: string) {
  return prisma.message.create({
    data: { userId, senderRole: 'ADMIN', body, readByAdmin: true, readByUser: false },
  });
}
