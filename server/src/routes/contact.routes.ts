import { Router, Request, Response } from 'express';
import { contactLimiter } from '../middleware/rateLimiter.js';

const router = Router();

// Generous for a real message, small enough that one request cannot flood the
// log. Control characters are stripped so a visitor cannot forge log lines with
// an embedded newline (log injection).
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

    const phone = typeof req.body.phone === 'string' ? ` Phone: ${singleLine(req.body.phone, MAX_PHONE)}` : '';

    // Log the contact for now (future: persist to DB or send email notification)
    console.log(
      `[Contact] From: ${singleLine(name, MAX_NAME)} <${safeEmail}>${phone} - ${singleLine(message, MAX_MESSAGE)}`
    );

    res.status(200).json({
      success: true,
      message: 'Thank you for your message. We will get back to you shortly.',
    });
  } catch (err) {
    console.error('[Contact] Error:', err);
    res.status(500).json({ error: 'Something went wrong. Please try again later.' });
  }
});

export default router;
