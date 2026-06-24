import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import { corsOptions } from './config/cors.js';
import { env } from './config/env.js';
import { errorHandler } from './middleware/errorHandler.js';
import { UPLOAD_DIR } from './controllers/upload.controller.js';

// Import routes
import authRoutes from './routes/auth.routes.js';
import propertyRoutes from './routes/property.routes.js';
import bookingRoutes from './routes/booking.routes.js';
import reviewRoutes from './routes/review.routes.js';
import favoriteRoutes from './routes/favorite.routes.js';
import messageRoutes from './routes/message.routes.js';
import promoRoutes from './routes/promo.routes.js';
import userRoutes from './routes/user.routes.js';
import adminRoutes from './routes/admin.routes.js';
import chatRoutes from './routes/chat.routes.js';
import uploadRoutes from './routes/upload.routes.js';
import paymentRoutes from './routes/payment.routes.js';
import payoutRoutes from './routes/payout.routes.js';
import contactRoutes from './routes/contact.routes.js';

const app = express();

// Paystack webhook MUST use raw body BEFORE global JSON parser.
// HMAC-SHA512 signature is computed over the raw request body.
app.use('/api/payments/webhook', express.raw({ type: 'application/json' }));

// Global middleware
app.use(helmet());
app.use(cors(corsOptions));
app.use(morgan(env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '1mb' }));
app.use(cookieParser());

// Serve uploaded (optimized) property images. crossOrigin policy is relaxed so
// the dev frontend (different port) can render them through the Vite proxy.
app.use(
  '/uploads',
  express.static(UPLOAD_DIR, {
    setHeaders: (res) => res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin'),
  })
);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/properties', propertyRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/favorites', favoriteRoutes);
app.use('/api/messages', messageRoutes);
app.use('/api/promo', promoRoutes);
app.use('/api/users', userRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api', payoutRoutes); // /api/host/payouts, /api/admin/payouts, etc.
app.use('/api/contact', contactRoutes);

// Error handler (must be last)
app.use(errorHandler);

export default app;
