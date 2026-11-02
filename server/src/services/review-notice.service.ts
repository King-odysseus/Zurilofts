import prisma from '../config/prisma.js';

/**
 * Tell someone the outcome of a review about them.
 *
 * The product has no notification table of its own, so a review outcome travels
 * the same way every other message from ZuriLofts does: as an ADMIN message in
 * the person's support thread. That puts it on the Messages page, raises the
 * unread badge in both the guest and host headers, and needs no new schema.
 * The push covers the case where they are not looking at the app at all, and
 * carries `pushBody` because a phone banner shows about one line of it.
 *
 * Best-effort by design. The decision has already been saved by the time this
 * runs, so a failed notice must never roll it back or fail the admin's request:
 * a host who is approved but un-notified is recoverable, an approval that fails
 * because a push service was down is not.
 */
export interface ReviewNotice {
  userId: string;
  subject: string;
  body: string;
  pushBody?: string;
  url: string;
}

export async function notifyReviewOutcome({ userId, subject, body, pushBody, url }: ReviewNotice): Promise<void> {
  if (!userId) return;

  try {
    await prisma.message.create({
      data: { userId, senderRole: 'ADMIN', body, readByAdmin: true, readByUser: false },
    });
  } catch (error) {
    console.error('Could not deliver the review notice as a message:', error);
  }

  try {
    const { sendPushToUser } = await import('./push.service.js');
    await sendPushToUser(userId, subject, pushBody ?? body, url);
  } catch (error) {
    console.error('Could not deliver the review notice as a push:', error);
  }
}
