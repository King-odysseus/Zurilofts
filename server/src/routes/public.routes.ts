import { Router } from 'express';
import { getPublicFeeSchedule } from '../services/settings.service.js';

// Unauthenticated pages that a prospective host reads before signing up. Kept
// apart from the authenticated routers so nothing private can be added here by
// accident later.
const router = Router();

/**
 * The fee schedule the become-a-host calculator quotes. Public on purpose:
 * publishing the commission is the pitch, and the page has to show the same
 * numbers the booking flow will charge. Cached briefly because it only changes
 * when config does.
 */
router.get('/fees', (_req, res) => {
  res.set('Cache-Control', 'public, max-age=300');
  res.json({ success: true, data: getPublicFeeSchedule() });
});

export default router;
