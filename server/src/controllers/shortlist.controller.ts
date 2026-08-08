import { Request, Response, NextFunction } from 'express';
import * as shortlistService from '../services/shortlist.service.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shortlist = await shortlistService.createShortlist({
      userId: req.user!.sub,
      name: req.body.name,
    });
    res.status(201).json({ success: true, data: shortlist });
  } catch (error) {
    next(error);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shortlists = await shortlistService.listUserShortlists(req.user!.sub);
    res.json({ success: true, data: shortlists });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shortlist = await shortlistService.getShortlist(req.params.id, req.user!.sub);
    res.json({ success: true, data: shortlist });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shortlist = await shortlistService.updateShortlist(
      req.params.id,
      req.user!.sub,
      req.body.name
    );
    res.json({ success: true, data: shortlist });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await shortlistService.deleteShortlist(req.params.id, req.user!.sub);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function addItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const item = await shortlistService.addItem({
      shortlistId: req.params.id,
      propertyId: req.body.propertyId,
      note: req.body.note,
      userId: req.user!.sub,
    });
    res.status(201).json({ success: true, data: item });
  } catch (error) {
    next(error);
  }
}

export async function removeItem(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await shortlistService.removeItem(
      req.params.id,
      req.params.propertyId,
      req.user!.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** Public: read-only shared shortlist view (no auth required) */
export async function sharedView(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const shortlist = await shortlistService.getSharedShortlist(req.params.token);
    res.json({ success: true, data: shortlist });
  } catch (error) {
    next(error);
  }
}
