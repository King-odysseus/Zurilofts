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
  CLIENT_URL: z.string().default('http://localhost:5173'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
  // Paystack
  PAYSTACK_SECRET_KEY: z.string().optional(),
  PAYSTACK_PUBLIC_KEY: z.string().optional(),
  PAYSTACK_WEBHOOK_SECRET: z.string().optional(),
  PAYSTACK_BASE_URL: z.string().default('https://api.paystack.co'),
  // Platform fees
  SERVICE_FEE_PERCENT: z.string().default('7.5'),
  WITHHOLDING_TAX_RATE: z.string().default('5'),
  TRANSFER_FEE_PASS_TO_HOST: z.string().default('false'),
})
  .superRefine((data, ctx) => {
    if (data.JWT_ACCESS_SECRET === data.JWT_REFRESH_SECRET) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['JWT_REFRESH_SECRET'],
        message: 'JWT_REFRESH_SECRET must differ from JWT_ACCESS_SECRET',
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
      // must not crash the server — it should still boot and serve everything
      // else. Payment/payout endpoints fail with a clear error only when used.
      if (!data.PAYSTACK_SECRET_KEY || !data.PAYSTACK_PUBLIC_KEY || !data.PAYSTACK_WEBHOOK_SECRET) {
        console.warn(
          '⚠️  Paystack keys are not fully configured (PAYSTACK_SECRET_KEY, PAYSTACK_PUBLIC_KEY, PAYSTACK_WEBHOOK_SECRET). Payments and payouts are disabled until these are set.'
        );
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
