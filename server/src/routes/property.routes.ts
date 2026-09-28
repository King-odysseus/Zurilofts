import { Router } from 'express';
import { authenticate, requireHost, requireHostWorkspace } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { propertyCreateSchema, propertyUpdateSchema, autoMessageTemplatesSchema, calendarSourceSchema, calendarBlockSchema, priceRuleSchema } from '../types/index.js';
import * as ctrl from '../controllers/property.controller.js';
import * as calendarCtrl from '../controllers/calendar.controller.js';
import * as autoMsgCtrl from '../controllers/auto-message.controller.js';

const router = Router();

// Public
router.get('/', ctrl.list);
// Bulk fetch by IDs (must be before /:id to avoid capturing as an ID param)
router.get('/bulk', ctrl.bulk);
// Host workspace listing (auth required) - returns only properties owned by
// the logged-in host/admin, including their own drafts/pending/rejected
// listings. Open to hosting-intent USER accounts too (requireHostWorkspace),
// not just verified HOST/ADMIN - see the host onboarding plan. Declared
// before '/:id' so the longer path matches first.
router.get('/mine', authenticate, requireHostWorkspace, ctrl.listMine);
// Outbound iCal feed (token-protected) - external platforms subscribe to this.
router.get('/:id/calendar/:token.ics', calendarCtrl.publicFeed);
// Taken date ranges for the guest booking calendar
router.get('/:id/availability', calendarCtrl.availability);
// Similar properties (public discovery)
router.get('/:id/similar', ctrl.getSimilar);

// Per-property automated host messages (host or admin; ownership enforced in
// the service). Placed before '/:id' so the longer path matches first.
router.get('/:id/auto-messages', authenticate, requireHostWorkspace, autoMsgCtrl.getTemplates);
router.put('/:id/auto-messages', authenticate, requireHostWorkspace, validate(autoMessageTemplatesSchema), autoMsgCtrl.saveTemplates);

// Owner-scoped calendar management for the host workspace. These mirror the
// admin calendar endpoints but reject any property the caller does not own.
router.get('/:id/calendar', authenticate, requireHostWorkspace, calendarCtrl.getCalendar);
router.post('/:id/calendar/sources', authenticate, requireHostWorkspace, validate(calendarSourceSchema), calendarCtrl.addSource);
router.delete('/:id/calendar/sources/:sourceId', authenticate, requireHostWorkspace, calendarCtrl.deleteSource);
router.post('/:id/calendar/sync', authenticate, requireHostWorkspace, calendarCtrl.syncNow);
router.post('/:id/calendar/blocks', authenticate, requireHostWorkspace, validate(calendarBlockSchema), calendarCtrl.addBlock);
router.post('/:id/calendar/blocks/:blockId/unblock-date', authenticate, requireHostWorkspace, calendarCtrl.unblockDate);
router.delete('/:id/calendar/blocks/:blockId', authenticate, requireHostWorkspace, calendarCtrl.deleteBlock);
router.get('/:id/price-rules', authenticate, requireHostWorkspace, calendarCtrl.listPriceRules);
router.post('/:id/price-rules', authenticate, requireHostWorkspace, validate(priceRuleSchema), calendarCtrl.addPriceRule);
router.delete('/:id/price-rules/:ruleId', authenticate, requireHostWorkspace, calendarCtrl.deletePriceRule);


// Public reviews for a property
router.get('/:id/reviews', ctrl.getReviews);
router.get('/:id', ctrl.getById);

// Host workspace or admin. The controllers stamp/scope by the caller's id: a
// host always creates under their own hostId and can only modify their own
// listings, while an admin may modify any. Ownership is enforced in the
// service layer (404 on a mismatch), not just here - defense in depth. Every
// new listing is created as a private DRAFT (see property.service.ts) so
// hosting-intent USER accounts may prepare listings before verification.
router.post('/', authenticate, requireHostWorkspace, validate(propertyCreateSchema), ctrl.create);
router.put('/:id', authenticate, requireHostWorkspace, validate(propertyUpdateSchema), ctrl.update);
router.delete('/:id', authenticate, requireHostWorkspace, ctrl.remove);

// Submit a draft/rejected listing for admin review. Requires a *verified*
// host account (requireHost, not requireHostWorkspace) - going live is where
// account verification is actually enforced.
router.post('/:id/submit', authenticate, requireHost, ctrl.submitForReview);

export default router;
