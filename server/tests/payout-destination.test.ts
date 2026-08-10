import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  maskPayoutAccount,
  normalizeKenyanMpesaPhone,
  payoutRecipientKey,
} from '../src/utils/payoutDestination.js';

test('normalizes common Kenyan M-PESA phone formats for Paystack', () => {
  assert.equal(normalizeKenyanMpesaPhone('0712 345 678'), '0712345678');
  assert.equal(normalizeKenyanMpesaPhone('+254 712 345 678'), '0712345678');
  assert.equal(normalizeKenyanMpesaPhone('254112345678'), '0112345678');
});

test('rejects invalid or non-Kenyan M-PESA numbers', () => {
  assert.throws(() => normalizeKenyanMpesaPhone('712345678'), /valid Kenyan M-PESA number/);
  assert.throws(() => normalizeKenyanMpesaPhone('0201234567'), /valid Kenyan M-PESA number/);
  assert.throws(() => normalizeKenyanMpesaPhone('+255712345678'), /valid Kenyan M-PESA number/);
});

test('recipient keys change with method or destination details', () => {
  const mpesa = payoutRecipientKey('mpesa', '0712345678', 'MPESA');
  assert.equal(mpesa, payoutRecipientKey('mpesa', '0712345678', 'MPESA'));
  assert.notEqual(mpesa, payoutRecipientKey('mpesa', '0799999999', 'MPESA'));
  assert.notEqual(mpesa, payoutRecipientKey('bank', '0712345678', 'MPESA'));
});

test('masks payout destinations to their final four characters', () => {
  assert.equal(maskPayoutAccount('0712345678'), '•••• 5678');
  assert.equal(maskPayoutAccount(null), null);
});
