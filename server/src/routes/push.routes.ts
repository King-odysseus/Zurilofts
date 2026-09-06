import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import * as ctrl from '../controllers/push.controller.js';

const router = Router();

router.post('/subscribe', authenticate, ctrl.subscribe);
router.delete('/unsubscribe', authenticate, ctrl.unsubscribe);
router.get('/vapid-public-key', ctrl.vapidPublicKey);
router.post('/broadcast', authenticate, requireAdmin, ctrl.broadcast);

export default router;
