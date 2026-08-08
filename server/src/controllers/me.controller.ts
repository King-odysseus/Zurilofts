import { Request, Response, NextFunction } from 'express';
import * as meService from '../services/me.service.js';

export async function exportData(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await meService.exportUserData(req.user!.sub);
    res.setHeader('Content-Disposition', 'attachment; filename="data-export.json"');
    res.setHeader('Content-Type', 'application/json');
    res.json(data);
  } catch (error) {
    next(error);
  }
}

export async function deleteAccount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await meService.deleteUserAccount(req.user!.sub, req.body.confirm);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}