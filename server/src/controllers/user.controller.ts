import { Request, Response, NextFunction } from 'express';
import sharp from 'sharp';
import { randomBytes } from 'crypto';
import path from 'path';
import fs from 'fs';
import * as userService from '../services/user.service.js';
import { ValidationError } from '../types/index.js';

// Same upload directory as the property image upload controller
const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');

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

    // Delete old avatar if it exists (skip external URLs)
    const currentUser = await userService.getUserProfile(req.user!.sub);
    if (currentUser.avatar && (currentUser.avatar as string).startsWith('/uploads/')) {
      const oldPath = path.join(UPLOAD_DIR, path.basename(currentUser.avatar as string));
      try { fs.unlinkSync(oldPath); } catch { /* old file may already be gone */ }
    }

    const name = `avatar-${Date.now()}-${randomBytes(4).toString('hex')}.jpg`;
    await sharp(file.buffer)
      .rotate()
      .resize({ width: 400, height: 400, fit: 'cover', withoutEnlargement: true })
      .jpeg({ quality: 88, mozjpeg: true })
      .toFile(path.join(UPLOAD_DIR, name));

    const avatarUrl = `/uploads/${name}`;
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
