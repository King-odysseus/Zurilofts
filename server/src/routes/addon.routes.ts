import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import * as ctrl from '../controllers/addon.controller.js';
import { z } from 'zod';

const router = Router();

// ---------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------

const createAddOnSchema = z.object({
  name: z.string().min(1, 'Name is required').max(200),
  description: z.string().min(1, 'Description is required'),
  price: z.number().positive('Price must be positive'),
  image: z.string().max(500).optional(),
  category: z.enum(['transport', 'catering', 'housekeeping', 'concierge']),
});

const updateAddOnSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().min(1).optional(),
  price: z.number().positive('Price must be positive').optional(),
  image: z.string().max(500).optional(),
  category: z.enum(['transport', 'catering', 'housekeeping', 'concierge']).optional(),
  active: z.boolean().optional(),
});

const assignAddOnSchema = z.object({
  addOnId: z.string().min(1, 'addOnId is required'),
});

const bookingAddOnSchema = z.object({
  addOnId: z.string().min(1, 'addOnId is required'),
  quantity: z.number().int().min(1).max(20).optional(),
});

const bookingAddOnUpdateSchema = z.object({
  quantity: z.number().int().min(1).max(20),
});

// ---------------------------------------------------------------
// Public
// ---------------------------------------------------------------

router.get('/properties/:id/addons', ctrl.getPropertyAddOns);

// ---------------------------------------------------------------
// Admin - catalogue
// ---------------------------------------------------------------

router.get('/admin/addons', authenticate, requireAdmin, ctrl.listAddOns);
router.post('/admin/addons', authenticate, requireAdmin, validate(createAddOnSchema), ctrl.createAddOn);

// Declared before /:id to avoid being shadowed
router.get('/admin/addons/assignments', authenticate, requireAdmin, ctrl.listAssignments);

router.patch('/admin/addons/:id', authenticate, requireAdmin, validate(updateAddOnSchema), ctrl.updateAddOn);
router.delete('/admin/addons/:id', authenticate, requireAdmin, ctrl.deleteAddOn);

// ---------------------------------------------------------------
// Admin - property assignment
// ---------------------------------------------------------------

router.post('/admin/properties/:id/addons', authenticate, requireAdmin, validate(assignAddOnSchema), ctrl.assignAddOn);
router.delete('/admin/properties/:id/addons/:addOnId', authenticate, requireAdmin, ctrl.unassignAddOn);

// ---------------------------------------------------------------
// Guest - booking add-ons
// ---------------------------------------------------------------

// Declared before /:id/addons/:addOnId to avoid shadowing
router.get('/bookings/:id/addons', authenticate, ctrl.getBookingAddOns);

router.post('/bookings/:id/addons', authenticate, validate(bookingAddOnSchema), ctrl.addBookingAddOn);
router.patch('/bookings/:id/addons/:addOnId', authenticate, validate(bookingAddOnUpdateSchema), ctrl.updateBookingAddOn);
router.delete('/bookings/:id/addons/:addOnId', authenticate, ctrl.removeBookingAddOn);

export default router;