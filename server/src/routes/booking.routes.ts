import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingCreateSchema } from '../types/index.js';
import * as ctrl from '../controllers/booking.controller.js';

const router = Router();

// Authenticated user bookings
router.post('/', authenticate, validate(bookingCreateSchema), ctrl.create);
router.get('/', authenticate, ctrl.listMine);
router.get('/:id', authenticate, ctrl.getById);

export default router;
