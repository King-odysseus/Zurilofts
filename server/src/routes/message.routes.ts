import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { messageCreateSchema } from '../types/index.js';
import * as ctrl from '../controllers/message.controller.js';

const router = Router();

router.use(authenticate);
router.get('/', ctrl.myThread);
router.get('/unread-count', ctrl.myUnreadCount);
router.post('/', validate(messageCreateSchema), ctrl.send);

export default router;
