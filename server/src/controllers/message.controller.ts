import { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/message.service.js';

// ---- Customer ----

export async function myThread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await messageService.getUserThread(req.user!.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function myUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await messageService.getUserUnreadCount(req.user!.sub);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

export async function send(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await messageService.sendUserMessage(req.user!.sub, req.body.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ---- Admin ----

export async function adminConversations(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await messageService.listConversations();
    const unread = await messageService.getAdminUnreadCount();
    res.json({ success: true, data, unread });
  } catch (error) {
    next(error);
  }
}

export async function adminThread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await messageService.getAdminThread(req.params.userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function adminReply(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await messageService.sendAdminMessage(req.params.userId, req.body.body);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
