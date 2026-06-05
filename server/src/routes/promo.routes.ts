import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { promoCreateSchema, promoUpdateSchema, promoValidateSchema } from '../types/index.js';
import * as ctrl from '../controllers/promo.controller.js';

const router = Router();

// Validate a promo code (authenticated users)
router.post('/validate', authenticate, validate(promoValidateSchema), ctrl.validate);

// Admin CRUD
router.post('/', authenticate, requireAdmin, validate(promoCreateSchema), ctrl.create);
router.get('/', authenticate, requireAdmin, ctrl.list);
router.patch('/:id', authenticate, requireAdmin, validate(promoUpdateSchema), ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

export default router;
