import { Request, Response, NextFunction } from 'express';
import * as favoriteService from '../services/favorite.service.js';

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await favoriteService.listFavorites(req.user!.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function add(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await favoriteService.addFavorite(req.user!.sub, req.body.propertyId);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await favoriteService.removeFavorite(req.user!.sub, req.params.propertyId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
