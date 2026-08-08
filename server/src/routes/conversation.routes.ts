import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import * as ctrl from '../controllers/conversation.controller.js';

const router = Router();

// All conversation endpoints require auth
router.post('/', authenticate, ctrl.create);
router.get('/', authenticate, ctrl.listMine);

// Declared before /:id to avoid being shadowed
router.get('/unread-count', authenticate, ctrl.unreadCount);

router.get('/:id/messages', authenticate, ctrl.getMessages);
router.post('/:id/messages', authenticate, ctrl.sendMessage);
router.patch('/:id/read', authenticate, ctrl.markRead);

export default router;