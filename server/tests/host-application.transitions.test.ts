/**
 * Pure state-machine tests for the host-application lifecycle. No database is
 * touched - these exercise the exported transition helpers that every DB-facing
 * service function delegates to.
 *
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/host-application.transitions.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import {
  isEditable,
  assertEditable,
  missingRequiredFields,
  missingRequiredDocuments,
  assertSubmittable,
  planApproval,
  assertCanRequestChanges,
  assertCanReject,
  toApplicantView,
  toAdminView,
  REQUIRED_APPLICANT_FIELDS,
  HOST_APPLICATION_STATUSES,
} from '../src/services/host-application.service.js';
import { userRoleSchema } from '../src/types/index.js';

const COMPLETE = {
  legalName: 'Jane Wanjiku Doe',
  businessName: 'Skyline Stays',
  businessType: 'company',
  contactPhone: '+254700000000',
  contactEmail: 'host@example.com',
  dateOfBirth: '1990-01-01',
  nationality: 'Kenyan',
  identityType: 'NATIONAL_ID',
  kraPin: 'A123456789B',
  companyRegistrationNo: 'CPR-12345',
  city: 'Nairobi',
  propertyCount: 3,
  propertyRelationship: 'OWNER',
  propertyTypes: ['apartment'],
  propertyLocations: 'Kilimani, Nairobi',
  yearsHosting: 0,
  preferredPayoutMethod: 'mpesa',
  experience: 'Managed 3 units on other platforms',
  agreedTerms: true,
};

const COMPLETE_DOCUMENTS = ['IDENTITY_FRONT', 'IDENTITY_BACK', 'PROPERTY_AUTHORITY', 'BUSINESS_REGISTRATION'];

// ---- Editability ----

test('DRAFT and CHANGES_REQUESTED are editable; others are not', () => {
  assert.equal(isEditable('DRAFT'), true);
  assert.equal(isEditable('CHANGES_REQUESTED'), true);
  for (const status of ['SUBMITTED', 'APPROVED', 'REJECTED']) {
    assert.equal(isEditable(status), false, `${status} must not be editable`);
    assert.throws(() => assertEditable(status), /no longer be edited/i);
  }
});

// ---- Required-field completeness ----

test('a fully completed application has no missing required fields', () => {
  assert.deepEqual(missingRequiredFields(COMPLETE), []);
});

test('every required field is individually detected when missing or blank', () => {
  for (const field of REQUIRED_APPLICANT_FIELDS) {
    const blank = field === 'propertyCount' ? 0 : '   ';
    const app = { ...COMPLETE, [field]: blank };
    assert.deepEqual(missingRequiredFields(app), [field], `${field} should be flagged`);
  }
});

test('null and undefined required fields are treated as missing', () => {
  assert.deepEqual(missingRequiredFields({ ...COMPLETE, city: null }), ['city']);
  assert.deepEqual(missingRequiredFields({ ...COMPLETE, businessName: undefined }), ['businessName']);
});

test('propertyCount must be a positive integer to count as present', () => {
  assert.deepEqual(missingRequiredFields({ ...COMPLETE, propertyCount: -1 }), ['propertyCount']);
});

// ---- Submission ----

test('a complete editable application may be submitted', () => {
  assert.doesNotThrow(() => assertSubmittable({ ...COMPLETE, status: 'DRAFT' }, COMPLETE_DOCUMENTS));
  assert.doesNotThrow(() => assertSubmittable({ ...COMPLETE, status: 'CHANGES_REQUESTED' }, COMPLETE_DOCUMENTS));
});

test('an incomplete application cannot be submitted', () => {
  assert.throws(
    () => assertSubmittable({ ...COMPLETE, status: 'DRAFT', contactEmail: '' }, COMPLETE_DOCUMENTS),
    /complete all required fields/i,
  );
});

test('required verification documents depend on identity and business type', () => {
  assert.deepEqual(missingRequiredDocuments(COMPLETE, COMPLETE_DOCUMENTS), []);
  assert.deepEqual(missingRequiredDocuments(COMPLETE, ['IDENTITY_FRONT']), ['PROPERTY_AUTHORITY', 'IDENTITY_BACK', 'BUSINESS_REGISTRATION']);
  assert.deepEqual(
    missingRequiredDocuments({ ...COMPLETE, identityType: 'PASSPORT', businessType: 'individual' }, ['IDENTITY_FRONT', 'PROPERTY_AUTHORITY']),
    [],
  );
});

test('a complete application in a non-editable status cannot be submitted', () => {
  assert.throws(() => assertSubmittable({ ...COMPLETE, status: 'SUBMITTED' }, COMPLETE_DOCUMENTS), /no longer be edited/i);
  assert.throws(() => assertSubmittable({ ...COMPLETE, status: 'APPROVED' }, COMPLETE_DOCUMENTS), /no longer be edited/i);
});

// ---- Approval ----

test('only a SUBMITTED application applies an approval', () => {
  assert.equal(planApproval('SUBMITTED'), 'APPLY');
});

test('approving an already-APPROVED application is idempotent, not an error', () => {
  assert.equal(planApproval('APPROVED'), 'IDEMPOTENT');
});

test('approval from any non-submitted, non-approved status is rejected', () => {
  for (const status of ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED']) {
    assert.throws(() => planApproval(status), /only a submitted application can be approved/i, status);
  }
});

// ---- Request changes / reject ----

test('changes can only be requested on a SUBMITTED application', () => {
  assert.doesNotThrow(() => assertCanRequestChanges('SUBMITTED'));
  for (const status of ['DRAFT', 'CHANGES_REQUESTED', 'APPROVED', 'REJECTED']) {
    assert.throws(() => assertCanRequestChanges(status), /submitted application/i, status);
  }
});

test('rejection is allowed while under review (SUBMITTED or CHANGES_REQUESTED)', () => {
  assert.doesNotThrow(() => assertCanReject('SUBMITTED'));
  assert.doesNotThrow(() => assertCanReject('CHANGES_REQUESTED'));
  for (const status of ['DRAFT', 'APPROVED', 'REJECTED']) {
    assert.throws(() => assertCanReject(status), /under review/i, status);
  }
});

// ---- Serialization ----

test('the applicant view exposes the applicant note but never the reviewer identity', () => {
  const row = {
    id: 'app-1',
    userId: 'user-1',
    status: 'CHANGES_REQUESTED',
    ...COMPLETE,
    reviewNote: 'Please add a working phone number',
    reviewedBy: 'admin-9',
    submittedAt: new Date('2026-08-01'),
    reviewedAt: new Date('2026-08-02'),
    createdAt: new Date('2026-07-30'),
    updatedAt: new Date('2026-08-02'),
  };
  const view = toApplicantView(row) as Record<string, unknown>;
  assert.equal(view.reviewNote, 'Please add a working phone number');
  assert.ok(!('reviewedBy' in view), 'applicant view must not leak reviewedBy');
  assert.ok(!('userId' in view), 'applicant view must not leak userId');
});

test('the admin view includes reviewer identity and applicant summary', () => {
  const row = {
    id: 'app-1',
    userId: 'user-1',
    status: 'SUBMITTED',
    ...COMPLETE,
    reviewedBy: 'admin-9',
    createdAt: new Date(),
    updatedAt: new Date(),
    user: { id: 'user-1', email: 'a@b.com', firstName: 'A', lastName: 'B', role: 'USER', suspended: false },
  };
  const view = toAdminView(row) as any;
  assert.equal(view.reviewedBy, 'admin-9');
  assert.equal(view.userId, 'user-1');
  assert.equal(view.user.email, 'a@b.com');
});

test('the lifecycle enumerates exactly the five expected statuses', () => {
  assert.deepEqual(HOST_APPLICATION_STATUSES, [
    'DRAFT',
    'SUBMITTED',
    'CHANGES_REQUESTED',
    'APPROVED',
    'REJECTED',
  ]);
});

test('the generic admin role editor cannot bypass host application approval', () => {
  assert.equal(userRoleSchema.safeParse({ role: 'USER' }).success, true);
  assert.equal(userRoleSchema.safeParse({ role: 'ADMIN' }).success, true);
  assert.equal(userRoleSchema.safeParse({ role: 'HOST' }).success, false);
});
