import { Request, Response, NextFunction } from 'express';
import * as incidentService from '../services/incident.service.js';
import { auditActorFromRequest, recordAdminAuditSafely } from '../services/audit.service.js';

/**
 * Personal-data incident register. Mounted behind requireAdmin, so every caller
 * is staff; each write also lands in the governance log, which is what shows who
 * declared an incident and who recorded the regulator notice.
 */

export async function list(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await incidentService.listIncidents() });
  } catch (error) {
    next(error);
  }
}

export async function get(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    res.json({ success: true, data: await incidentService.getIncident(req.params.id) });
  } catch (error) {
    next(error);
  }
}

export async function declare(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incident = await incidentService.declareIncident(req.body, {
      id: req.user!.sub,
      email: req.user!.email ?? null,
    });
    await recordAdminAuditSafely({
      ...auditActorFromRequest(req),
      action: 'DATA_INCIDENT_DECLARED',
      targetType: 'Incident',
      targetId: incident.id,
      targetLabel: incident.reference,
      // Counts and categories only: the log is read by more people than the
      // register, and must not become a second copy of what leaked.
      metadata: {
        awareAt: incident.awareAt,
        dataCategories: incident.dataCategories,
        affectedCount: incident.affectedCount,
      },
    });
    res.status(201).json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const incident = await incidentService.updateIncident(req.params.id, req.body);
    await recordAdminAuditSafely({
      ...auditActorFromRequest(req),
      action: 'DATA_INCIDENT_UPDATED',
      targetType: 'Incident',
      targetId: incident.id,
      targetLabel: incident.reference,
      reason: req.body.action === 'CLOSE' ? req.body.closingNote : null,
      metadata: { step: req.body.action, status: incident.status, clockState: incident.clockState },
    });
    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
}
