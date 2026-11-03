import { Request, Response, NextFunction } from 'express';
import { listAdminAudit, AUDIT_ACTIONS, AUDIT_TARGET_TYPES } from '../services/audit.service.js';

/**
 * GET /api/admin/audit
 *
 * The read side of the governance log. Entries are returned exactly as recorded:
 * no joins back to the record they describe, because the record may no longer
 * exist. That is the point of the table.
 */
export async function listAudit(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const query = req.query as {
      action?: string;
      targetType?: string;
      targetId?: string;
      actorId?: string;
      from?: Date;
      to?: Date;
      page?: number;
      limit?: number;
    };
    const result = await listAdminAudit(query);
    res.json({ success: true, ...result });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/admin/audit/filters
 *
 * The vocabularies the log accepts, so the admin screen never hardcodes a list
 * that can drift from the writer.
 */
export function listAuditFilters(_req: Request, res: Response): void {
  res.json({ success: true, data: { actions: AUDIT_ACTIONS, targetTypes: AUDIT_TARGET_TYPES } });
}
