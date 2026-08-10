import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { hostApplicationUpdateSchema } from '../types/index.js';
import { ValidationError } from '../types/index.js';
import multer from 'multer';
import * as hostAppCtrl from '../controllers/host-application.controller.js';

const router = Router();

const documentUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024, files: 1 },
});

function handleDocumentUpload(req: Request, res: Response, next: NextFunction): void {
  documentUpload.single('document')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      return next(new ValidationError(
        error.code === 'LIMIT_FILE_SIZE' ? 'Documents must be 8MB or smaller' : error.message,
      ));
    }
    if (error) return next(error);
    next();
  });
}

// Every applicant action is authenticated; the userId is derived from the JWT,
// never from the request body.
router.use(authenticate);

router.get('/', hostAppCtrl.getOwn);
router.post('/', hostAppCtrl.ensureDraft);
router.patch('/', validate(hostApplicationUpdateSchema), hostAppCtrl.update);
router.post('/submit', hostAppCtrl.submit);
router.put('/documents/:kind', handleDocumentUpload, hostAppCtrl.uploadDocument);
router.delete('/documents/:kind', hostAppCtrl.deleteDocument);

export default router;
