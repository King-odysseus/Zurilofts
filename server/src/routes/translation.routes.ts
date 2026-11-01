import { Router } from 'express';
import { z } from 'zod';
import { validate } from '../middleware/validate.js';
import { translateLimiter } from '../middleware/rateLimiter.js';
import {
  MAX_TEXTS_PER_REQUEST,
  isPrivateTranslationAllowed,
  isSupportedTarget,
  translateTexts,
} from '../services/translation.service.js';

/**
 * Translates text that is not in the hand-written dictionaries, which in
 * practice means words a host or guest typed: listing copy, reviews, add-ons,
 * guide paragraphs.
 *
 * The route is public because a visitor reading a Swahili page is usually not
 * signed in and a listing description is public text anyway. What stops it
 * becoming an open relay to a paid API is the pair of bounds: this limiter and
 * the per-request caps in the service.
 */
const router = Router();

const translateSchema = z.object({
  target: z.string(),
  texts: z.array(z.string()).min(1).max(MAX_TEXTS_PER_REQUEST),
  // Marks content that is not public, such as a message thread.
  private: z.boolean().optional(),
});

router.post('/', translateLimiter, validate(translateSchema), async (req, res, next) => {
  try {
    const { target, texts, private: isPrivate } = req.body as z.infer<typeof translateSchema>;

    if (!isSupportedTarget(target)) {
      res.status(400).json({ success: false, error: 'Unsupported translation target' });
      return;
    }

    // Refused rather than quietly answered in English: a client that asked to
    // translate a private message should learn the feature is off, not assume
    // the provider declined the text.
    if (isPrivate && !isPrivateTranslationAllowed()) {
      res.status(403).json({
        success: false,
        error: 'Translating private messages is switched off',
      });
      return;
    }

    const result = await translateTexts(texts, target);
    // A translated string never changes once chosen, so the browser may keep it.
    // `private` responses are excluded because a shared cache holding one
    // guest's message would be visible to the next visitor.
    if (isPrivate) res.set('Cache-Control', 'private, no-store');
    else res.set('Cache-Control', 'public, max-age=86400');

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
});

export default router;
