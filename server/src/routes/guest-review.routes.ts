import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/guest-review.controller.js';

const router = Router();

// Ownership is enforced in the service, not by role: the real gate is owning the
// listing on that booking. A HOST token does not prove which bookings are theirs,
// and requireHostWorkspace would admit any USER with a host application.
router.use(authenticate);

// Host reviews the guest of one booking
router.post('/', ctrl.create);

// Host's own reputation as a guest
router.get('/mine', ctrl.mine);

// Guest profile and review eligibility for one booking
router.get('/booking/:bookingId', ctrl.forBooking);

export default router;
