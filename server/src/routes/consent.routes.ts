import { Router } from 'express';
import { authLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controllers/consent.controller.js';

const router = Router();

// POST /api/consent -- public, no auth required
router.post('/', authLimiter, ctrl.record);

export default router;