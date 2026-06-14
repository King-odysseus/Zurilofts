import { z } from 'zod';

// ============================================================
// JWT payload augmented to Express Request
// ============================================================
export interface JwtPayload {
  sub: string;
  email: string;
  role: 'USER' | 'ADMIN';
}

declare global {
  namespace Express {
    interface Request {
      user?: JwtPayload;
    }
  }
}

// ============================================================
// API Response shape
// ============================================================
export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ============================================================
// Zod validation schemas for request bodies
// ============================================================

export const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),
});

export const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export const refreshSchema = z.object({
  refreshToken: z.string().optional(),
});

export const propertyCreateSchema = z.object({
  title: z.string().min(1).max(200),
  location: z.string().min(1).max(200),
  price: z.number().int().positive(),
  bedrooms: z.number().int().min(0),
  bathrooms: z.number().int().min(0),
  area: z.number().int().positive(),
  description: z.string().min(1),
  // Accept relative paths (e.g. /uploads/..., /images/...) as well as absolute URLs
  images: z.array(z.string().min(1)).min(1, 'At least one image is required'),
  amenities: z.array(z.string()),
  nearby: z.array(z.string()),
  type: z.enum(['apartment', 'studio', 'penthouse']),
  available: z.boolean().default(true),
  featured: z.boolean().default(false),
});

export const propertyUpdateSchema = propertyCreateSchema.partial();

export const bookingCreateSchema = z.object({
  // IDs are cuid in SQLite (dev) and uuid in Postgres (prod) — accept either
  propertyId: z.string().min(1, 'Property is required'),
  checkIn: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid check-in date'),
  checkOut: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid check-out date'),
  guests: z.number().int().min(1).max(6, 'Maximum 6 guests per property'),
  bedOption: z.enum(['1bed', '2bed']).optional(),
  checkInTime: z.string().optional(),
  checkOutTime: z.string().optional(),
  specialRequests: z.string().max(1000).optional(),
  additionalGuests: z
    .array(
      z.object({
        firstName: z.string().max(100),
        lastName: z.string().max(100),
      })
    )
    .max(9)
    .optional(),
  paymentMethod: z.enum(['card', 'mpesa', 'bank']),
  promoCode: z.string().optional(),
});

export const reviewCreateSchema = z.object({
  bookingId: z.string().min(1, 'Booking is required'),
  rating: z.number().int().min(1, 'Rating is required').max(5),
  satisfaction: z.enum(['happy', 'neutral', 'unhappy']).optional(),
  privateNote: z.string().max(2000).optional(),
});

export const favoriteCreateSchema = z.object({
  propertyId: z.string().min(1, 'Property is required'),
});

export const messageCreateSchema = z.object({
  body: z.string().min(1, 'Message cannot be empty').max(2000),
});

export const promoCreateSchema = z.object({
  code: z.string().min(3).max(20).regex(/^[A-Z0-9_-]+$/, 'Code must be uppercase letters, numbers, hyphens, or underscores'),
  discountPercent: z.number().int().min(1).max(100),
  maxDiscount: z.number().int().positive().optional(),
  minBookingAmount: z.number().int().positive().optional(),
  validFrom: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid start date'),
  validUntil: z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid end date'),
  maxUses: z.number().int().positive().optional(),
});

export const promoUpdateSchema = promoCreateSchema.partial().extend({
  active: z.boolean().optional(),
});

export const promoValidateSchema = z.object({
  code: z.string().min(1),
  subtotal: z.number().int().positive(),
});

export const profileUpdateSchema = z.object({
  firstName: z.string().min(1).max(50).optional(),
  lastName: z.string().min(1).max(50).optional(),
  email: z.string().email('Invalid email address').optional(),
  phone: z.string().max(20).optional(),
  avatar: z.string().max(500).optional(),
});

export const passwordChangeSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number'),
});

export const bookingStatusSchema = z.object({
  status: z.enum(['CONFIRMED', 'CANCELLED']),
});

// ---- Calendar sync & seasonal pricing ----

export const calendarSourceSchema = z.object({
  name: z.string().min(1, 'Name is required').max(60),
  url: z.string().url('Must be a valid iCal/ICS URL'),
});

const dateString = z.string().refine((d) => !isNaN(Date.parse(d)), 'Invalid date');

export const calendarBlockSchema = z.object({
  start: dateString,
  end: dateString,
  summary: z.string().max(200).optional(),
});

export const priceRuleSchema = z.object({
  name: z.string().max(60).optional(),
  start: dateString,
  end: dateString,
  price: z.number().int().positive(),
});

// ============================================================
// Custom error classes
// ============================================================
export class AppError extends Error {
  constructor(
    message: string,
    public statusCode: number = 500
  ) {
    super(message);
    this.name = 'AppError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource') {
    super(`${resource} not found`, 404);
    this.name = 'NotFoundError';
  }
}

export class UnauthorizedError extends AppError {
  constructor(message: string = 'Authentication required') {
    super(message, 401);
    this.name = 'UnauthorizedError';
  }
}

export class ForbiddenError extends AppError {
  constructor(message: string = 'Access denied') {
    super(message, 403);
    this.name = 'ForbiddenError';
  }
}

export class ConflictError extends AppError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'ConflictError';
  }
}

export class ValidationError extends AppError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'ValidationError';
  }
}
