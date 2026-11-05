import express from 'express';
import path from 'path';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import prisma from './config/prisma.js';
import { errorHandler } from './middleware/errorHandler.js';
import { UPLOAD_DIR } from './controllers/upload.controller.js';
import { requestsChatAttachment } from './utils/chatAttachment.js';
import { redactResetToken } from './utils/logRedaction.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import propertyRoutes from './routes/property.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import reviewRoutes from './routes/review.routes.js';
import guestReviewRoutes from './routes/guest-review.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import messageRoutes from './routes/message.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import promoRoutes from './routes/promo.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import hostApplicationRoutes from './routes/host-application.routes.js';
import identityVerificationRoutes from './routes/identity-verification.routes.js';
import disputeRoutes from './routes/dispute.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import payoutRoutes from './routes/payout.routes.js';
import contactRoutes from './routes/contact.routes.js';
import pushRoutes from './routes/push.routes.js';
import blogRoutes from './routes/blog.routes.js';
import shortlistRoutes from './routes/shortlist.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import addonRoutes from './routes/addon.routes.js';
import consentRoutes from './routes/consent.routes.js';
import meRoutes from './routes/me.routes.js';
import recommendationRoutes from './routes/recommendation.routes.js';
import publicRoutes from './routes/public.routes.js';
import translationRoutes from './routes/translation.routes.js';
import seoRoutes from './routes/seo.routes.js';

const app = express();

// Trust Railway's proxy for rate-limiting and IP-based features
app.set('trust proxy', 1);

// Paystack webhook MUST use raw body BEFORE global JSON parser.
// HMAC-SHA512 signature is computed over the raw request body.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Hosts the app loads images from. In production the server also serves the
// built frontend, so this policy covers every page a guest or host sees: a host
// missing from this list renders as a broken image even when the photo itself
// saved fine. Listed host by host rather than opening up https: so a stray or
// injected image source is still refused.
const IMAGE_HOSTS = [
  'https://res.cloudinary.com', // uploaded listing photos, avatars, chat attachments
  'https://lh3.googleusercontent.com', // profile photo from a Google sign-in
  'https://images.unsplash.com', // home hero background in styles.css
];

// Global middleware
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        frameSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
        // No map tiles are loaded (the app links out to Google Maps rather than
        // embedding it), but photos are stored off-site, so the storage and
        // identity hosts above have to be allowed.
        imgSrc: ["'self'", 'data:', ...IMAGE_HOSTS],
        fontSrc: ["'self'", 'https:', 'data:'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        upgradeInsecureRequests: [],
      },
    },
  })
);
app.use(cors(corsOptions));
// morgan hands the raw IncomingMessage, which Express has already decorated with
// originalUrl at runtime; only the type is unaware of it.
morgan.token('url', (req) =>
  redactResetToken((req as typeof req & { originalUrl?: string }).originalUrl ?? req.url)
);
morgan.token('referrer', (req) => redactResetToken(req.headers.referer));
// Only the API surface is logged. The client is served by this same process, so
// logging page views and asset fetches would bury the API lines and would record
// the reset page above, whose address carries a live credential.
app.use(
  morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev', {
    skip: (req) => !(req.originalUrl ?? req.url).startsWith('/api'),
  })
);
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Serve uploaded files. crossOrigin policy is relaxed so the dev frontend
// (different port) can render them through the Vite proxy.
//
// Only the public families live here: listing photos and avatars are rendered by
// the public site, so they must stay fetchable without a session. Conversation
// attachments do not - they belong to a private thread - so a `msg-` request is
// refused here and answered instead by the authenticated message route, which
// checks that the requester is part of that conversation.
app.use('/uploads', (req, res, next) => {
  // The whole path, not just its last segment: the guard and express.static must
  // judge the same string, and only this function knows to decode it first.
  if (requestsChatAttachment(req.path)) {
    res.status(404).end();
    return;
  }
  next();
});
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders: (res, filePath) => {
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      // These bytes came from a person, not from us. Never let a browser decide
      // for itself what they are, and make documents download rather than render
      // inline, so a stored file cannot become a page on our origin.
      res.setHeader('X-Content-Type-Options', 'nosniff');
      if (path.extname(filePath).toLowerCase() === '.pdf') {
        res.setHeader('Content-Disposition', 'attachment');
      }
    },
  })
);

/**
 * Fails a promise that has not settled within `ms`.
 *
 * The health route needs it because a query stuck behind an exhausted pool would
 * otherwise hang the check itself, which reports nothing to anyone.
 */
function withDeadline<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) => {
      const timer = setTimeout(() => reject(new Error(label)), ms);
      timer.unref();
    }),
  ]);
}

// Health check. It answers only when a trivial query succeeds: reporting plain
// "ok" through a total database outage kept a broken server in rotation and
// showed 100 percent uptime while every real request failed.
app.get('/api/health', async (_req, res) => {
  const base = { timestamp: new Date().toISOString(), uptime: process.uptime() };
  try {
    await withDeadline(prisma.$queryRaw`SELECT 1`, 3000, 'health query timed out after 3s');
    res.json({ status: 'ok', ...base });
  } catch (err) {
    console.error('Health check failed:', err instanceof Error ? err.message : err);
    res.status(503).json({ status: 'unhealthy', database: 'unreachable', ...base });
  }
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/guest-reviews', guestReviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/host-application', hostApplicationRoutes);
app.use('/api/identity-verification', identityVerificationRoutes);
app.use('/api/disputes', disputeRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', payoutRoutes); // /api/host/payouts, /api/admin/payouts, etc.

app.use('/api', addonRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/push', pushRoutes);
app.use('/api/guides', blogRoutes);
app.use('/api/shortlists', shortlistRoutes);
app.use('/api/conversations', conversationRoutes);
app.use('/api/consent', consentRoutes);
app.use('/api/me', meRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/translations', translationRoutes);

// Crawler files live at the site root, not under /api. They are mounted here so
// they resolve before the SPA shell that answers every other path.
app.use(seoRoutes);

// Unknown API route -> JSON 404 instead of the default HTML "Cannot GET".
app.use('/api', (_req, res) => {
  res.status(404).json({ success: false, error: 'Endpoint not found' });
});

// Error handler (must be last)
app.use(errorHandler);

export default app;

