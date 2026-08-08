import { Request, Response, NextFunction } from 'express';
import * as conversationService from '../services/conversation.service.js';

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversation = await conversationService.getOrCreateConversation({
      bookingId: req.body.bookingId,
      userId: req.user!.sub,
    });
    res.status(201).json({ success: true, data: conversation });
  } catch (error) {
    next(error);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const conversations = await conversationService.listUserConversations(req.user!.sub);
    res.json({ success: true, data: conversations });
  } catch (error) {
    next(error);
  }
}

export async function unreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await conversationService.getUnreadCount(req.user!.sub);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function getMessages(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const { page, limit } = req.query;
    const result = await conversationService.getMessages(
      req.params.id,
      req.user!.sub,
      isAdmin,
      page ? Number(page) : 1,
      limit ? Number(limit) : 50
    );
    res.json({ success: true, data: result.messages, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function sendMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const message = await conversationService.sendMessage(
      req.params.id,
      req.user!.sub,
      req.body.content
    );
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
}

export async function markRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const result = await conversationService.markAsRead(req.params.id, req.user!.sub, isAdmin);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}