import { Request, Response, NextFunction } from 'express';
import {
  assertAccessibleProperty,
  listAutoMessageTemplates,
  saveAutoMessageTemplates,
  AUTO_MESSAGE_TRIGGER_META,
} from '../services/automated-message.service.js';

function actorOf(req: Request) {
  return { sub: req.user!.sub, role: req.user!.role };
}

/** GET /properties/:id/auto-messages - the property's full trigger set with
 *  defaults merged in, plus the trigger metadata the editor needs to render. */
export async function getTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertAccessibleProperty(req.params.id, actorOf(req));
    const templates = await listAutoMessageTemplates(req.params.id);
    res.json({ success: true, data: { templates, triggers: AUTO_MESSAGE_TRIGGER_META } });
  } catch (error) {
    next(error);
  }
}

/** PUT /properties/:id/auto-messages - upsert the host's template edits. */
export async function saveTemplates(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await assertAccessibleProperty(req.params.id, actorOf(req));
    const { templates } = req.body as { templates: { trigger: string; enabled: boolean; offsetDays?: number | null; body: string }[] };
    const saved = await saveAutoMessageTemplates(req.params.id, templates);
    res.json({ success: true, data: { templates: saved, triggers: AUTO_MESSAGE_TRIGGER_META } });
  } catch (error) {
    next(error);
  }
}
