import { Request, Response, NextFunction } from 'express';
import * as pushService from '../services/push.service.js';

// User: subscribe their browser for push notifications
export async function subscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const sub = await pushService.subscribe(req.user!.sub, req.body.endpoint, req.body.keys);
    res.json({ success: true, data: sub });
  } catch (error) {
    next(error);
  }
}

// User: unsubscribe
export async function unsubscribe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await pushService.unsubscribe(req.body.endpoint);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

// Admin: send push to all subscribers
export async function broadcast(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, body, url } = req.body;
    if (!title || !body) {
      res.status(400).json({ success: false, error: 'title and body are required' });
      return;
    }
    const subs = await pushService.getAllSubscriptions();
    const results = await pushService.sendPush(
      subs.map((s: { endpoint: string; keys: string }) => ({ endpoint: s.endpoint, keys: s.keys })),
      title,
      body,
      url || '/',
    );
    const sent = results.filter((r) => r.ok).length;
    res.json({ success: true, sent, total: results.length });
  } catch (error) {
    next(error);
  }
}

// Public: VAPID public key for the frontend to use
export async function vapidPublicKey(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: { publicKey: process.env.VAPID_PUBLIC_KEY || '' } });
  } catch (error) {
    next(error);
  }
}
