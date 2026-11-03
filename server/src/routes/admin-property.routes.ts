import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { propertyReviewSchema, propertyOrphanCleanupSchema } from '../types/index.js';
import * as ctrl from '../controllers/property.controller.js';

const router = Router();

// Admin-namespaced property access is read-and-review only, plus removal.
// Hosts own the listing lifecycle (create, edit, calendar, pricing); an admin
// moderates what a host has submitted, may preview any listing, and may delete
// one (notably host-less orphans). Admin edit routes were removed so the two
// roles cannot drift back into managing the same records.
// Mounted under /api/admin/properties (auth + requireAdmin applied by parent).
router.get('/', ctrl.list);
// Registered before /:id so "orphans" is not read as a property id.
router.get('/orphans', ctrl.adminListOrphans);
router.post('/orphans/cleanup', validate(propertyOrphanCleanupSchema), ctrl.adminCleanupOrphans);
router.get('/:id', ctrl.getById);
// Listing-review queue: approve/reject a PENDING_REVIEW listing, or
// suspend/unsuspend a PUBLISHED one. Independent of host account review
// (see /api/admin/host-applications).
router.patch('/:id/review', validate(propertyReviewSchema), ctrl.adminReview);
// Hard delete; refused with 409 when the listing has a paid booking.
router.delete('/:id', ctrl.adminRemove);

export default router;
