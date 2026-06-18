import { Router } from 'express';
import { authenticate, requireHost } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { propertyCreateSchema, propertyUpdateSchema } from '../types/index.js';
import * as ctrl from '../controllers/property.controller.js';
import * as calendarCtrl from '../controllers/calendar.controller.js';

const router = Router();

// Public
router.get('/', ctrl.list);
// Host-scoped listing (auth required) — returns only properties owned by the
// logged-in host/admin. Declared before '/:id' so the longer path matches first.
router.get('/mine', authenticate, ctrl.listMine);
// Outbound iCal feed (token-protected) — external platforms subscribe to this.
router.get('/:id/calendar/:token.ics', calendarCtrl.publicFeed);
// Taken date ranges for the guest booking calendar
router.get('/:id/availability', calendarCtrl.availability);
router.get('/:id', ctrl.getById);

// Host or admin. The controllers stamp/scope by the caller's id: a host always
// creates under their own hostId and can only modify their own listings, while
// an admin may modify any. Ownership is enforced in the service layer (404 on
// a mismatch), not just here — defense in depth.
router.post('/', authenticate, requireHost, validate(propertyCreateSchema), ctrl.create);
router.put('/:id', authenticate, requireHost, validate(propertyUpdateSchema), ctrl.update);
router.delete('/:id', authenticate, requireHost, ctrl.remove);

export default router;
