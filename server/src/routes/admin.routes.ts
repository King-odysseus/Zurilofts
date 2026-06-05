import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { bookingStatusSchema } from '../types/index.js';
import * as bookingCtrl from '../controllers/booking.controller.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// Bookings
router.get('/bookings', bookingCtrl.listAll);
router.patch('/bookings/:id/status', validate(bookingStatusSchema), bookingCtrl.updateStatus);

export default router;
