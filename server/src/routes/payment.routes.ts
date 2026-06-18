import { Router } from 'express';
import * as ctrl from '../controllers/payment.controller.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

// Bank list for host payout setup (auth required)
router.get('/banks', authenticate, ctrl.banks);

// Initialize payment (requires auth)
router.post('/initialize', authenticate, ctrl.initialize);

// Verify payment status (requires auth)
router.get('/verify/:reference', authenticate, ctrl.verify);

// Webhook — no auth, handled by Paystack
router.post('/webhook', ctrl.webhook);

export default router;
