import { Router, Request, Response, NextFunction } from 'express';
import { authenticate, requireAdmin } from '../middleware/auth.js';
import { validate } from '../middleware/validate.js';
import {
  bookingStatusSchema,
  bookingRefundSchema,
  adminUserUpdateSchema,
  adminPasswordSetSchema,
  userRoleSchema,
  userSuspendSchema,
  hostApplicationReviewSchema,
  adminAccountDeletionSchema,
  blogPostCreateSchema,
  blogPostUpdateSchema,
} from '../types/index.js';
import { getLandingStats, setLandingStats } from '../services/settings.service.js';
import * as bookingCtrl from '../controllers/booking.controller.js';
import * as reviewCtrl from '../controllers/review.controller.js';
import * as blogCtrl from '../controllers/blog.controller.js';
import * as pushCtrl from '../controllers/push.controller.js';
import * as messageCtrl from '../controllers/message.controller.js';
import * as userCtrl from '../controllers/user.controller.js';
import * as hostAppCtrl from '../controllers/host-application.controller.js';
import * as verificationCtrl from '../controllers/identity-verification.controller.js';
import * as disputeCtrl from '../controllers/dispute.controller.js';
import { messageCreateSchema, identityVerificationReviewSchema, disputeStatusSchema, disputeNoteSchema, disputeMessageSchema } from '../types/index.js';
import adminPropertyRoutes from './admin-property.routes.js';

const router = Router();

// All admin routes require auth + admin role
router.use(authenticate, requireAdmin);

// User / host account management
router.get('/users', userCtrl.adminListUsers);
router.get('/stats/signups', userCtrl.adminSignupTrend);
router.get('/search', userCtrl.adminSearch);
router.patch('/users/:id', validate(adminUserUpdateSchema), userCtrl.adminUpdateUser);
router.patch('/users/:id/role', validate(userRoleSchema), userCtrl.adminSetUserRole);
router.patch('/users/:id/suspend', validate(userSuspendSchema), userCtrl.adminSetUserSuspended);
router.put('/users/:id/password', validate(adminPasswordSetSchema), userCtrl.adminSetUserPassword);
router.delete('/users/:id', validate(adminAccountDeletionSchema), userCtrl.adminDeleteUser);

// Host applications (review queue: list, detail, request changes, reject, approve)
router.get('/host-applications', hostAppCtrl.adminList);
router.get('/host-applications/:id', hostAppCtrl.adminGet);
router.get('/host-applications/:id/documents/:documentId', hostAppCtrl.adminDownloadDocument);
router.post('/host-applications/:id/request-changes', validate(hostApplicationReviewSchema), hostAppCtrl.adminRequestChanges);
router.post('/host-applications/:id/reject', validate(hostApplicationReviewSchema), hostAppCtrl.adminReject);
router.post('/host-applications/:id/approve', hostAppCtrl.adminApprove);

// Guest identity verification (review queue: list, detail, reject, approve).
// Independent of host applications - gates payment on a booking, not the
// host workspace/dashboard.
router.get('/identity-verifications', verificationCtrl.adminList);
router.get('/identity-verifications/:id', verificationCtrl.adminGet);
router.get('/identity-verifications/:id/documents/:documentId', verificationCtrl.adminDownloadDocument);
router.post('/identity-verifications/:id/reject', validate(identityVerificationReviewSchema), verificationCtrl.adminReject);
router.post('/identity-verifications/:id/approve', verificationCtrl.adminApprove);

// Booking-linked disputes (mediation queue: list, detail, private notes, status/resolution).
router.get('/disputes', disputeCtrl.adminList);
router.get('/disputes/:id', disputeCtrl.adminGet);
router.get('/disputes/:id/evidence/:evidenceId', disputeCtrl.adminDownloadEvidence);
router.post('/disputes/:id/messages', validate(disputeMessageSchema), disputeCtrl.postMessage);
router.post('/disputes/:id/notes', validate(disputeNoteSchema), disputeCtrl.addNote);
router.patch('/disputes/:id/status', validate(disputeStatusSchema), disputeCtrl.updateStatus);

// Bookings
router.get('/bookings', bookingCtrl.listAll);
router.post('/bookings/cleanup-stale', bookingCtrl.cleanupStale);
router.patch('/bookings/:id/status', validate(bookingStatusSchema), bookingCtrl.updateStatus);
router.patch('/bookings/:id/refund', validate(bookingRefundSchema), bookingCtrl.resolveRefund);
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

// What the platform itself earned, and what it still holds for hosts.
router.get('/revenue', bookingCtrl.revenue);

// Landing-page hero stats. Happy stays is not among them: it is counted from
// real completed guest stays and is read-only (see review.service.getPublicStats).
router.get('/settings/landing-stats', async (_req: Request, res: Response, next: NextFunction) => {
  try { res.json({ success: true, data: await getLandingStats() }); }
  catch (e) { next(e); }
});
router.put('/settings/landing-stats', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // A happyStays value in the body is ignored on purpose: the count is not editable.
    const { starRating, satisfaction } = req.body;
    const stats = await setLandingStats({
      starRating: starRating !== undefined ? Number(starRating) : undefined,
      satisfaction: satisfaction !== undefined ? Number(satisfaction) : undefined,
    });
    res.json({ success: true, data: stats });
  } catch (e) { next(e); }
});


// Listing review queue (read + approve/reject/suspend only; hosts own listing writes)
router.use('/properties', adminPropertyRoutes);

// Blog management
router.get('/guides', blogCtrl.adminList);
router.get('/guides/:id', blogCtrl.adminGet);
router.post('/guides', validate(blogPostCreateSchema), blogCtrl.adminCreate);
router.put('/guides/:id', validate(blogPostUpdateSchema), blogCtrl.adminUpdate);
router.delete('/guides/:id', blogCtrl.adminDelete);

// Push notifications
router.post('/push/send', pushCtrl.broadcast);

export default router;

