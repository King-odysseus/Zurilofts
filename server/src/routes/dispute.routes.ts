import { Router, type Request, type Response, type NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { disputeCreateSchema, disputeMessageSchema, ValidationError } from '../types/index.js';
import * as ctrl from '../controllers/dispute.controller.js';

const router = Router();

const evidenceUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
});

function handleEvidenceUpload(req: Request, res: Response, next: NextFunction): void {
  evidenceUpload.single('file')(req, res, (error: unknown) => {
    if (error instanceof multer.MulterError) {
      return next(new ValidationError(
        error.code === 'LIMIT_FILE_SIZE' ? 'Evidence files must be 10MB or smaller' : error.message,
      ));
    }
    if (error) return next(error);
    next();
  });
}

// Ownership (guest-on-booking or host-on-property) is enforced in the service
// layer, not here - every route below is reachable by any authenticated user
// but 404s (never 403s) on a mismatch, matching booking access elsewhere.
router.use(authenticate);

router.post('/', validate(disputeCreateSchema), ctrl.create);
router.get('/', ctrl.listMine);
router.get('/:id', ctrl.getById);
router.post('/:id/evidence', handleEvidenceUpload, ctrl.addEvidence);
router.get('/:id/evidence/:evidenceId', ctrl.downloadEvidence);
router.post('/:id/messages', validate(disputeMessageSchema), ctrl.postMessage);

export default router;
