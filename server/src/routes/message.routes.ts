import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { messageCreateSchema } from '../types/index.js';
import { chatLimiter } from '../middleware/rateLimiter.js';
import * as ctrl from '../controllers/message.controller.js';

const router = Router();

router.use(authenticate);
// Before the collection routes so a filename is never read as a message id.
router.get('/attachments/:filename', ctrl.downloadAttachment);
router.get('/', ctrl.myThread);
router.get('/unread-count', ctrl.myUnreadCount);
router.post('/', chatLimiter, validate(messageCreateSchema), ctrl.send);

export default router;
