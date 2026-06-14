import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { reviewCreateSchema } from '../types/index.js';
import * as ctrl from '../controllers/review.controller.js';

const router = Router();

// Guest leaves a post-stay review
router.post('/', authenticate, validate(reviewCreateSchema), ctrl.create);

export default router;
