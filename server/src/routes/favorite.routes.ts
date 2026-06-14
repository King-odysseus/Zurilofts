import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { favoriteCreateSchema } from '../types/index.js';
import * as ctrl from '../controllers/favorite.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.list);
router.post('/', validate(favoriteCreateSchema), ctrl.add);
router.delete('/:propertyId', ctrl.remove);

export default router;
