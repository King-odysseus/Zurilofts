/**
 * Behaviour tests for the guest-facing payment record.
 *
 * A receipt is evidence, so these pin the things that make it evidence: a
 * document is only called a RECEIPT once money was actually collected, the
 * lines add up to the amount charged, the reference for one booking never
 * changes, and no commercial internal (commission, host payout) can reach the
 * guest's copy.
 *
 * Run from server/:
 *   node --import tsx --test tests/receipt.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildReceipt, receiptNumberFor, type ReceiptBooking } from '../src/services/receipt.service.js';
import { company } from '../src/config/company.js';

const BOOKING_ID = 'cm3k9x1a0000abcd';

/**
 * A paid, confirmed three-night stay: 3 x KES 5,100 accommodation plus the
 * cleaning fee and the processor's 2.9% collection fee, which the guest pays
 * and which is already inside `total`.
 */
function confirmedBooking(overrides: Partial<ReceiptBooking> = {}): ReceiptBooking {
  return {
    id: BOOKING_ID,
    checkIn: new Date('2026-11-10T00:00:00.000Z'),
    checkOut: new Date('2026-11-13T00:00:00.000Z'),
    guests: 2,
    bedOption: '1bed',
    status: 'CONFIRMED',
    paymentReference: 'T8439201KD',
    paymentChannel: 'card',
    paymentGateway: 'paystack',
    paidAt: new Date('2026-11-01T09:30:00.000Z'),
    refundStatus: null,
    createdAt: new Date('2026-10-30T08:00:00.000Z'),
    total: 17370,
    subtotal: 15300,
    cleaningFee: 1500,
    serviceFee: 0,
    lateCheckoutFee: 0,
    discountAmount: 0,
    addOnsTotal: 0,
    paymentFee: 570,
    property: { title: 'Kilimani One Bedroom', location: 'Kilimani, Nairobi' },
    addOns: [],
    ...overrides,
  };
}

test('a paid, confirmed booking is a receipt', () => {
  const receipt = buildReceipt(confirmedBooking());

  assert.equal(receipt.isReceipt, true);
  assert.equal(receipt.documentTitle, 'RECEIPT');
  assert.equal(receipt.status, 'CONFIRMED');
  assert.equal(receipt.currency, 'KES');
  // What was collected, not what was merely quoted.
  assert.equal(receipt.totals.paidKes, 17370);
  assert.equal(receipt.totals.chargedKes, 17370);
  assert.equal(receipt.payment.paidAt, '2026-11-01T09:30:00.000Z');
  // The receipt is dated by the payment, not by when the booking was created.
  assert.equal(receipt.issuedAt, '2026-11-01T09:30:00.000Z');
  assert.equal(receipt.stay.nights, 3);
});

test('a booking nobody has paid for is a summary, never a receipt', () => {
  const receipt = buildReceipt(
    confirmedBooking({
      status: 'PENDING',
      paidAt: null,
      paymentReference: null,
      paymentChannel: null,
      paymentGateway: null,
      paymentFee: 0,
      total: 16800,
    }),
  );

  assert.equal(receipt.isReceipt, false);
  assert.equal(receipt.documentTitle, 'BOOKING SUMMARY');
  assert.equal(receipt.totals.paidKes, 0);
  // Fall back to the creation date when there is no payment date to date it by.
  assert.equal(receipt.issuedAt, '2026-10-30T08:00:00.000Z');
  assert.equal(receipt.payment.paidAt, null);
});

test('a confirmed stay is receipted even if its payment date is missing', () => {
  // A booking is only CONFIRMED once the gateway confirms the money, so the
  // guest did pay: the document must not tell them nothing was received just
  // because the timestamp is absent.
  const receipt = buildReceipt(confirmedBooking({ paidAt: null }));

  assert.equal(receipt.isReceipt, true);
  assert.equal(receipt.documentTitle, 'RECEIPT');
  assert.equal(receipt.totals.paidKes, 17370);
});

test('a started checkout that never confirmed stays a booking summary', () => {
  // A gateway reference on a PENDING booking means the checkout was opened, not
  // finished. A receipt there would evidence a payment that never cleared.
  const receipt = buildReceipt(confirmedBooking({ status: 'PENDING', paidAt: null }));

  assert.equal(receipt.isReceipt, false);
  assert.equal(receipt.documentTitle, 'BOOKING SUMMARY');
  assert.equal(receipt.totals.paidKes, 0);
});

