/**
 * Verification-decision tests for confirming a Paystack payment against a booking.
 *
 * Run from server/:
 *   PAYSTACK_SECRET_KEY=sk_test_dummy node --import tsx --test tests/payment.verify.test.ts
 *
 * These exercise the pure decision logic (checkVerifiedPayment,
 * isTerminalBookingStatus) - no DB or network is touched.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { checkVerifiedPayment, isTerminalBookingStatus, paymentChannelsForMethod } from '../src/services/payment.service.js';

const EXPECTED_KES = 5000; // -> 500000 subunits
const REF = 'zrlft-abcd1234-ef01';
const BOOKING = 'booking_1';

function base(overrides: Partial<{
  reference: string;
  amount: number;
  currency: string;
  status: string;
  metadata: { bookingId?: string } | null;
}> = {}) {
  return {
    verification: {
      reference: overrides.reference ?? REF,
      amount: overrides.amount ?? 500000,
      currency: overrides.currency ?? 'KES',
      status: overrides.status ?? 'success',
      metadata: overrides.metadata === undefined ? { bookingId: BOOKING } : overrides.metadata,
    },
    expectedReference: REF,
    expectedBookingId: BOOKING,
    expectedTotalKes: EXPECTED_KES,
  };
}

test('accepts a correct, exact payment', () => {
  assert.deepEqual(checkVerifiedPayment(base()), { ok: true });
});

test('accepts a correct payment even when metadata carries no bookingId', () => {
  assert.deepEqual(checkVerifiedPayment(base({ metadata: null })), { ok: true });
});

test('rejects underpayment', () => {
  const r = checkVerifiedPayment(base({ amount: 499900 }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'amount_mismatch');
});

test('rejects overpayment', () => {
  const r = checkVerifiedPayment(base({ amount: 500100 }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'amount_mismatch');
});

test('rejects the wrong currency', () => {
  const r = checkVerifiedPayment(base({ currency: 'NGN' }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'currency_mismatch');
});

test('rejects a reference mismatch', () => {
  const r = checkVerifiedPayment(base({ reference: 'some-other-ref' }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'reference_mismatch');
});

test('rejects a transaction whose status is not success', () => {
  const r = checkVerifiedPayment(base({ status: 'failed' }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'not_success');
});

test('rejects metadata that points at a different booking', () => {
  // Even with a matching reference and exact amount, forged metadata must not be
  // able to confirm a different reservation.
  const r = checkVerifiedPayment(base({ metadata: { bookingId: 'someone_elses_booking' } }));
  assert.equal(r.ok, false);
  assert.equal((r as { reason: string }).reason, 'booking_mismatch');
});

test('is deterministic across duplicate deliveries of the same success', () => {
  const first = checkVerifiedPayment(base());
  const second = checkVerifiedPayment(base());
  assert.deepEqual(first, second);
  assert.deepEqual(first, { ok: true });
});

test('isTerminalBookingStatus guards already-settled bookings (idempotency)', () => {
  assert.equal(isTerminalBookingStatus('CONFIRMED'), true);
  assert.equal(isTerminalBookingStatus('CONFLICT'), true);
  assert.equal(isTerminalBookingStatus('PENDING'), false);
  assert.equal(isTerminalBookingStatus('CANCELLED'), false);
});

test('maps the M-PESA checkout choice to Paystack mobile_money', () => {
  assert.deepEqual(paymentChannelsForMethod('mpesa'), ['mobile_money']);
  assert.deepEqual(paymentChannelsForMethod('card'), ['card']);
  assert.deepEqual(paymentChannelsForMethod('bank'), ['bank', 'bank_transfer']);
  assert.equal(paymentChannelsForMethod(undefined), undefined);
});
