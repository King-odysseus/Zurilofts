import prisma from '../config/prisma.js';
import webpush from 'web-push';
import { env } from '../config/env.js';

// VAPID keys: set via env var or generate on first run.
// Run: node -e "const w=require('web-push');console.log(w.generateVAPIDKeys())"
const vapidPublicKey = env.VAPID_PUBLIC_KEY || '';
const vapidPrivateKey = env.VAPID_PRIVATE_KEY || '';

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails('mailto:wingzatari@gmail.com', vapidPublicKey, vapidPrivateKey);
}

/**
 * Save a push subscription for a user.
 *
 * `endpoint` is unique, so a plain upsert silently handed an existing row to
 * whoever asked last: another account's live subscription was moved rather than
 * replaced. A browser subscription belongs to the device that created it, and on
 * a shared machine that device does change hands, so the previous owner's row is
 * removed deliberately and a fresh one created for the account asking now. None
 * of the old owner's data is carried across.
 */
export async function subscribe(userId: string, endpoint: string, keys: { p256dh: string; auth: string }) {
  await prisma.pushSubscription.deleteMany({
    where: { endpoint, userId: { not: userId } },
  });
  return prisma.pushSubscription.upsert({
    where: { endpoint },
    update: { keys: JSON.stringify(keys), updatedAt: new Date() },
    create: { userId, endpoint, keys: JSON.stringify(keys) },
  });
}

/** Remove a subscription by endpoint */
export async function unsubscribe(userId: string, endpoint: string) {
  try {
    // Scoped to the caller: the endpoint alone identifies the row, so deleting
    // by endpoint let any signed-in account silence someone else's alerts.
    await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
  } catch (err) { console.error('Failed to remove push subscription:', err); }
  return { ok: true };
}

/** Get all subscriptions for a user */
export async function getSubscriptionsForUser(userId: string) {
  return prisma.pushSubscription.findMany({ where: { userId } });
}

/**
 * Subscriptions that may receive marketing: those whose owner's latest consent
 * choice allows it. Subscribing to push is permission to be notified about
 * bookings and messages, not to be sold to, so promotions and broadcasts use this
 * and never the raw subscription list.
 */
export async function getMarketingSubscriptions() {
  const { getMarketingOptInUserIds } = await import('./consent.service.js');
  const optedIn = await getMarketingOptInUserIds();
  if (optedIn.size === 0) return [];
  return prisma.pushSubscription.findMany({ where: { userId: { in: [...optedIn] } }, take: 5000 });
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
    subscriptions.map(async (sub: { endpoint: string; keys: string }) => {
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
          try { await prisma.pushSubscription.delete({ where: { endpoint: sub.endpoint } }); } catch (err) { console.error('Failed to remove dead push subscription:', err); }
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
  return sendPush(subs.map((s: { endpoint: string; keys: string }) => ({ endpoint: s.endpoint, keys: s.keys })), title, body, url);
}
