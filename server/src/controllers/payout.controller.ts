import { Request, Response, NextFunction } from 'express';
import * as payoutService from '../services/payout.service.js';

/** GET /api/host/payouts — host views their own payout history + wallet */
export async function hostPayouts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const [wallet, payouts] = await Promise.all([
      payoutService.getHostWallet(req.user!.sub),
      payoutService.listPayouts({ hostId: req.user!.sub, page: Number(req.query.page) || 1, limit: Number(req.query.limit) || 10 }),
    ]);
    res.json({ success: true, data: { wallet, ...payouts } });
  } catch (error) {
    next(error);
  }
}

/** GET /api/host/wht — host downloads their WHT statement */
export async function hostWht(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const result = await payoutService.getHostWhtData(req.user!.sub, year, month);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/payouts — admin lists all payouts */
export async function adminListPayouts(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await payoutService.listPayouts({
      hostId: req.query.hostId as string | undefined,
      status: req.query.status as string | undefined,
      page: Number(req.query.page) || 1,
      limit: Number(req.query.limit) || 20,
    });
    res.json({ success: true, data: result.payouts, pagination: result.pagination });
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/payouts/trigger — admin manually triggers payout for a host */
export async function adminTriggerPayout(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const hostId = req.body.hostId;
    if (!hostId) {
      res.status(400).json({ success: false, error: 'hostId is required' });
      return;
    }
    const result = await payoutService.processHostPayout(hostId, req.user!.sub);
    res.json({ success: true, data: result.payout, message: result.message });
  } catch (error) {
    next(error);
  }
}

/** POST /api/admin/payouts/run-scheduled — admin runs scheduled payout batch */
export async function adminRunScheduled(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await payoutService.processScheduledPayouts();
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

/** GET /api/admin/wht — accountant downloads consolidated WHT report */
export async function adminWht(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const year = req.query.year ? Number(req.query.year) : undefined;
    const month = req.query.month ? Number(req.query.month) : undefined;
    const result = await payoutService.getAllWhtData(year, month);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}
