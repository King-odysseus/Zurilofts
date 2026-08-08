import { Request, Response, NextFunction } from 'express';
import * as addonService from '../services/addon.service.js';

// ---------------------------------------------------------------
// Public: property add-ons
// ---------------------------------------------------------------

export async function getPropertyAddOns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const addOns = await addonService.getPropertyAddOns(req.params.id);
    res.json({ success: true, data: addOns });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------
// Admin: catalogue CRUD
// ---------------------------------------------------------------

export async function listAddOns(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const addOns = await addonService.listAddOns();
    res.json({ success: true, data: addOns });
  } catch (error) {
    next(error);
  }
}

export async function createAddOn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const addOn = await addonService.createAddOn(req.body);
    res.status(201).json({ success: true, data: addOn });
  } catch (error) {
    next(error);
  }
}

export async function updateAddOn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const addOn = await addonService.updateAddOn(req.params.id, req.body);
    res.json({ success: true, data: addOn });
  } catch (error) {
    next(error);
  }
}

export async function deleteAddOn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await addonService.deleteAddOn(req.params.id);
    res.json({ success: true, message: 'Add-on deleted' });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------
// Admin: property assignment
// ---------------------------------------------------------------

export async function listAssignments(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const data = await addonService.listAllPropertyAddOnAssignments();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
}

export async function assignAddOn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const assignment = await addonService.assignAddOnToProperty(
      req.params.id,
      req.body.addOnId
    );
    res.status(201).json({ success: true, data: assignment });
  } catch (error) {
    next(error);
  }
}

export async function unassignAddOn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await addonService.unassignAddOnFromProperty(req.params.id, req.params.addOnId);
    res.json({ success: true, message: 'Add-on unassigned' });
  } catch (error) {
    next(error);
  }
}

// ---------------------------------------------------------------
// Guest: booking add-ons
// ---------------------------------------------------------------

export async function getBookingAddOns(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const addOns = await addonService.getBookingAddOns(req.params.id, req.user!.sub);
    res.json({ success: true, data: addOns });
  } catch (error) {
    next(error);
  }
}

export async function addBookingAddOn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await addonService.addAddOnToBooking(
      req.params.id,
      req.body.addOnId,
      req.body.quantity ?? 1,
      req.user!.sub
    );
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function updateBookingAddOn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = await addonService.updateBookingAddOn(
      req.params.id,
      req.params.addOnId,
      req.body.quantity,
      req.user!.sub
    );
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
}

export async function removeBookingAddOn(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    await addonService.removeBookingAddOn(req.params.id, req.params.addOnId, req.user!.sub);
    res.json({ success: true, message: 'Add-on removed from booking' });
  } catch (error) {
    next(error);
  }
}