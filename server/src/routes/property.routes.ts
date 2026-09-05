import { Router } from 'express';
import { authenticate, requireHost, requireHostWorkspace } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { propertyCreateSchema, propertyUpdateSchema } from '../types/index.js';
import * as ctrl from '../controllers/property.controller.js';
import * as calendarCtrl from '../controllers/calendar.controller.js';

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
