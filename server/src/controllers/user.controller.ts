import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import * as userService from '../services/user.service.js';
import { ValidationError } from '../types/index.js';
import { storeImage, deleteImage } from '../utils/imageStorage.js';

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.getUserProfile(req.user!.sub);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.updateUserProfile(req.user!.sub, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) {
      throw new ValidationError('No image file was uploaded');
    }

    // Delete the previous avatar (local file or Cloudinary asset). External
    // avatars such as Google OAuth URLs are left untouched by deleteImage.
    const currentUser = await userService.getUserProfile(req.user!.sub);
    await deleteImage(currentUser.avatar as string | null);

    const buffer = await sharp(file.buffer)
      .rotate()
      .resize({ width: 400, height: 400, fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toBuffer();

    const avatarUrl = await storeImage(buffer, 'avatar');
    const user = await userService.updateUserProfile(req.user!.sub, { avatar: avatarUrl });

    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await userService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

export async function updateBankDetails(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await userService.updateBankDetails(req.user!.sub, req.body);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updatePayoutFrequency(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await userService.updatePayoutFrequency(req.user!.sub, req.body.frequency);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ── Admin user management ──────────────────────────────────────────────

export async function adminListUsers(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { role, search } = req.query as { role?: string; search?: string };
    const users = await userService.listAllUsers({ role, search });
    res.json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
}

export async function adminUpdateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await userService.adminUpdateUser(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function adminSetUserRole(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Guard: an admin cannot change their own role and lock themselves out.
    if (req.params.id === req.user!.sub) {
      throw new ValidationError('You cannot change your own role.');
    }
    const user = await userService.setUserRole(req.params.id, req.body.role);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}

export async function adminSetUserSuspended(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // Guard: an admin cannot suspend their own account.
    if (req.params.id === req.user!.sub) {
      throw new ValidationError('You cannot suspend your own account.');
    }
    const user = await userService.setUserSuspended(req.params.id, req.body.suspended);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
}
