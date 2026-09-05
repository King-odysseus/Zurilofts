import { Request, Response, NextFunction } from 'express';
import * as disputeService from '../services/dispute.service.js';
import { ValidationError } from '../types/index.js';

// ── Participant endpoints (guest or host on the linked booking) ──

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispute = await disputeService.create(req.user!.sub, req.body);
    res.status(201).json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const disputes = await disputeService.listMine(req.user!.sub);
    res.json({ success: true, data: disputes });
  } catch (error) {
    next(error);
  }
}

export async function getById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const dispute = await disputeService.getForParticipant(req.params.id, req.user!.sub, isAdmin);
    res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}

export async function addEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw new ValidationError('Choose a file to upload as evidence');
    const isAdmin = req.user!.role === 'ADMIN';
    const evidence = await disputeService.addEvidence(req.params.id, req.user!.sub, isAdmin, file);
    res.status(201).json({ success: true, data: evidence });
  } catch (error) {
    next(error);
  }
}

export async function downloadEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const evidence = await disputeService.downloadEvidence(req.params.id, req.params.evidenceId, req.user!.sub, isAdmin);
    res.setHeader('Content-Type', evidence.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${evidence.originalName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'no-store, private');
    res.send(evidence.buffer);
  } catch (error) {
    next(error);
  }
}

/** Shared by both the participant route and the admin route - sender identity
 *  and role are always derived from the token, never the request body. */
export async function postMessage(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const isAdmin = req.user!.role === 'ADMIN';
    const message = await disputeService.postMessage(req.params.id, req.user!.sub, isAdmin, req.body.body);
    res.status(201).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
}

// ── Admin endpoints - mounted behind authenticate + requireAdmin ──

export async function adminList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, page, limit } = req.query as Record<string, string>;
    const result = await disputeService.adminList({ status, page: page ? Number(page) : undefined, limit: limit ? Number(limit) : undefined });
    res.json({ success: true, data: result.data, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

export async function adminGet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispute = await disputeService.adminGet(req.params.id);
    res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}

export async function adminDownloadEvidence(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const evidence = await disputeService.adminDownloadEvidence(req.params.id, req.params.evidenceId);
    res.setHeader('Content-Type', evidence.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${evidence.originalName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'no-store, private');
    res.send(evidence.buffer);
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/disputes/:id/notes - admin-only private note, never exposed to participants. */
export async function addNote(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const note = await disputeService.addNote(req.params.id, req.user!.sub, req.body.body);
    res.status(201).json({ success: true, data: note });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/admin/disputes/:id/status - move to UNDER_REVIEW/RESOLVED/DISMISSED. */
export async function updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const dispute = await disputeService.updateStatus(req.params.id, req.user!.sub, req.body.status, req.body.resolution);
    res.json({ success: true, data: dispute });
  } catch (error) {
    next(error);
  }
}
