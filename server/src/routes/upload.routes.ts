import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { uploadImages } from '../controllers/upload.controller.js';
import { ValidationError } from '../types/index.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file (before optimization)
    files: 10,
  },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
  },
});

// Run multer and translate its errors into 400s instead of bubbling up as 500s.
function handleUpload(req: Request, res: Response, next: NextFunction): void {
  upload.array('images', 10)(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each image must be 10MB or smaller'
          : err.code === 'LIMIT_FILE_COUNT'
            ? 'You can upload at most 10 images at once'
            : err.message;
      return next(new ValidationError(msg));
    }
    if (err instanceof Error) {
      return next(new ValidationError(err.message));
    }
    next();
  });
}

const router = Router();

// Admin only — accepts up to 10 files under the "images" field
router.post('/', authenticate, requireAdmin, handleUpload, uploadImages);

export default router;
