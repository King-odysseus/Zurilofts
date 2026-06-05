import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileUpdateSchema, passwordChangeSchema } from '../types/index.js';
import * as ctrl from '../controllers/user.controller.js';

const router = Router();

router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, validate(profileUpdateSchema), ctrl.updateProfile);
router.put('/password', authenticate, validate(passwordChangeSchema), ctrl.changePassword);

export default router;
