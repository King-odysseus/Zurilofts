import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/notification.controller.js';

const router = Router();

// GET /api/notifications - combined badge counts for any authenticated user
router.get('/', authenticate, ctrl.myNotifications);

export default router;
