import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { propertyReviewSchema } from '../types/index.js';
import * as ctrl from '../controllers/property.controller.js';

const router = Router();

// Admin-namespaced property access is read-and-review only. Hosts own the
// listing lifecycle (create, edit, calendar, pricing); an admin moderates what a
// host has submitted and may preview any listing. Admin writes were removed so
// the two roles cannot drift back into managing the same records.
// Mounted under /api/admin/properties (auth + requireAdmin applied by parent).
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
// Listing-review queue: approve/reject a PENDING_REVIEW listing, or
// suspend/unsuspend a PUBLISHED one. Independent of host account review
// (see /api/admin/host-applications).
router.patch('/:id/review', validate(propertyReviewSchema), ctrl.adminReview);

export default router;
