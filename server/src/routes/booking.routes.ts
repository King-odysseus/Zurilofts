import { Router } from 'express';
import { authenticate, requireHostWorkspace } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingCreateSchema, bookingPaymentInitSchema, bookingQuoteSchema } from '../types/index.js';
import { quoteLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controllers/booking.controller.js';

const router = Router();

// Authenticated user bookings (as a guest/traveller)
router.post('/', authenticate, validate(bookingCreateSchema), ctrl.create);
router.get('/', authenticate, ctrl.listMine);

// Price preview for the checkout summary. Public (a guest prices a stay before
// signing in) and declared before '/:id' so the literal path matches first.
// Exposes prices for an already-public listing only.
router.post('/quote', quoteLimiter, validate(bookingQuoteSchema), ctrl.quote);

// Host views - bookings on, and earnings from, the caller's own listings.
// Declared before '/:id' so these literal paths match first. The controllers
// scope to the caller's hostId from the token, so a host only ever sees their
// own data even though the same controllers serve the admin (all-data) routes.
// Open to hosting-intent USER accounts too (requireHostWorkspace) - a
// pre-verification host simply sees an empty dashboard, since they cannot
// have any published listings or bookings yet.
router.get('/host', authenticate, requireHostWorkspace, ctrl.listAll);
router.get('/host/earnings', authenticate, requireHostWorkspace, ctrl.propertyEarnings);
router.get('/host/today', authenticate, requireHostWorkspace, ctrl.hostToday);

router.post('/:id/payment', authenticate, validate(bookingPaymentInitSchema), ctrl.initializePayment);
router.post('/:id/cancel', authenticate, ctrl.cancel);
router.get('/:id', authenticate, ctrl.getById);

export default router;
