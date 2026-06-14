import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { propertyCreateSchema, propertyUpdateSchema } from '../types/index.js';
import * as ctrl from '../controllers/property.controller.js';
import * as calendarCtrl from '../controllers/calendar.controller.js';

const router = Router();

// Public
router.get('/', ctrl.list);
// Outbound iCal feed (token-protected) — external platforms subscribe to this.
// Declared before '/:id' so the longer path matches first.
router.get('/:id/calendar/:token.ics', calendarCtrl.publicFeed);
router.get('/:id', ctrl.getById);

// Admin only
router.post('/', authenticate, requireAdmin, validate(propertyCreateSchema), ctrl.create);
router.put('/:id', authenticate, requireAdmin, validate(propertyUpdateSchema), ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

export default router;
