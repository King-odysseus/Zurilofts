import { Request, Response, NextFunction } from 'express';
import * as calendarService from '../services/calendar.service.js';
import * as icalService from '../services/ical.service.js';
import * as priceRuleService from '../services/priceRule.service.js';
import { NotFoundError } from '../types/index.js';
import prisma from '../config/prisma.js';

// ---- Admin: calendar (sources + blocks) ----

export async function getCalendar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await calendarService.getPropertyCalendar(req.params.id);
    const base = `${req.protocol}://${req.get('host')}`;
    res.json({
      success: true,
      data: { ...data, feedUrl: `${base}/api/properties/${data.property.id}/calendar/${data.icalToken}.ics` },
    });
  } catch (error) {
    next(error);
  }
}

export async function addSource(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const source = await calendarService.addSource(req.params.id, req.body.name, req.body.url);
    res.status(201).json({ success: true, data: source });
  } catch (error) {
    next(error);
  }
}

export async function deleteSource(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await calendarService.deleteSource(req.params.sourceId);
    res.json({ success: true, message: 'Calendar source removed' });
  } catch (error) {
    next(error);
  }
}

export async function syncNow(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const results = await icalService.syncProperty(req.params.id);
    res.json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
}

export async function addBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const block = await calendarService.addManualBlock(
      req.params.id,
      new Date(req.body.start),
      new Date(req.body.end),
      req.body.summary
    );
    res.status(201).json({ success: true, data: block });
  } catch (error) {
    next(error);
  }
}

export async function deleteBlock(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await calendarService.deleteBlock(req.params.blockId);
    res.json({ success: true, message: 'Block removed' });
  } catch (error) {
    next(error);
  }
}

// ---- Admin: seasonal price rules ----

export async function listPriceRules(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rules = await priceRuleService.listPriceRules(req.params.id);
    res.json({ success: true, data: rules });
  } catch (error) {
    next(error);
  }
}

export async function addPriceRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rule = await priceRuleService.addPriceRule(req.params.id, {
      name: req.body.name,
      start: new Date(req.body.start),
      end: new Date(req.body.end),
      price: req.body.price,
    });
    res.status(201).json({ success: true, data: rule });
  } catch (error) {
    next(error);
  }
}

export async function deletePriceRule(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await priceRuleService.deletePriceRule(req.params.ruleId);
    res.json({ success: true, message: 'Price rule removed' });
  } catch (error) {
    next(error);
  }
}

// ---- Public: outbound iCal feed (token-protected) ----

export async function publicFeed(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const property = await prisma.property.findUnique({ where: { id: req.params.id } });
    if (!property || !property.icalToken || property.icalToken !== req.params.token) {
      throw new NotFoundError('Calendar');
    }
    const ics = await icalService.generatePropertyICS(property.id);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Content-Disposition', `inline; filename="zurilofts-${property.id}.ics"`);
    res.send(ics);
  } catch (error) {
    next(error);
  }
}
