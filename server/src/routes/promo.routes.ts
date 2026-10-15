import { Router } from 'express';
import { authenticate, requireAdmin, requireHost } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  promoCreateSchema,
  promoUpdateSchema,
  promoValidateSchema,
  hostPromoCreateSchema,
  hostPromoUpdateSchema,
} from '../types/index.js';
import * as ctrl from '../controllers/promo.controller.js';

const router = Router();

// Validate a promo code (authenticated users)
router.post('/validate', authenticate, validate(promoValidateSchema), ctrl.validate);

// A verified host manages discounts funded from their own payout. requireHost
// (not requireHostWorkspace) because this moves money: a pending applicant
// must not be able to discount a listing they cannot yet publish.
router.get('/mine', authenticate, requireHost, ctrl.listMine);
router.post('/mine', authenticate, requireHost, validate(hostPromoCreateSchema), ctrl.createMine);
router.patch('/mine/:id', authenticate, requireHost, validate(hostPromoUpdateSchema), ctrl.updateMine);
router.delete('/mine/:id', authenticate, requireHost, ctrl.removeMine);

// Admin CRUD
router.post('/', authenticate, requireAdmin, validate(promoCreateSchema), ctrl.create);
router.get('/', authenticate, requireAdmin, ctrl.list);
router.patch('/:id', authenticate, requireAdmin, validate(promoUpdateSchema), ctrl.update);
router.delete('/:id', authenticate, requireAdmin, ctrl.remove);

export default router;