test('the lines add up to the amount charged when every component is present', () => {
  const receipt = buildReceipt(
    confirmedBooking({
      subtotal: 30000,
      cleaningFee: 1500,
      serviceFee: 1000,
      lateCheckoutFee: 2500,
      discountAmount: 3000,
      addOnsTotal: 2000,
      paymentFee: 1000,
      // 30000 + 1500 + 1000 + 2500 - 3000 + 2000 + 1000
      total: 35000,
      addOns: [{ quantity: 2, unitPrice: 1000, addOn: { name: 'Airport transfer' } }],
      bedOption: '2bed',
    }),
  );

  const lineSum = receipt.lines.reduce((sum, line) => sum + line.amountKes, 0);

  assert.equal(lineSum, 35000);
  assert.equal(receipt.totals.linesSumKes, 35000);
  assert.equal(receipt.totals.chargedKes, 35000);
  assert.equal(receipt.totals.chargedKes, lineSum);
  // A discount is money coming off, so it can only be a negative line.
  assert.equal(receipt.lines.find((line) => line.label === 'Discount')?.amountKes, -3000);
  assert.equal(receipt.lines.find((line) => line.label === 'Airport transfer x2')?.amountKes, 2000);
});

test('zero-value lines are left off the document', () => {
  const receipt = buildReceipt(confirmedBooking());
  const labels = receipt.lines.map((line) => line.label);

  assert.deepEqual(labels, ['Accommodation', 'Cleaning fee', 'Payment processing fee']);
});

test('a booking loaded without its add-ons shows the gap instead of inventing a total', () => {
  // A caller that forgets to include the addOns relation still produces a
  // document: the guest keeps their record, and the mismatch is visible in the
  // two numbers rather than being silently absorbed.
  const receipt = buildReceipt(
    confirmedBooking({ addOnsTotal: 2000, total: 19370, addOns: undefined }),
  );

  assert.equal(receipt.totals.chargedKes, 19370);
  assert.equal(receipt.totals.linesSumKes, 17370);
  assert.equal(receipt.totals.linesSumKes !== receipt.totals.chargedKes, true);
  // The record of what was collected is the stored total, not the line sum.
  assert.equal(receipt.totals.paidKes, 19370);
});

test('the receipt number is stable for one booking and differs between bookings', () => {
  const booking = confirmedBooking();
  const first = receiptNumberFor(booking);
  const second = receiptNumberFor(confirmedBooking());

  assert.equal(first, second);
  assert.equal(first, 'ZL-20261101-CM3K9X1A');
  // Same payment date, different booking: the id is what separates them, so a
  // guest and support never quote the same number for two different stays.
  assert.notEqual(first, receiptNumberFor(confirmedBooking({ id: 'cm3k9x1b1111efgh' })));
  // Built from the payment date when there is one.
  assert.equal(receiptNumberFor(confirmedBooking({ paidAt: null })), 'ZL-20261030-CM3K9X1A');
});

test('no VAT is stated while the platform is not VAT registered', () => {
  const receipt = buildReceipt(confirmedBooking());

  assert.equal(company.vatMode, 'none');
  assert.equal(receipt.totals.vatKes, null);
  assert.equal(receipt.issuer.vat.mode, 'none');
});

test('a refund status appears on the document', () => {
  const receipt = buildReceipt(confirmedBooking({ status: 'CANCELLED', refundStatus: 'REFUNDED' }));

  assert.deepEqual(receipt.refund, { status: 'REFUNDED' });
  // Nothing refunded on the normal case, so there is no refund line to misread.
  assert.equal(buildReceipt(confirmedBooking()).refund, null);
});

test('the host side of the money never reaches the guest document', () => {
  // A caller may hand over a full database row; only the guest's own figures
  // may survive into the receipt.
  const rowWithInternals = {
    ...confirmedBooking(),
    hostCommission: 1530,
    hostNetAmount: 12000,
    withholdingTax: 765,
    platformRevenue: 3000,
  };

  const serialised = JSON.stringify(buildReceipt(rowWithInternals));

  for (const internal of ['hostCommission', 'hostNetAmount', 'withholdingTax', 'platformRevenue']) {
    assert.equal(serialised.includes(internal), false);
  }
});
