import { Router } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { hostApplicationUpdateSchema } from '../types/index.js';
import * as hostAppCtrl from '../controllers/host-application.controller.js';

const router = Router();

// Every applicant action is authenticated; the userId is derived from the JWT,
// never from the request body.
router.use(authenticate);

router.get('/', hostAppCtrl.getOwn);
router.post('/', hostAppCtrl.ensureDraft);
router.patch('/', validate(hostApplicationUpdateSchema), hostAppCtrl.update);
router.post('/submit', hostAppCtrl.submit);

export default router;
