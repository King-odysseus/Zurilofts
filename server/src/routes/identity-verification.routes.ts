import { Router, type Request, type Response, type NextFunction } from 'express';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { identityVerificationUpdateSchema } from '../types/index.js';
import { ValidationError } from '../types/index.js';
import multer from 'multer';
import * as ctrl from '../controllers/identity-verification.controller.js';

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

// Every action here is a self-service action on the caller's own record - the
// userId always comes from the JWT, never the request body.
router.use(authenticate);

router.get('/', ctrl.getOwn);
router.post('/', ctrl.ensureRecord);
router.patch('/', validate(identityVerificationUpdateSchema), ctrl.update);
router.post('/submit', ctrl.submit);
router.put('/documents/:kind', handleDocumentUpload, ctrl.uploadDocument);
router.delete('/documents/:kind', ctrl.deleteDocument);

export default router;
