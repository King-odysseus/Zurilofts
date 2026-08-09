/**
 * Money-boundary and verification-fetch tests for the Paystack gateway config.
 *
 * Run from server/:
 *   PAYSTACK_SECRET_KEY=sk_test_dummy node --import tsx --test tests/paystack.money.test.ts
 *
 * A non-placeholder PAYSTACK_SECRET_KEY must be set so requireSecret() passes;
 * dotenv does not override an env var already present in the process.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import * as paystack from '../src/config/paystack.js';

test('toPaystackSubunit converts whole KES to the cent subunit', () => {
  assert.equal(paystack.toPaystackSubunit(5000), 500000);
  assert.equal(paystack.toPaystackSubunit(1), 100);
  assert.equal(paystack.toPaystackSubunit(0), 0);
  assert.equal(paystack.KES_SUBUNIT_FACTOR, 100);
});

test('toPaystackSubunit rejects non-integer, negative, and unsafe amounts', () => {
  assert.throws(() => paystack.toPaystackSubunit(50.5), /non-integer/);
  assert.throws(() => paystack.toPaystackSubunit(-1), /negative/);
  // 1e15 KES * 100 exceeds Number.MAX_SAFE_INTEGER -> must be rejected, not truncated.
  assert.throws(() => paystack.toPaystackSubunit(1e15), /too large/);
  // A string that "looks" numeric must not sneak through.
  assert.throws(() => paystack.toPaystackSubunit('5000' as unknown as number), /non-integer/);
});

/** Swap in a fake global fetch for one test, then restore it. */
async function withFetch(
  fake: typeof fetch,
  fn: () => Promise<void>
): Promise<void> {
  const original = globalThis.fetch;
  globalThis.fetch = fake;
  try {
    await fn();
  } finally {
    globalThis.fetch = original;
  }
}

test('verifyTransaction returns the transaction record on success', async () => {
  const fake = (async () => ({
    ok: true,
    status: 200,
    json: async () => ({
      status: true,
      message: 'Verification successful',
      data: { id: 1, reference: 'ref_ok', amount: 500000, currency: 'KES', status: 'success', paid_at: 'x', channel: 'card' },
    }),
  })) as unknown as typeof fetch;

  await withFetch(fake, async () => {
    const data = await paystack.verifyTransaction('ref_ok');
    assert.equal(data.amount, 500000);
    assert.equal(data.currency, 'KES');
    assert.equal(data.reference, 'ref_ok');
    assert.equal(data.status, 'success');
  });
});

test('verifyTransaction throws on a provider outage instead of swallowing it', async () => {
  const fake = (async () => ({
    ok: false,
    status: 503,
    text: async () => 'Service Unavailable',
  })) as unknown as typeof fetch;

  await withFetch(fake, async () => {
    // A provider failure must surface as an error, never as null/undefined that a
    // caller could mistake for "payment not valid".
    await assert.rejects(() => paystack.verifyTransaction('ref_down'), /failed \(503\)/);
  });
});

test('verifyTransaction propagates a network error', async () => {
  const fake = (async () => {
    throw new Error('ECONNRESET');
  }) as unknown as typeof fetch;

  await withFetch(fake, async () => {
    await assert.rejects(() => paystack.verifyTransaction('ref_net'), /ECONNRESET/);
  });
});
