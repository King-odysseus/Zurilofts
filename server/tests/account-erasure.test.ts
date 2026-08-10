import { test } from 'node:test';
import assert from 'node:assert/strict';

import { accountDeletionSchema, adminAccountDeletionSchema } from '../src/types/index.js';
import {
  hasOutstandingHostFunds,
  requiresAccountRetention,
} from '../src/utils/accountErasure.js';

test('account erasure requires the exact confirmation phrase', () => {
  assert.equal(accountDeletionSchema.safeParse({ confirm: 'DELETE' }).success, true);
  assert.equal(accountDeletionSchema.safeParse({ confirm: 'delete' }).success, false);
  assert.equal(accountDeletionSchema.safeParse({}).success, false);
});

test('staff erasure requires an audit reason', () => {
  assert.equal(
    adminAccountDeletionSchema.safeParse({ confirm: 'DELETE', reason: 'Requested by customer' }).success,
    true,
  );
  assert.equal(adminAccountDeletionSchema.safeParse({ confirm: 'DELETE', reason: '' }).success, false);
});

test('business relations select anonymisation instead of hard deletion', () => {
  assert.equal(requiresAccountRetention({ guestBookings: 0, properties: 0, payouts: 0, hasWallet: false }), false);
  assert.equal(requiresAccountRetention({ guestBookings: 1, properties: 0, payouts: 0, hasWallet: false }), true);
  assert.equal(requiresAccountRetention({ guestBookings: 0, properties: 1, payouts: 0, hasWallet: false }), true);
  assert.equal(requiresAccountRetention({ guestBookings: 0, properties: 0, payouts: 1, hasWallet: false }), true);
  assert.equal(requiresAccountRetention({ guestBookings: 0, properties: 0, payouts: 0, hasWallet: true }), true);
});

test('positive wallet balances and in-flight payouts block erasure', () => {
  assert.equal(hasOutstandingHostFunds({ walletBalance: 1, payoutStatuses: [] }), true);
  assert.equal(hasOutstandingHostFunds({ walletBalance: 0, payoutStatuses: ['PENDING'] }), true);
  assert.equal(hasOutstandingHostFunds({ walletBalance: 0, payoutStatuses: ['PROCESSING'] }), true);
  assert.equal(hasOutstandingHostFunds({ walletBalance: 0, payoutStatuses: ['SUCCESS'] }), false);
});
