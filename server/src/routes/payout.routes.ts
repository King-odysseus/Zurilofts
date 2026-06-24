import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as ctrl from '../controllers/payout.controller.js';

const router = Router();

// Host routes (auth required, any role)
router.get('/host/payouts', authenticate, ctrl.hostPayouts);
router.get('/host/wht', authenticate, ctrl.hostWht);

// Admin routes (auth + admin required)
router.get('/admin/payouts', authenticate, requireAdmin, ctrl.adminListPayouts);
router.post('/admin/payouts/trigger', authenticate, requireAdmin, ctrl.adminTriggerPayout);
router.post('/admin/payouts/run-scheduled', authenticate, requireAdmin, ctrl.adminRunScheduled);
router.get('/admin/wht', authenticate, requireAdmin, ctrl.adminWht);

export default router;
