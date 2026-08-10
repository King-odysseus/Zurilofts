import { Request, Response, NextFunction } from 'express';
import * as hostAppService from '../services/host-application.service.js';
import { ValidationError } from '../types/index.js';

// ── Applicant endpoints - userId is always taken from the JWT (req.user.sub) ──

/** GET /api/host-application - the caller's own application (data: null if none). */
export async function getOwn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await hostAppService.getOwnApplication(req.user!.sub);
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

/** POST /api/host-application - create/ensure a DRAFT the caller can fill in. */
export async function ensureDraft(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await hostAppService.ensureDraft(req.user!.sub);
    res.status(201).json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

/** PATCH /api/host-application - update editable applicant fields while DRAFT/CHANGES_REQUESTED. */
export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await hostAppService.updateDraft(req.user!.sub, req.body);
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

/** POST /api/host-application/submit - submit for review when required fields are complete. */
export async function submit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await hostAppService.submitApplication(req.user!.sub);
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

export async function uploadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const file = (req as any).file as Express.Multer.File | undefined;
    if (!file) throw new ValidationError('Choose a document to upload');
    const document = await hostAppService.uploadApplicationDocument(req.user!.sub, req.params.kind, file);
    res.status(201).json({ success: true, data: document });
  } catch (error) {
    next(error);
  }
}

export async function deleteDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await hostAppService.deleteApplicationDocument(req.user!.sub, req.params.kind);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

// ── Admin endpoints - mounted behind authenticate + requireAdmin ──

/** GET /api/admin/host-applications - paginated, filterable review queue. */
export async function adminList(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { status, search, page, limit } = req.query as Record<string, string>;
    const result = await hostAppService.adminListApplications({
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

/** GET /api/admin/host-applications/:id */
export async function adminGet(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await hostAppService.adminGetApplication(req.params.id);
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/host-applications/:id/request-changes */
export async function adminRequestChanges(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await hostAppService.adminRequestChanges(req.params.id, req.user!.sub, req.body.reason);
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/host-applications/:id/reject */
export async function adminReject(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await hostAppService.adminReject(req.params.id, req.user!.sub, req.body.reason);
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/host-applications/:id/approve - grants HOST atomically, idempotent. */
export async function adminApprove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const application = await hostAppService.adminApprove(req.params.id, req.user!.sub);
    res.json({ success: true, data: application });
  } catch (error) {
    next(error);
  }
}

export async function adminDownloadDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const document = await hostAppService.adminDownloadDocument(
      req.params.id,
      req.params.documentId,
      req.user!.sub,
    );
    res.setHeader('Content-Type', document.mimeType);
    res.setHeader('Content-Disposition', `inline; filename="${document.originalName.replace(/"/g, '')}"`);
    res.setHeader('Cache-Control', 'no-store, private');
    res.send(document.buffer);
  } catch (error) {
    next(error);
  }
}
