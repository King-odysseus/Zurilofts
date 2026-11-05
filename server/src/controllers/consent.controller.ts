import { Request, Response, NextFunction } from 'express';
import * as consentService from '../services/consent.service.js';
import { getSoftUser } from '../middleware/auth.js';

export async function record(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const record = await consentService.recordConsent({
      analytics: req.body.analytics,
      marketing: req.body.marketing,
      policyVersion: req.body.policyVersion,
      visitorId: req.body.visitorId,
      // The route is public (the banner shows before sign-in), so identity is read
      // softly. Without it a signed-in person's marketing choice was never tied to
      // their account and could not be honoured when messages are sent.
      userId: getSoftUser(req)?.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}