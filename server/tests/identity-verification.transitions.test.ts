/**
 * Pure state-machine tests for guest identity verification. No database is
 * touched - these exercise the exported transition helpers that every
 * DB-facing service function (and the booking payment gate) delegates to.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/identity-verification.transitions.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isEditable,
  assertEditable,
  missingRequiredFields,
  missingRequiredDocuments,
  assertSubmittable,
  assertCanReject,
  planApproval,
  isApprovedForPayment,
  assertIdentityDocumentKind,
  IDENTITY_DOCUMENT_KINDS,
} from '../src/services/identity-verification.service.js';

const COMPLETE = {
  fullName: 'Jane Wanjiku',
  dateOfBirth: '1995-05-05',
  idType: 'NATIONAL_ID',
  idNumber: '12345678',
};

const COMPLETE_DOCUMENTS = ['ID_FRONT', 'SELFIE'];

// ---- Editability ----

test('UNVERIFIED and REJECTED are editable; SUBMITTED and APPROVED are not', () => {
  assert.equal(isEditable('UNVERIFIED'), true);
  assert.equal(isEditable('REJECTED'), true);
  for (const status of ['SUBMITTED', 'APPROVED']) {
    assert.equal(isEditable(status), false, `${status} must not be editable`);
    assert.throws(() => assertEditable(status), /no longer be edited/i);
  }
});

// ---- Required-field / document completeness ----

test('a fully completed verification has no missing required fields', () => {
  assert.deepEqual(missingRequiredFields(COMPLETE), []);
});

test('a blank or missing required field is individually detected', () => {
  assert.deepEqual(missingRequiredFields({ ...COMPLETE, fullName: '  ' }), ['fullName']);
  assert.deepEqual(missingRequiredFields({ ...COMPLETE, idNumber: undefined }), ['idNumber']);
});

test('missing required documents are detected; SELFIE and ID_FRONT are required, ID_BACK is not', () => {
  assert.deepEqual(missingRequiredDocuments([]), ['ID_FRONT', 'SELFIE']);
  assert.deepEqual(missingRequiredDocuments(['ID_FRONT']), ['SELFIE']);
  assert.deepEqual(missingRequiredDocuments(COMPLETE_DOCUMENTS), []);
  assert.deepEqual(missingRequiredDocuments(['ID_BACK']), ['ID_FRONT', 'SELFIE']);
});

test('assertSubmittable requires an editable status, complete fields, and complete documents', () => {
  assert.doesNotThrow(() => assertSubmittable({ ...COMPLETE, status: 'UNVERIFIED' }, COMPLETE_DOCUMENTS));
  assert.throws(() => assertSubmittable({ ...COMPLETE, status: 'SUBMITTED' }, COMPLETE_DOCUMENTS), /no longer be edited/i);
  assert.throws(() => assertSubmittable({ ...COMPLETE, fullName: '', status: 'UNVERIFIED' }, COMPLETE_DOCUMENTS), /complete all required fields/i);
  assert.throws(() => assertSubmittable({ ...COMPLETE, status: 'UNVERIFIED' }, []), /upload all required documents/i);
});

// ---- Admin actions ----

test('only a SUBMITTED verification can be rejected', () => {
  assert.doesNotThrow(() => assertCanReject('SUBMITTED'));
  for (const status of ['UNVERIFIED', 'APPROVED', 'REJECTED']) {
    assert.throws(() => assertCanReject(status), /submitted verification can be rejected/i);
  }
});

test('approval applies to SUBMITTED, is idempotent on APPROVED, and rejects everything else', () => {
  assert.equal(planApproval('SUBMITTED'), 'APPLY');
  assert.equal(planApproval('APPROVED'), 'IDEMPOTENT');
  for (const status of ['UNVERIFIED', 'REJECTED']) {
    assert.throws(() => planApproval(status), /submitted verification can be approved/i);
  }
});

// ---- Payment gate ----

test('only APPROVED unlocks payment - every other status, including null/undefined, is blocked', () => {
  assert.equal(isApprovedForPayment('APPROVED'), true);
  for (const status of ['UNVERIFIED', 'SUBMITTED', 'REJECTED', null, undefined]) {
    assert.equal(isApprovedForPayment(status), false, `${status} must not unlock payment`);
  }
});

// ---- Document kinds ----

test('only the three declared document kinds are accepted', () => {
  for (const kind of IDENTITY_DOCUMENT_KINDS) {
    assert.doesNotThrow(() => assertIdentityDocumentKind(kind));
  }
  assert.throws(() => assertIdentityDocumentKind('PASSPORT_SCAN'), /invalid identity document type/i);
});
