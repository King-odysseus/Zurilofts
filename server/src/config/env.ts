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
  // Withholding tax deducted from the host's share. This is a STATUTORY rate,
  // not a free choice: Kenya's Income Tax Act s.35 withholds 10% of gross rent
  // paid to a resident landlord (residential and commercial alike, per KRA's
  // own withholding-tax guidance). The 7.5% figure that circulates for short
  // lets is the Monthly Rental Income regime, which applies to long-term
  // residential letting and is not the default for nightly accommodation;
  // that is generally business income instead. 20% is the NON-RESIDENT rate
  // for professional, management and royalty fees, and does not apply to a
  // resident host who has not registered for a KRA PIN.
  //
  // The default below (5) is NOT one of those statutory rates. Confirm the rate
  // with the platform's tax adviser before going live, and note that KRA treats
  // withholding as a credit the host reclaims, so the payer is remitting tax on
  // the host's behalf rather than taxing them twice.
  WITHHOLDING_TAX_RATE: z.string().default('5'),
  // Paystack's collection fee, charged to the GUEST on top of the booking total
  // and grossed up so the platform still receives the full total afterwards.
  // 0.029 is Paystack Kenya's 2.9% local-card rate. Set the rate to 0 to have
  // the platform absorb the fee instead.
  PAYSTACK_FEE_RATE: z.string().default('0.029'),
  // Flat KES part of the collection fee; nil on Paystack collections.
  PAYSTACK_FEE_FIXED_KES: z.string().default('0'),
  // Ceiling on the guest-paid gateway fee in KES. 0 = no ceiling.
  PAYSTACK_FEE_CAP_KES: z.string().default('0'),
  // Headroom kept in the Paystack balance before a host transfer is attempted.
  // Paystack deducts its own transfer fee (KES 20-180 on typical amounts) from
  // the balance, so without headroom a payout for the exact balance is refused.
  PAYSTACK_TRANSFER_FEE_RESERVE_KES: z.string().default('200'),
  // Fraction of the accommodation subtotal the platform keeps, charged to the
  // HOST (0.1 means 10%). Never charged on cleaning, extra-guest or late
  // check-out amounts - those are pass-through costs. This is the platform's
  // only fee, so the default below is the agreed split rather than a
  // placeholder: a deploy that forgets the variable still takes the 10%.
  HOST_COMMISSION_RATE: z.string().default('0.1'),
  // Fraction of the nightly subtotal charged to the GUEST as a service fee.
  // Zero means the guest pays the listed price only, which is what undercuts
  // marketplaces that add their own fee on top. Zero is the policy: the
  // platform's fee is HOST_COMMISSION_RATE, charged on the host's side.
  GUEST_SERVICE_FEE_RATE: z.string().default('0'),
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
  // Founding-host programme. The first FOUNDING_HOST_LIMIT approved hosts pay
  // FOUNDING_HOST_COMMISSION_RATE instead of HOST_COMMISSION_RATE. A limit of 0
  // switches the programme off, which is the default: a real cap only creates
  // urgency once someone has decided how many places to give away.
  FOUNDING_HOST_LIMIT: z.string().default('0'),
  FOUNDING_HOST_COMMISSION_RATE: z.string().default('0.05'),
  // KES credited to a host whose referred host completes a first stay. 0
  // switches the referral bonus off.
  REFERRAL_REWARD_KES: z.string().default('0'),
  // Nudge an application left mid-way after this many idle days, at most
  // HOST_NUDGE_MAX times. The nudges go out as push notifications; the server
  // has no email provider, so a host without push is not reached this way.
  HOST_NUDGE_AFTER_DAYS: z.string().default('2'),
  HOST_NUDGE_MAX: z.string().default('2'),
  // Machine translation for the text a hand-written dictionary cannot hold: the
  // words a host or guest types themselves (listing copy, reviews, add-ons) and
  // any screen added after it was translated. 'none' leaves the app exactly as
  // it is today - the endpoint answers with the original text and no request
  // ever leaves the server. See services/translation.service.ts.
  TRANSLATION_PROVIDER: z.enum(['none', 'google', 'azure', 'libretranslate']).default('none'),
  TRANSLATION_API_KEY: z.string().optional(),
  // Azure: the region of the multi-service resource, e.g. "westeurope".
  TRANSLATION_REGION: z.string().optional(),
  // LibreTranslate: the base URL of the instance to call.
  TRANSLATION_ENDPOINT: z.string().url().optional(),
  // Private message bodies are a different promise from public listing copy:
  // translating them sends a guest's words to a third party. Off by default and
  // only switched on by someone who has decided that, and said so in the
  // privacy policy.
  TRANSLATION_PRIVATE_CONTENT: z.string().default('false'),
})
  .superRefine((data, ctx) => {
    // A rate outside 0..1 would pay a host a multiplied or negative amount.
    // FOUNDING_HOST_COMMISSION_RATE belongs here too: a founding place fixes
    // that host's rate for the life of the account, so a typo would be
    // permanent rather than a one-off overcharge.
    for (const key of ['HOST_COMMISSION_RATE', 'GUEST_SERVICE_FEE_RATE', 'FOUNDING_HOST_COMMISSION_RATE'] as const) {
      const rate = Number(data[key]);
      if (!Number.isFinite(rate) || rate < 0 || rate > 1) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be a fraction between 0 and 1 (0.1 means 10%), got "${data[key]}"`,
        });
      }
    }
    // The gateway fee is grossed up as rate / (1 - rate), so a rate of 1 or
    // more has no finite answer and a negative one would pay the guest.
    const gatewayRate = Number(data.PAYSTACK_FEE_RATE);
    if (!Number.isFinite(gatewayRate) || gatewayRate < 0 || gatewayRate >= 1) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['PAYSTACK_FEE_RATE'],
        message: `PAYSTACK_FEE_RATE must be a fraction from 0 up to but below 1 (0.029 means 2.9%), got "${data.PAYSTACK_FEE_RATE}"`,
      });
    }
    for (const key of ['PAYSTACK_FEE_FIXED_KES', 'PAYSTACK_FEE_CAP_KES', 'PAYSTACK_TRANSFER_FEE_RESERVE_KES'] as const) {
      const kes = Number(data[key]);
      if (!Number.isFinite(kes) || kes < 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: [key],
          message: `${key} must be zero or more KES, got "${data[key]}"`,
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
      // A test-mode key is more dangerous than a missing one: every charge would
      // report success against Paystack sandbox while no real money moves, so
      // the platform would confirm bookings and release host payouts against
      // funds it never received. Absence is tolerated above; a wrong key is not.
      const secretKey = data.PAYSTACK_SECRET_KEY;
      const keyLooksFake =
        !!secretKey &&
        (secretKey.startsWith('sk_test_') ||
          /^sk_live_x+$/.test(secretKey) ||
          secretKey === 'your_paystack_secret_key');
      if (keyLooksFake) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['PAYSTACK_SECRET_KEY'],
          message:
            'PAYSTACK_SECRET_KEY is a test-mode or placeholder key. Production must use the live secret key (sk_live_...), or leave it unset so payments stay disabled.',
        });
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
    // A provider without a key is a silent no-op, which looks like a broken
    // translation feature rather than a missing setting. Say so at boot, in
    // every environment, instead of leaving it to be discovered in a browser.
    const translationReady = data.TRANSLATION_PROVIDER === 'libretranslate'
      ? Boolean(data.TRANSLATION_ENDPOINT || data.TRANSLATION_API_KEY)
      : Boolean(data.TRANSLATION_API_KEY);
    if (data.TRANSLATION_PROVIDER !== 'none' && !translationReady) {
      console.warn(
        `  TRANSLATION_PROVIDER is "${data.TRANSLATION_PROVIDER}" but TRANSLATION_API_KEY is unset. Text outside the dictionaries will stay in English.`
      );
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error(' Invalid environment variables:');
  console.error(parsed.error.format());
  process.exit(1);
}

export const env = parsed.data;
