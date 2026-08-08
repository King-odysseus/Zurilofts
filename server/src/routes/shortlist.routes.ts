import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/shortlist.controller.js';

const router = Router();

// All shortlist mutations require auth
router.post('/', authenticate, ctrl.create);
router.get('/', authenticate, ctrl.listMine);
router.get('/:id', authenticate, ctrl.getById);
router.patch('/:id', authenticate, ctrl.update);
router.delete('/:id', authenticate, ctrl.remove);

// Item management
router.post('/:id/items', authenticate, ctrl.addItem);
router.delete('/:id/items/:propertyId', authenticate, ctrl.removeItem);

// Public shared view (no auth - declared before /:id so it matches first)
router.get('/shared/:token', ctrl.sharedView);

export default router;
