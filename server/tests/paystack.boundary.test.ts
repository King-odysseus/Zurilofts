/**
 * Webhook-signature, transfer-amount, and balance-unit boundary tests for the
 * Paystack gateway config.
 *
 * Run from server/:
 *   PAYSTACK_SECRET_KEY=sk_test_dummy node --import tsx --test tests/paystack.boundary.test.ts
 *
 * A non-placeholder PAYSTACK_SECRET_KEY must be set so requireSecret() passes
 * and so the webhook HMAC has a key. dotenv does not override an env var that is
 * already present in the process. No live Paystack calls are made - fetch is
 * mocked for the transfer/balance tests.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';

import * as paystack from '../src/config/paystack.js';
import { env } from '../src/config/env.js';

// The webhook signature is HMAC-SHA512 over the raw payload, keyed by the
// integration SECRET KEY (not a separate webhook secret).
const SECRET = env.PAYSTACK_SECRET_KEY as string;

function sign(payload: string): string {
  return crypto.createHmac('sha512', SECRET).update(payload).digest('hex');
}

/** Swap in a fake global fetch for one test, then restore it. */
async function withFetch(fake: typeof fetch, fn: () => Promise<void>): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
}

// ---- Webhook signature verification ----

test('verifyWebhookSignature accepts a valid secret-key HMAC-SHA512 signature', () => {
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_1' } });
  assert.equal(paystack.verifyWebhookSignature(payload, sign(payload)), true);
});

test('verifyWebhookSignature rejects a signature computed over a different body', () => {
  const payload = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_1' } });
  const tampered = JSON.stringify({ event: 'charge.success', data: { reference: 'ref_2' } });
  // Attacker changes the body but replays a signature for the original payload.
  assert.equal(paystack.verifyWebhookSignature(tampered, sign(payload)), false);
});

test('verifyWebhookSignature rejects a valid-length hex string that is not the real HMAC', () => {
  const payload = JSON.stringify({ event: 'transfer.success' });
  // Same 128-hex-char width as a real SHA-512 digest, but wrong value.
  const forged = 'a'.repeat(128);
  assert.equal(paystack.verifyWebhookSignature(payload, forged), false);
});

test('verifyWebhookSignature rejects malformed signature values without throwing', () => {
  const payload = JSON.stringify({ event: 'charge.success' });
  // Empty, too-short, too-long, and non-string inputs must all return false
  // (never throw from timingSafeEqual on a length mismatch).
  assert.equal(paystack.verifyWebhookSignature(payload, ''), false);
  assert.equal(paystack.verifyWebhookSignature(payload, 'deadbeef'), false);
  assert.equal(paystack.verifyWebhookSignature(payload, 'x'.repeat(200)), false);
  assert.equal(
    paystack.verifyWebhookSignature(payload, undefined as unknown as string),
    false
  );
});

// ---- Transfer amount conversion (whole KES -> subunit, exactly once) ----

test('initiateTransfer converts the whole-KES amount to the cent subunit once', async () => {
  let sentBody: any;
  const fake = (async (_url: string, init: RequestInit) => {
    sentBody = JSON.parse(init.body as string);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        message: 'Transfer queued',
        data: { reference: 'trf_ref', transfer_code: 'TRF_x', amount: sentBody.amount, status: 'pending' },
      }),
    };
  }) as unknown as typeof fetch;

  await withFetch(fake, async () => {
    const out = await paystack.initiateTransfer({
      recipientCode: 'RCP_x',
      amount: 5000, // whole KES
      reason: 'payout',
      reference: 'trf_ref',
    });
    // 5000 KES must go out as 500000 cents - and via toPaystackSubunit, not a
    // second ad-hoc multiply.
    assert.equal(sentBody.amount, paystack.toPaystackSubunit(5000));
    assert.equal(sentBody.amount, 500000);
    assert.equal(out.transferRef, 'trf_ref');
    assert.equal(out.status, 'pending');
  });
});

test('initiateTransfer refuses a non-integer KES amount at the boundary', async () => {
  const fake = (async () => {
    throw new Error('fetch must not be called for an invalid amount');
  }) as unknown as typeof fetch;

  await withFetch(fake, async () => {
    await assert.rejects(
      () =>
        paystack.initiateTransfer({
          recipientCode: 'RCP_x',
          amount: 50.5,
          reason: 'payout',
          reference: 'trf_bad',
        }),
      /non-integer/
    );
  });
});

test('creates a Kenyan M-PESA transfer recipient with Paystack mobile_money fields', async () => {
  let sentBody: any;
  const fake = (async (_url: string, init: RequestInit) => {
    sentBody = JSON.parse(init.body as string);
    return {
      ok: true,
      status: 200,
      json: async () => ({
        status: true,
        data: {
          recipient_code: 'RCP_mpesa',
          details: { bank_name: 'M-PESA', account_name: 'Host Name' },
        },
      }),
    };
  }) as unknown as typeof fetch;

  await withFetch(fake, async () => {
    await paystack.createTransferRecipient({
      name: 'Host Name',
      accountNumber: '0712345678',
      bankCode: 'MPESA',
      type: 'mobile_money',
    });
    assert.deepEqual(sentBody, {
      type: 'mobile_money',
      name: 'Host Name',
      account_number: '0712345678',
      bank_code: 'MPESA',
      currency: 'KES',
    });
  });
});

// ---- Balance unit normalization (Paystack cents -> whole KES) ----

test('checkBalance normalizes the Paystack cent balance to whole KES', async () => {
  const fake = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      // Paystack reports 500000 cents == 5000 KES.
      data: [{ currency: 'KES', balance: 500000 }],
    }),
  })) as unknown as typeof fetch;

  await withFetch(fake, async () => {
    const balance = await paystack.checkBalance();
    assert.equal(balance, 5000);
  });
});

test('checkBalance ignores non-KES balances so units stay comparable to HostWallet', async () => {
  const fake = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      data: [
        { currency: 'KES', balance: 250000 }, // 2500 KES
        { currency: 'NGN', balance: 999999999 }, // must not leak into the KES total
      ],
    }),
  })) as unknown as typeof fetch;

  await withFetch(fake, async () => {
    assert.equal(await paystack.checkBalance(), 2500);
  });
});

test('fromPaystackSubunit floors partial KES and round-trips with toPaystackSubunit', () => {
  assert.equal(paystack.fromPaystackSubunit(500000), 5000);
  assert.equal(paystack.fromPaystackSubunit(150), 1); // 1.50 KES floors to 1 whole KES
  assert.equal(paystack.fromPaystackSubunit(paystack.toPaystackSubunit(1234)), 1234);
  assert.throws(() => paystack.fromPaystackSubunit(NaN), /non-numeric/);
});
