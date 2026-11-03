import { Request, Response, NextFunction } from 'express';
import * as messageService from '../services/message.service.js';
import * as chatAttachmentService from '../services/chatAttachment.service.js';
import { parseBoolean, parseSearch } from '../utils/paging.js';

// ---- Customer ----

export async function myThread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await messageService.getUserThread(req.user!.sub);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function myUnreadCount(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const count = await messageService.getUserUnreadCount(req.user!.sub);
    res.json({ success: true, data: { count } });
  } catch (error) {
    next(error);
  }
}

export async function send(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    // body may be empty when files are attached; the service decides whether the
    // pair is usable.
    const data = await messageService.sendUserMessage(req.user!.sub, req.body.body, req.body.attachments);
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

// ---- Attachments ----

/** Quotes and control characters would break out of a header value. */
function sanitizeHeaderFilename(name: string): string {
  return name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'attachment';
}

/**
 * Serve a conversation attachment to someone entitled to read it.
 *
 * Deliberately under the authenticated message routes rather than the public
 * upload directory: the file belongs to a private thread, so membership is
 * checked before any bytes are read.
 */
export async function downloadAttachment(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { bytes, name, mimeType } = await chatAttachmentService.readChatAttachment(req.params.filename, {
      userId: req.user!.sub,
      isAdmin: req.user!.role === 'ADMIN',
    });

    res.setHeader('Content-Type', mimeType);
    // These bytes came from a person. Never let the browser decide what they
    // are, and make anything but a plain image download rather than render, so
    // a stored file cannot become a page on our origin.
    res.setHeader('X-Content-Type-Options', 'nosniff');
    const disposition = mimeType.startsWith('image/') ? 'inline' : 'attachment';
    res.setHeader('Content-Disposition', `${disposition}; filename="${sanitizeHeaderFilename(name)}"`);
    // A private file must not be cached by a shared proxy or survive sign-out.
    res.setHeader('Cache-Control', 'private, no-store');
    res.send(bytes);
  } catch (error) {
    next(error);
  }
}

// ---- Admin ----

export async function adminConversations(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { search, unreadOnly, page, limit } = req.query;
    const { rows, pagination } = await messageService.listConversations({
      search: parseSearch(search),
      unreadOnly: parseBoolean(unreadOnly),
      page: page === undefined ? undefined : Number(page),
      limit: limit === undefined ? undefined : Number(limit),
    });
    const unread = await messageService.getAdminUnreadCount();
    // `data` stays the array the existing screen reads; paging is additive.
    res.json({ success: true, data: rows, pagination, unread });
  } catch (error) {
    next(error);
  }
}

export async function adminThread(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await messageService.getAdminThread(req.params.userId);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function adminMarkThreadRead(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const updated = await messageService.markThreadReadByAdmin(req.params.userId);
    res.json({ success: true, data: { updated } });
  } catch (error) {
    next(error);
  }
}

export async function adminReply(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await messageService.sendAdminMessage(
      req.params.userId,
      req.body.body,
      req.body.attachments
    );
    res.status(201).json({ success: true, data });
  } catch (error) {
    next(error);
  }
}
