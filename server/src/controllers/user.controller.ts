import { Request, Response, NextFunction } from 'express';
import * as userService from '../services/user.service.js';

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

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await userService.changePassword(req.user!.sub, req.body.currentPassword, req.body.newPassword);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}
