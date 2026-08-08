import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { authLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controllers/me.controller.js';

const router = Router();

// GET /api/me/export -- right of access + portability
router.get('/export', authenticate, authLimiter, ctrl.exportData);

// DELETE /api/me -- right to erasure
router.delete('/', authenticate, authLimiter, ctrl.deleteAccount);

export default router;