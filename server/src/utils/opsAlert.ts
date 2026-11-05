import { company } from '../config/company.js';
import { activeMailTransport, sendMail } from './mailer.js';

/**
 * Reach a person about something only a person can fix.
 *
 * These alerts used to go to a support chat over Telegram, which has been
 * removed from the app. They now go to the support mailbox, an inbox someone
 * already reads, so a booking that was paid for twice or a payout notice that
 * matches no record still ends up in front of a human.
 *
 * Never throws. Both callers sit on money paths that have already committed
 * their work, so a failed alert must not undo it, and an alert is not worth
 * holding a webhook open: it is fire-and-forget by design. The caller writes its
 * own structured line first, so when no transport is configured this says as
 * much on one line rather than failing in silence.
 */
export async function alertOps(subject: string, text: string): Promise<void> {
  if (activeMailTransport() === 'none') {
    console.error(`OPS-ALERT not delivered (no mail transport configured): ${subject}`);
    return;
  }
  try {
    await sendMail({
      to: company.supportEmail,
      subject: `[ZuriLofts] ${subject}`,
      text,
    });
  } catch (err) {
    console.error(`OPS-ALERT send failed: ${subject}`, (err as Error)?.message || err);
  }
}
