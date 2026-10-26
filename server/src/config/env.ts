import dotenv from 'dotenv';
dotenv.config();

import { z } from 'zod';

const envSchema = z.object({
  PORT: z.string().default('3000'),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  DATABASE_URL: z.string().min(1),
  JWT_ACCESS_SECRET: z.string().min(32, 'JWT_ACCESS_SECRET must be at least 32 characters'),
  JWT_REFRESH_SECRET: z.string().min(32, 'JWT_REFRESH_SECRET must be at least 32 characters'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),
  GOOGLE_CLIENT_ID: z.string().optional(),
  GOOGLE_CLIENT_SECRET: z.string().optional(),
  GOOGLE_CALLBACK_URL: z.string().optional(),
  TELEGRAM_BOT_TOKEN: z.string().optional(),
  TELEGRAM_CHAT_ID: z.string().optional(),
  // Cloudinary (image storage). Format: cloudinary://<key>:<secret>@<cloud_name>
  // When unset, uploads fall back to local disk (dev only - ephemeral in prod).
  CLOUDINARY_URL: z.string().optional(),
  // Dedicated host-verification document key. When omitted, the service uses
  // a domain-separated key derived from JWT_REFRESH_SECRET for compatibility.
  HOST_DOCUMENT_ENCRYPTION_KEY: z.string().min(32).optional(),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Paystack
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  // Note: Paystack has no separate webhook secret. Webhook signatures are
  // HMAC-SHA512 over the raw payload signed with PAYSTACK_SECRET_KEY.
  PAYSTACK_BASE_URL: z.string().default('https://api.paystack.co'),
  // Web Push (VAPID). Absent in production just disables push sends (logged),
  // it never blocks boot - notifications are a nice-to-have, not a hard dependency.
  VAPID_PUBLIC_KEY: z.string().optional(),
  VAPID_PRIVATE_KEY: z.string().optional(),
  // The one platform admin. Set both on Railway; the account is created/synced
  // at boot and every other ADMIN is demoted. Unset = no admin sync happens.
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().optional(),
  // Platform fees. Every rate below is configuration rather than code: a
  // business decision changes the money split with an env var, no deploy.
  WITHHOLDING_TAX_RATE: z.string().default('5'),
  TRANSFER_FEE_PASS_TO_HOST: z.string().default('false'),
  // Fraction of the accommodation subtotal the platform keeps, charged to the
  // HOST (0.1 means 10%). Never charged on cleaning, extra-guest or late
  // check-out amounts - those are pass-through costs. Default 0 preserves the
  // original split until a commission rate is agreed.
  HOST_COMMISSION_RATE: z.string().default('0'),
  // Fraction of the nightly subtotal charged to the GUEST as a service fee.
  // Setting this to 0 makes the guest pay the listed price only, which is what
  // undercuts marketplaces that add their own fee on top.
  GUEST_SERVICE_FEE_RATE: z.string().default('0.12'),
  // Pass the guest's cleaning fee / late check-out fee through to the host.
  HOST_PAY_CLEANING_FEE: z.string().default('false'),
  HOST_PAY_LATE_CHECKOUT_FEE: z.string().default('false'),
  // Hours after check-in before a host's share becomes withdrawable. A stay
  // has to have started before the money leaves the platform, so a guest
  // cancelling or disputing cannot leave the platform chasing a paid-out host.
  // 0 pays out at check-in.
  HOST_FUNDS_HOLD_HOURS: z.string().default('24'),
  // Who funds a promo code. 'host' (default) takes the discount out of the
  // host's payout, which is the original behaviour. 'platform' pays the host on
  // the full price and absorbs the discount, except on a host's own code.
  PLATFORM_PROMO_FUNDING: z.enum(['host', 'platform']).default('host'),
})
  .superRefine((data, ctx) => {
    // A rate outside 0..1 would pay a host a multiplied or negative amount.
    for (const key of ['HOST_COMMISSION_RATE', 'GUEST_SERVICE_FEE_RATE'] as const) {
      const rate = Number(data[key]);
      if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be a fraction between 0 and 1 (0.1 means 10%), got "${data[key]}"`,
        });
      }
    }
    const holdHours = Number(data.HOST_FUNDS_HOLD_HOURS);
    if (!Number.isFinite(holdHours) || holdHours < 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['HOST_FUNDS_HOLD_HOURS'],
        message: `HOST_FUNDS_HOLD_HOURS must be zero or more hours, got "${data.HOST_FUNDS_HOLD_HOURS}"`,
      });
    }
    if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
      });
    }
    if (Boolean(data.ADMIN_EMAIL) !== Boolean(data.ADMIN_PASSWORD)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ADMIN_PASSWORD'],
        message: 'ADMIN_EMAIL and ADMIN_PASSWORD must be set together',
      });
    }
    if (data.NODE_ENV === 'production' && data.ADMIN_PASSWORD && data.ADMIN_PASSWORD.length < 12) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['ADMIN_PASSWORD'],
        message: 'ADMIN_PASSWORD must be at least 12 characters in production',
      });
    }
    // Never allow the shipped dev placeholder secrets in production.
    if (data.NODE_ENV === 'production') {
      const weak = [data.JWT_ACCESS_SECRET, data.JWT_REFRESH_SECRET].some((s) =>
        /zurilofts-dev|change-?me|secret-key|placeholder/i.test(s)
      );
      if (weak) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['JWT_ACCESS_SECRET'],
          message: 'Production JWT secrets must not use the development placeholder values. Generate strong random secrets (e.g. `openssl rand -base64 48`).',
        });
      }
      // Paystack keys are needed for payments in production, but their absence
      // must not crash the server - it should still boot and serve everything
      // else. Payment/payout endpoints fail with a clear error only when used.
      if (!data.PAYSTACK_SECRET_KEY || !data.PAYSTACK_PUBLIC_KEY) {
        console.warn(
          '  Paystack keys are not fully configured (PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY). Payments and payouts are disabled until these are set.'
        );
      }
      // Require Cloudinary in production - Railway's filesystem is ephemeral, so
      // local-disk uploads would be lost on every redeploy.
      if (!data.CLOUDINARY_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['CLOUDINARY_URL'],
          message: 'CLOUDINARY_URL is required in production for persistent image storage (Railway disk is ephemeral).',
        });
      }
      if (!data.VAPID_PUBLIC_KEY || !data.VAPID_PRIVATE_KEY) {
        console.warn(
          '  VAPID keys are not configured (VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY). Push notifications are disabled until these are set.'
        );
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(' Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
