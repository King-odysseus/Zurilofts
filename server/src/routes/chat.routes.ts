import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { z } from 'zod';
import { env } from '../config/env.js';
import { recordUserMessage, getMessagesAfter } from '../services/chat.service.js';

const router = Router();

const chatSchema = z.object({
  name: z.string().min(1).max(100),
  email: z.string().email().optional().or(z.literal('')),
  message: z.string().min(1).max(1000),
  sessionId: z.string().optional(),
});

// POST /api/chat/send — forward message to Telegram
router.post('/send', validate(chatSchema), async (req, res, next) => {
  try {
    const { name, email, message, sessionId } = req.body;
    const token = env.TELEGRAM_BOT_TOKEN;
    const chatId = env.TELEGRAM_CHAT_ID;

    if (!token || !chatId) {
      return res.status(503).json({
        success: false,
        error: 'Chat service is not configured yet. Please set TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID.',
      });
    }

    // Record in the in-memory store so team replies can be routed back
    if (sessionId) recordUserMessage(sessionId, message);

    const text = [
      `💬 *New Website Chat*`,
      ``,
      `👤 *Name:* ${name}`,
      email ? `📧 *Email:* ${email}` : '',
      sessionId ? `🔑 *Session:* \`${sessionId.slice(-8)}\`` : '',
      ``,
      `📝 *Message:*`,
      message,
      ``,
      `↩️ _Reply to this message to respond to the guest._`,
    ]
      .filter(Boolean)
      .join('\n');

    const response = await fetch(
      `https://api.telegram.org/bot${token}/sendMessage`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: chatId,
          text,
          parse_mode: 'Markdown',
        }),
      }
    );

    const result = await response.json();

    if (!result.ok) {
      console.error('Telegram send error:', result);
      return res.status(500).json({ success: false, error: 'Failed to send message' });
    }

    res.json({ success: true, message: 'Message sent. We will get back to you shortly!' });
  } catch (error) {
    next(error);
  }
});

// GET /api/chat/messages — poll for team replies to a session
router.get('/messages', (req, res) => {
  const sessionId = typeof req.query.sessionId === 'string' ? req.query.sessionId : '';
  const after = Number.parseInt(String(req.query.after ?? '0'), 10) || 0;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: 'sessionId is required' });
  }
  res.json({ success: true, messages: getMessagesAfter(sessionId, after) });
});

export default router;
