import { Router, Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { authenticate } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import { profileUpdateSchema, passwordChangeSchema, ValidationError } from '../types/index.js';
import * as ctrl from '../controllers/user.controller.js';

const ALLOWED = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max for avatar
  fileFilter: (_req, file, cb) => {
    if (ALLOWED.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Only JPEG, PNG, or WebP images are allowed'));
    }
  },
});

function handleAvatarUpload(req: Request, res: Response, next: NextFunction): void {
  avatarUpload.single('avatar')(req, res, (err: unknown) => {
    if (err instanceof multer.MulterError) {
      return next(new ValidationError(
        err.code === 'LIMIT_FILE_SIZE' ? 'Avatar must be 5MB or smaller' : err.message
      ));
    }
    if (err instanceof Error) {
      return next(new ValidationError(err.message));
    }
    next();
  });
}

const router = Router();

router.get('/profile', authenticate, ctrl.getProfile);
router.put('/profile', authenticate, validate(profileUpdateSchema), ctrl.updateProfile);
router.post('/avatar', authenticate, handleAvatarUpload, ctrl.uploadAvatar);
router.put('/password', authenticate, validate(passwordChangeSchema), ctrl.changePassword);

export default router;
