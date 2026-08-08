import { Router } from 'express';
import { validate } from '../middleware/validate.js';
import { propertyCreateSchema, propertyUpdateSchema } from '../types/index.js';
import * as ctrl from '../controllers/property.controller.js';

const router = Router();

// Admin-namespaced property CRUD — delegates to shared controllers.
// Mounted under /api/admin/properties (auth + requireAdmin applied by parent).
router.get('/', ctrl.list);
router.get('/:id', ctrl.getById);
router.post('/', validate(propertyCreateSchema), ctrl.create);
router.put('/:id', validate(propertyUpdateSchema), ctrl.update);
router.delete('/:id', ctrl.remove);

export default router;
