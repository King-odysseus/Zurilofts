import { Request, Response, NextFunction } from 'express';
import * as promoService from '../services/promo.service.js';

export async function validate(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { code, subtotal } = req.body;
    const result = await promoService.validatePromoCode(code, subtotal);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function create(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await promoService.createPromoCode({
      ...req.body,
      createdBy: req.user!.sub,
    });
    res.status(201).json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
}

export async function list(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promos = await promoService.listPromoCodes();
    res.json({ success: true, data: promos });
  } catch (error) {
    next(error);
  }
}

export async function update(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await promoService.updatePromoCode(req.params.id, req.body);
    res.json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
}

export async function remove(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await promoService.deletePromoCode(req.params.id);
    res.json({ success: true, data: promo, message: 'Promo code deactivated' });
  } catch (error) {
    next(error);
  }
}

// ── Host-owned discounts (the host funds these from their own payout) ──
// The host id always comes from the verified token, never the request body.

export async function listMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promos = await promoService.listHostPromoCodes(req.user!.sub);
    res.json({ success: true, data: promos });
  } catch (error) {
    next(error);
  }
}

export async function createMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await promoService.createHostPromoCode(req.user!.sub, req.body);
    res.status(201).json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
}

export async function updateMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await promoService.updateHostPromoCode(req.user!.sub, req.params.id, req.body);
    res.json({ success: true, data: promo });
  } catch (error) {
    next(error);
  }
}

export async function removeMine(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const promo = await promoService.deactivateHostPromoCode(req.user!.sub, req.params.id);
    res.json({ success: true, data: promo, message: 'Discount deactivated' });
  } catch (error) {
    next(error);
  }
}
