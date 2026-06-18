import { Router } from 'express';
import { authenticate, requireHost } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingCreateSchema } from '../types/index.js';
import * as ctrl from '../controllers/booking.controller.js';

const router = Router();

// Authenticated user bookings (as a guest/traveller)
router.post('/', authenticate, validate(bookingCreateSchema), ctrl.create);
router.get('/', authenticate, ctrl.listMine);

// Host views — bookings on, and earnings from, the caller's own listings.
// Declared before '/:id' so these literal paths match first. The controllers
// scope to the caller's hostId from the token, so a host only ever sees their
// own data even though the same controllers serve the admin (all-data) routes.
router.get('/host', authenticate, requireHost, ctrl.listAll);
router.get('/host/earnings', authenticate, requireHost, ctrl.propertyEarnings);

router.get('/:id', authenticate, ctrl.getById);

export default router;
