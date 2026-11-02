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
  planStatusChange,
  isAdminSettableStatus,
  ADMIN_SETTABLE_STATUSES,
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
  payoutMpesaPhone: '0712345678',
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

test('the chosen payout method decides which destination details are required', () => {
  const bank = {
    ...COMPLETE,
    preferredPayoutMethod: 'bank',
    payoutBankName: 'Equity Bank',
    payoutBankCode: '068',
    payoutBankAccountNo: '0123456789',
    payoutMpesaPhone: '',
  };
  assert.deepEqual(missingRequiredFields(bank), []);
  assert.deepEqual(
    missingRequiredFields({ ...bank, payoutBankAccountNo: '' }),
    ['payoutBankAccountNo'],
  );

  // An M-PESA host is not asked for bank details, and vice versa.
  assert.deepEqual(missingRequiredFields({ ...COMPLETE, payoutMpesaPhone: '' }), ['payoutMpesaPhone']);
  assert.deepEqual(missingRequiredFields(bank).includes('payoutMpesaPhone'), false);
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

// A case held under investigation is still a case a reviewer decides on; making
// them reopen it first would be a click that changes nothing.
test('an application under investigation can be approved directly', () => {
  assert.equal(planApproval('UNDER_INVESTIGATION'), 'APPLY');
});

// Restoring a suspended verification is an approval, not a resubmission: the
// documents that earned it are still on file.
test('a suspended verification can be restored by approving it again', () => {
  assert.equal(planApproval('SUSPENDED'), 'APPLY');
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

test('changes can be requested on a SUBMITTED application or on a verified one', () => {
  assert.doesNotThrow(() => assertCanRequestChanges('SUBMITTED'));
  // A verified host can still be asked for more information; requesting it never
  // touches User.role, so their dashboard keeps working while they resubmit.
  assert.doesNotThrow(() => assertCanRequestChanges('APPROVED'));
  assert.doesNotThrow(() => assertCanRequestChanges('UNDER_INVESTIGATION'));
  assert.doesNotThrow(() => assertCanRequestChanges('SUSPENDED'));
  for (const status of ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED']) {
    assert.throws(() => assertCanRequestChanges(status), /submitted, suspended or verified application/i, status);
  }
});

test('rejection is allowed while under review and after approval', () => {
  assert.doesNotThrow(() => assertCanReject('SUBMITTED'));
  assert.doesNotThrow(() => assertCanReject('UNDER_INVESTIGATION'));
  assert.doesNotThrow(() => assertCanReject('CHANGES_REQUESTED'));
  assert.doesNotThrow(() => assertCanReject('APPROVED'));
  assert.doesNotThrow(() => assertCanReject('SUSPENDED'));
  for (const status of ['DRAFT', 'REJECTED']) {
    assert.throws(() => assertCanReject(status), /under review or an approved one/i, status);
  }
});

// ---- Admin status change on a decided application ----

test('an admin may move a decided application back into review, under investigation or suspended', () => {
  assert.equal(planStatusChange('APPROVED', 'SUBMITTED'), 'APPLY');
  assert.equal(planStatusChange('APPROVED', 'UNDER_INVESTIGATION'), 'APPLY');
  assert.equal(planStatusChange('APPROVED', 'SUSPENDED'), 'APPLY');
  // A case can be moved out of investigation back into the queue, or held under
  // investigation while it is still waiting for a first decision, without the
  // host submitting anything again. The three admin states move freely between
  // each other: an investigation that concludes can be suspended, and a
  // suspension that is lifted can go back into review.
  assert.equal(planStatusChange('UNDER_INVESTIGATION', 'SUBMITTED'), 'APPLY');
  assert.equal(planStatusChange('SUBMITTED', 'UNDER_INVESTIGATION'), 'APPLY');
  assert.equal(planStatusChange('UNDER_INVESTIGATION', 'SUSPENDED'), 'APPLY');
  assert.equal(planStatusChange('SUSPENDED', 'UNDER_INVESTIGATION'), 'APPLY');
  assert.equal(planStatusChange('SUSPENDED', 'SUBMITTED'), 'APPLY');
});

test('setting the status an application already has is a no-op, not a second notice', () => {
  assert.equal(planStatusChange('UNDER_INVESTIGATION', 'UNDER_INVESTIGATION'), 'IDEMPOTENT');
  assert.equal(planStatusChange('SUBMITTED', 'SUBMITTED'), 'IDEMPOTENT');
  assert.equal(planStatusChange('SUSPENDED', 'SUSPENDED'), 'IDEMPOTENT');
});

test('an application still with the applicant, or already closed, cannot be pulled into review', () => {
  for (const status of ['DRAFT', 'CHANGES_REQUESTED', 'REJECTED']) {
    assert.throws(() => planStatusChange(status, 'SUBMITTED'), /cannot be moved to review/i, status);
    // The same holds for suspension: a closed case is reopened by the applicant
    // submitting again, not by an admin moving it sideways.
    assert.throws(() => planStatusChange(status, 'SUSPENDED'), /cannot be moved to review/i, status);
  }
});

test('the status endpoint can only set the three states an admin controls', () => {
  for (const target of ['APPROVED', 'REJECTED', 'CHANGES_REQUESTED', 'DRAFT']) {
    assert.equal(isAdminSettableStatus(target), false, `${target} must not be settable here`);
    assert.throws(() => planStatusChange('APPROVED', target), /moved back into review, placed under investigation or suspended/i, target);
  }
  for (const target of ADMIN_SETTABLE_STATUSES) {
    assert.equal(isAdminSettableStatus(target), true);
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

test('the lifecycle enumerates exactly the seven expected statuses', () => {
  assert.deepEqual(HOST_APPLICATION_STATUSES, [
    'DRAFT',
    'SUBMITTED',
    'UNDER_INVESTIGATION',
    'SUSPENDED',
    'CHANGES_REQUESTED',
    'APPROVED',
    'REJECTED',
  ]);
});

test('the generic admin role editor cannot grant HOST or ADMIN', () => {
  assert.equal(userRoleSchema.safeParse({ role: 'USER' }).success, true);
  assert.equal(userRoleSchema.safeParse({ role: 'ADMIN' }).success, false);
  assert.equal(userRoleSchema.safeParse({ role: 'HOST' }).success, false);
});
