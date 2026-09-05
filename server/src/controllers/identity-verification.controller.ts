import { Request, Response, NextFunction } from 'express';
import * as verificationService from '../services/identity-verification.service.js';
import { ValidationError } from '../types/index.js';

// ── Applicant endpoints - userId is always taken from the JWT (req.user.sub) ──

/** GET /api/identity-verification - the caller's own verification. */
export async function getOwn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await verificationService.getOwn(req.user!.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/** POST /api/identity-verification - ensure a row exists to fill in / upload against. */
export async function ensureRecord(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await verificationService.ensureRecord(req.user!.sub);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/identity-verification - update editable fields while UNVERIFIED/REJECTED. */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await verificationService.updateOwn(req.user!.sub, req.body);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

/** POST /api/identity-verification/submit */
export async function submit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await verificationService.submit(req.user!.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw new ValidationError('Choose a document to upload');
    const document = await verificationService.uploadDocument(req.user!.sub, req.params.kind, file);
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await verificationService.deleteDocument(req.user!.sub, req.params.kind);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ── Admin endpoints - mounted behind authenticate + requireAdmin ──

export async function adminList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, search, page, limit } = req.query as Record<string, string>;
    const result = await verificationService.adminList({
      status,
      search,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function adminGet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await verificationService.adminGet(req.params.id);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function adminReject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await verificationService.adminReject(req.params.id, req.user!.sub, req.body.reason);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function adminApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await verificationService.adminApprove(req.params.id, req.user!.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function adminDownloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const document = await verificationService.adminDownloadDocument(req.params.id, req.params.documentId);
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'no-store, private');
    res.send(document.buffer);
  } catch (error) {
    next(error);
  }
}
