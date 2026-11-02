/**
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/host-application.patch.test.ts
 *
 * The applicant's save must leave the M-PESA number in the exact local format
 * approval copies into a Paystack transfer recipient. Before this rule a
 * plausible-looking number survived the save and only failed at approval, which
 * is an admin's problem by then and no longer something the applicant can fix.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildApplicantPatch } from '../src/services/host-application.service.js';
import { ValidationError } from '../src/types/index.js';

test('an international M-PESA number is stored in the local 10-digit form', () => {
  assert.equal(buildApplicantPatch({ payoutMpesaPhone: '+254 712 345 678' }).payoutMpesaPhone, '0712345678');
  assert.equal(buildApplicantPatch({ payoutMpesaPhone: '254712345678' }).payoutMpesaPhone, '0712345678');
});

test('separators and spacing in a local number are stripped', () => {
  assert.equal(buildApplicantPatch({ payoutMpesaPhone: '0712-345-678' }).payoutMpesaPhone, '0712345678');
  assert.equal(buildApplicantPatch({ payoutMpesaPhone: ' 0712 345 678 ' }).payoutMpesaPhone, '0712345678');
});

test('a number approval would reject is refused at save time', () => {
  for (const bad of ['12345', '0812345678', '07123456789', 'not a number']) {
    assert.throws(
      () => buildApplicantPatch({ payoutMpesaPhone: bad }),
      ValidationError,
      `${bad} should not save`,
    );
  }
});

test('clearing the payout number stores null instead of an empty string', () => {
  assert.equal(buildApplicantPatch({ payoutMpesaPhone: '   ' }).payoutMpesaPhone, null);
  assert.equal(buildApplicantPatch({ payoutMpesaPhone: null }).payoutMpesaPhone, null);
});

test('fields outside the applicant whitelist never reach the database patch', () => {
  const patch = buildApplicantPatch({
    legalName: 'Anne Ochieng',
    status: 'APPROVED',
    reviewedBy: 'someone-else',
    userId: 'another-user',
  });
  assert.deepEqual(patch, { legalName: 'Anne Ochieng' });
});

test('property types are serialised under their stored column', () => {
  const patch = buildApplicantPatch({ propertyTypes: ['apartment', 'studio'] });
  assert.equal(patch.propertyTypesJson, '["apartment","studio"]');
  assert.equal(patch.propertyTypes, undefined);
});

test('a reply to a request for information is saved as typed', () => {
  const patch = buildApplicantPatch({ applicantResponse: 'Sending a clearer KRA certificate.' });
  assert.equal(patch.applicantResponse, 'Sending a clearer KRA certificate.');
});

test('an absent field is left untouched rather than cleared', () => {
  assert.deepEqual(buildApplicantPatch({}), {});
  assert.deepEqual(buildApplicantPatch({ payoutMpesaPhone: undefined }), {});
});
