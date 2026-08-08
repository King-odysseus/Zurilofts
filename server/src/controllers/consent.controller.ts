import { Request, Response, NextFunction } from 'express';
import * as consentService from '../services/consent.service.js';

export async function record(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const record = await consentService.recordConsent({
      analytics: req.body.analytics,
      marketing: req.body.marketing,
      policyVersion: req.body.policyVersion,
      visitorId: req.body.visitorId,
      userId: req.user?.sub,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });
    res.status(201).json({ success: true, data: record });
  } catch (error) {
    next(error);
  }
}