import { Router, Request, Response } from 'express';
import { contactLimiter } from '../middleware/rateLimiter.js';
import { company } from '../config/company.js';
import { sendMail } from '../utils/mailer.js';

const router = Router();

// Generous for a real message, small enough that one request cannot flood the
// mailbox. Control characters are stripped so the values cannot forge extra
// lines in the mail a staff member reads.
const MAX_NAME = 120;
const MAX_EMAIL = 200;
const MAX_MESSAGE = 4000;
const MAX_PHONE = 40;

function singleLine(value: string, max: number): string {
  return value.replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
}

router.post('/', contactLimiter, async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body ?? {};

    // Validate required fields
    const missing: string[] = [];
    if (typeof name !== 'string' || !name.trim()) missing.push('name');
    if (typeof email !== 'string' || !email.trim()) missing.push('email');
    if (typeof message !== 'string' || !message.trim()) missing.push('message');

    if (missing.length > 0) {
      res.status(400).json({
        error: `Missing required field(s): ${missing.join(', ')}`,
      });
      return;
    }

    // Basic email format check
    const safeEmail = singleLine(email, MAX_EMAIL);
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(safeEmail)) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    const safeName = singleLine(name, MAX_NAME);
    const safeMessage = singleLine(message, MAX_MESSAGE);
    const phone = typeof req.body.phone === 'string' ? singleLine(req.body.phone, MAX_PHONE) : '';

    // The submission is delivered, not logged. It used to go to stdout and
    // nowhere else: enquiries were lost, the personal details sat in the hosting
    // provider's log with no retention limit, and no erasure request could reach
    // them. Mail is the record now, and nothing personal is written to the log.
    try {
      await sendMail({
        to: company.supportEmail,
        subject: `Website enquiry from ${safeName}`,
        text: [
          `Name: ${safeName}`,
          `Email: ${safeEmail}`,
          phone ? `Phone: ${phone}` : null,
          '',
          safeMessage,
          '',
          `Received: ${new Date().toISOString()}`,
        ]
          .filter((line) => line !== null)
          .join('\n'),
      });
    } catch (error) {
      // An undelivered enquiry cannot be answered, so the visitor is told that
      // rather than thanked for a message nobody will read. The reason is logged
      // by class only: an SMTP error can echo the whole message back.
      console.error(
        '[Contact] Enquiry could not be delivered:',
        error instanceof Error ? error.name : 'UnknownError'
      );
      res.status(503).json({
        error: `We could not send your message. Please email ${company.supportEmail} directly.`,
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: 'Thank you for your message. We will get back to you shortly.',
    });
  } catch (err) {
    console.error('[Contact] Unexpected failure:', err instanceof Error ? err.name : 'UnknownError');
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

export default router;
