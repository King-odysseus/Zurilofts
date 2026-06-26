import prisma from '../config/prisma.js';
import webpush from 'web-push';

// VAPID keys: set via env var or generate on first run.
// Run: node -e "const w=require('web-push');console.log(w.generateVAPIDKeys())"
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:wingzatari@gmail.com', vapidPublicKey, vapidPrivateKey);
}

/** Save or update a push subscription for a user */
export async function subscribe(userId: string, endpoint: string, keys: { p256dh: string; auth: string }) {
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { userId, keys: JSON.stringify(keys), updatedAt: new Date() },
    create: { userId, endpoint, keys: JSON.stringify(keys) },
  });
}

/** Remove a subscription by endpoint */
export async function unsubscribe(endpoint: string) {
  try {
    await prisma.pushSubscription.delete({ where: { endpoint } });
  } catch { /* already gone */ }
  return { ok: true };
}

/** Get all subscriptions for a user */
export async function getSubscriptionsForUser(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId } });
}

/** Get all subscriptions (admin broadcast) */
export async function getAllSubscriptions() {
  return prisma.pushSubscription.findMany({ take: 5000 });
}

/** Send push notification with title + body payload */
export async function sendPush(
  subscriptions: Array<{ endpoint: string; keys: string }>,
  title: string,
  body: string,
  url = '/',
) {
  if (!vapidPublicKey || !vapidPrivateKey) {
    console.warn('Push: VAPID keys not configured. Skipping push send.');
    return [];
  }

  const payload = JSON.stringify({ title, body, url });
  const results: Array<{ endpoint: string; ok: boolean }> = [];

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        const pushSub = {
          endpoint: sub.endpoint,
          keys: typeof sub.keys === 'string' ? JSON.parse(sub.keys) : sub.keys,
        };
        await webpush.sendNotification(pushSub, payload);
        results.push({ endpoint: sub.endpoint, ok: true });
      } catch (err: any) {
        // Remove dead subscriptions (410 Gone or 404)
        if (err.statusCode === 410 || err.statusCode === 404) {
          try { await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }); } catch { /* ignore */ }
        }
        results.push({ endpoint: sub.endpoint, ok: false });
      }
    }),
  );

  return results;
}

/** Send push to a specific user by userId */
export async function sendPushToUser(userId: string, title: string, body: string, url = '/') {
  const subs = await getSubscriptionsForUser(userId);
  if (!subs.length) return [];
  return sendPush(subs.map((s) => ({ endpoint: s.endpoint, keys: s.keys })), title, body, url);
}
