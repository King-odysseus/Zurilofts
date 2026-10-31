import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate, requireHostWorkspace } from '../middleware/auth.js';
import { uploadImages, uploadAttachments } from '../controllers/upload.controller.js';
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

// Chat attachments. PDFs are documents, not decodable images, so they travel
// through the same multipart endpoint as photos but are listed explicitly here.
const ATTACHMENT_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];

const MAX_ATTACHMENT_FILES = 5;
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const attachmentUpload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_ATTACHMENT_BYTES,
    files: MAX_ATTACHMENT_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (ATTACHMENT_TYPES.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(new ValidationError('Only JPEG, PNG, WebP, GIF images or PDF documents can be attached'));
  },
});

// Multer reports limits through its own error codes; each one becomes a 400 with
// a sentence the chat UI can show as-is.
function handleAttachmentUpload(req: Request, res: Response, next: NextFunction): void {
  attachmentUpload.array('files', MAX_ATTACHMENT_FILES)(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      const msg =
        err.code === 'LIMIT_FILE_SIZE'
          ? 'Each file must be 15MB or smaller'
          : err.code === 'LIMIT_FILE_COUNT' || err.code === 'LIMIT_UNEXPECTED_FILE'
            ? `You can attach at most ${MAX_ATTACHMENT_FILES} files at once`
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

// Host workspace or admin - accepts up to 10 files under the "images" field.
// A hosting-intent USER may add photos to draft listings before verification
// completes (property create/update routes use the same requireHostWorkspace gate).
router.post('/', authenticate, requireHostWorkspace, handleUpload, uploadImages);

// Chat attachments for any signed-in user (guest, host or admin), up to 5 files
// of 15MB under the "files" field. No host gate: guests send files too.
router.post('/attachments', authenticate, handleAttachmentUpload, uploadAttachments);

export default router;
