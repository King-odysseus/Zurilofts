import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  bookingStatusSchema,
  calendarSourceSchema,
  calendarBlockSchema,
  priceRuleSchema,
  adminUserUpdateSchema,
  userRoleSchema,
  userSuspendSchema,
} from '../types/index.js';
import { getLandingStats, setLandingStats } from '../services/settings.service.js';
import * as bookingCtrl from '../controllers/booking.controller.js';
import * as calendarCtrl from '../controllers/calendar.controller.js';
import * as reviewCtrl from '../controllers/review.controller.js';
import * as blogCtrl from '../controllers/blog.controller.js';
import * as pushCtrl from '../controllers/push.controller.js';
import * as messageCtrl from '../controllers/message.controller.js';
import * as userCtrl from '../controllers/user.controller.js';
import { messageCreateSchema } from '../types/index.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// User / host account management
router.get('/users', userCtrl.adminListUsers);
router.patch('/users/:id', validate(adminUserUpdateSchema), userCtrl.adminUpdateUser);
router.patch('/users/:id/role', validate(userRoleSchema), userCtrl.adminSetUserRole);
router.patch('/users/:id/suspend', validate(userSuspendSchema), userCtrl.adminSetUserSuspended);

// Bookings
router.get('/bookings', bookingCtrl.listAll);
router.patch('/bookings/:id/status', validate(bookingStatusSchema), bookingCtrl.updateStatus);
router.put('/bookings/:id', bookingCtrl.updateBooking);
router.delete('/bookings/:id', bookingCtrl.deleteBooking);

// Guest reviews / private feedback
router.get('/reviews', reviewCtrl.listAll);
router.patch('/reviews/:id', reviewCtrl.adminUpdateReview);
router.delete('/reviews/:id', reviewCtrl.adminDeleteReview);

// Customer messages (inbox + per-customer thread + reply)
router.get('/messages', messageCtrl.adminConversations);
router.get('/messages/:userId', messageCtrl.adminThread);
router.post('/messages/:userId', validate(messageCreateSchema), messageCtrl.adminReply);

// Per-property earnings / booking counts
router.get('/analytics/properties', bookingCtrl.propertyEarnings);

// Landing-page hero stats (editable by admin)
router.get('/settings/landing-stats', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await getLandingStats() }); }
  catch (e) { next(e); }
});
router.put('/settings/landing-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { happyStays, starRating, satisfaction } = req.body;
    const stats = await setLandingStats(
      happyStays !== undefined ? Number(happyStays) : undefined,
      starRating !== undefined ? Number(starRating) : undefined,
      satisfaction !== undefined ? Number(satisfaction) : undefined,
    );
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
});

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


// Blog management
router.get('/guides', blogCtrl.adminList);
router.get('/guides/:id', blogCtrl.adminGet);
router.post('/guides', blogCtrl.adminCreate);
router.put('/guides/:id', blogCtrl.adminUpdate);
router.delete('/guides/:id', blogCtrl.adminDelete);

// Push notifications
router.post('/push/send', pushCtrl.broadcast);

export default router;
