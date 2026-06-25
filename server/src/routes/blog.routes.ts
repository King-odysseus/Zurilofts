import { Router } from 'express';
import * as ctrl from '../controllers/blog.controller.js';

const router = Router();

// Public
router.get('/', ctrl.list);
router.get('/:slug', ctrl.getBySlug);

export default router;
