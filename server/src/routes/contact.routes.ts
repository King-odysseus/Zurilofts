import { Router, Request, Response } from 'express';

const router = Router();

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, email, message } = req.body;

    // Validate required fields
    const missing: string[] = [];
    if (!name || typeof name !== 'string' || !name.trim()) missing.push('name');
    if (!email || typeof email !== 'string' || !email.trim()) missing.push('email');
    if (!message || typeof message !== 'string' || !message.trim()) missing.push('message');

    if (missing.length > 0) {
      res.status(400).json({
        error: `Missing required field(s): ${missing.join(', ')}`,
      });
      return;
    }

    // Basic email format check
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      res.status(400).json({ error: 'Please provide a valid email address.' });
      return;
    }

    // Log the contact for now (future: persist to DB or send email notification)
    console.log(`[Contact] From: ${name.trim()} <${email.trim()}>${req.body.phone ? ` Phone: ${req.body.phone.trim()}` : ''} — ${message.trim()}`);

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
