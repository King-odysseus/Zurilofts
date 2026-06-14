import { Router } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  bookingStatusSchema,
  calendarSourceSchema,
  calendarBlockSchema,
  priceRuleSchema,
} from '../types/index.js';
import * as bookingCtrl from '../controllers/booking.controller.js';
import * as calendarCtrl from '../controllers/calendar.controller.js';
import * as reviewCtrl from '../controllers/review.controller.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// Bookings
router.get('/bookings', bookingCtrl.listAll);
router.patch('/bookings/:id/status', validate(bookingStatusSchema), bookingCtrl.updateStatus);

// Guest reviews / private feedback
router.get('/reviews', reviewCtrl.listAll);

// Per-property earnings / booking counts
router.get('/analytics/properties', bookingCtrl.propertyEarnings);

// Calendar — sources, blocks, sync (per property)
router.get('/properties/:id/calendar', calendarCtrl.getCalendar);
router.post('/properties/:id/calendar/sources', validate(calendarSourceSchema), calendarCtrl.addSource);
router.delete('/properties/:id/calendar/sources/:sourceId', calendarCtrl.deleteSource);
router.post('/properties/:id/calendar/sync', calendarCtrl.syncNow);
router.post('/properties/:id/calendar/blocks', validate(calendarBlockSchema), calendarCtrl.addBlock);
router.delete('/properties/:id/calendar/blocks/:blockId', calendarCtrl.deleteBlock);

// Seasonal price rules (per property)
router.get('/properties/:id/price-rules', calendarCtrl.listPriceRules);
router.post('/properties/:id/price-rules', validate(priceRuleSchema), calendarCtrl.addPriceRule);
router.delete('/properties/:id/price-rules/:ruleId', calendarCtrl.deletePriceRule);

export default router;
