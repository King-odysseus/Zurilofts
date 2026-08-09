import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../types/index.js';

// ============================================================
// Host application lifecycle - pure transition logic
// ------------------------------------------------------------
// These helpers touch no database and hold the entire state machine, so the
// authorization/state rules can be unit-tested in isolation (see
// tests/host-application.transitions.test.ts). The DB-facing service functions
// below delegate every decision to them.
// ============================================================

export type HostApplicationStatus =
  | 'DRAFT'
  | 'SUBMITTED'
  | 'CHANGES_REQUESTED'
  | 'APPROVED'
  | 'REJECTED';

export const HOST_APPLICATION_STATUSES: HostApplicationStatus[] = [
  'DRAFT',
  'SUBMITTED',
  'CHANGES_REQUESTED',
  'APPROVED',
  'REJECTED',
];

// Statuses where the applicant may still edit and (re)submit their draft.
export const EDITABLE_STATUSES: HostApplicationStatus[] = ['DRAFT', 'CHANGES_REQUESTED'];

// Applicant-entered fields that must be present before an application may be
// submitted for review.
export const REQUIRED_APPLICANT_FIELDS = [
  'businessName',
  'businessType',
  'contactPhone',
  'contactEmail',
  'city',
  'propertyCount',
] as const;

// Fields the applicant is allowed to write. Anything else (status, userId,
// reviewedBy, timestamps) is owned by the state machine, never the client.
export const EDITABLE_APPLICANT_FIELDS = [
  'businessName',
  'businessType',
  'contactPhone',
  'contactEmail',
  'city',
  'propertyCount',
  'experience',
] as const;

export interface ApplicantFields {
  businessName?: string | null;
  businessType?: string | null;
  contactPhone?: string | null;
  contactEmail?: string | null;
  city?: string | null;
  propertyCount?: number | null;
  experience?: string | null;
}

export function isEditable(status: string): boolean {
  return (EDITABLE_STATUSES as string[]).includes(status);
}

/** Throw unless the application is in a status the applicant may edit. */
export function assertEditable(status: string): void {
  if (!isEditable(status)) {
    throw new ValidationError(
      `This application can no longer be edited (status: ${status}).`,
    );
  }
}

/** Names of the required fields still missing/blank on an application. */
export function missingRequiredFields(app: ApplicantFields): string[] {
  return REQUIRED_APPLICANT_FIELDS.filter((field) => {
    const value = (app as Record<string, unknown>)[field];
    if (value === null || value === undefined) return true;
    if (typeof value === 'string') return value.trim() === '';
    if (typeof value === 'number') return !(value > 0);
    return false;
  });
}

/**
 * Assert an application may be submitted: it must be in an editable status and
 * have every required field completed. Returns nothing; throws otherwise.
 */
export function assertSubmittable(app: ApplicantFields & { status: string }): void {
  assertEditable(app.status);
  const missing = missingRequiredFields(app);
  if (missing.length > 0) {
    throw new ValidationError(`Please complete all required fields: ${missing.join(', ')}.`);
  }
}

/**
 * Decide how an approval should be applied.
 *  - 'APPLY'      -> a SUBMITTED application becomes APPROVED and grants HOST.
 *  - 'IDEMPOTENT' -> already APPROVED; repeat calls are a safe no-op that must
 *                    NOT re-grant or change any permission.
 * Any other status is an invalid transition and throws.
 */
export function planApproval(status: string): 'APPLY' | 'IDEMPOTENT' {
  if (status === 'APPROVED') return 'IDEMPOTENT';
  if (status === 'SUBMITTED') return 'APPLY';
  throw new ValidationError(`Only a submitted application can be approved (status: ${status}).`);
}

/** Request-changes is only valid on a submitted application. */
export function assertCanRequestChanges(status: string): void {
  if (status !== 'SUBMITTED') {
    throw new ValidationError(
      `Changes can only be requested on a submitted application (status: ${status}).`,
    );
  }
}

/** Rejection is valid while the application is under review with the admin. */
export function assertCanReject(status: string): void {
  if (status !== 'SUBMITTED' && status !== 'CHANGES_REQUESTED') {
    throw new ValidationError(
      `Only an application under review can be rejected (status: ${status}).`,
    );
  }
}

// ============================================================
// Serialization
// ============================================================

// Applicant view: everything the applicant entered plus the applicant-visible
// reviewer note. The reviewer's identity (reviewedBy) is intentionally omitted.
export function toApplicantView(app: any) {
  if (!app) return null;
  return {
    id: app.id,
    status: app.status,
    businessName: app.businessName ?? null,
    businessType: app.businessType ?? null,
    contactPhone: app.contactPhone ?? null,
    contactEmail: app.contactEmail ?? null,
    city: app.city ?? null,
    propertyCount: app.propertyCount ?? null,
    experience: app.experience ?? null,
    reviewNote: app.reviewNote ?? null,
    submittedAt: app.submittedAt ?? null,
    reviewedAt: app.reviewedAt ?? null,
    createdAt: app.createdAt,
    updatedAt: app.updatedAt,
  };
}

// Admin view: the applicant view plus reviewer audit identity and a light
// applicant summary for the review queue.
export function toAdminView(app: any) {
  if (!app) return null;
  return {
    ...toApplicantView(app),
    userId: app.userId,
    reviewedBy: app.reviewedBy ?? null,
    user: app.user
      ? {
          id: app.user.id,
          email: app.user.email,
          firstName: app.user.firstName,
          lastName: app.user.lastName,
          role: app.user.role,
          suspended: app.user.suspended,
        }
      : undefined,
  };
}

// ============================================================
// Applicant service functions - userId always comes from the JWT
// ============================================================

// Suspended users may not use any applicant action. A suspended user cannot
// even refresh, but access tokens live up to 15m, so we re-check here.
async function loadActiveUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  if (user.suspended) {
    throw new ForbiddenError('This account has been suspended. Please contact support.');
  }
  return user;
}

/** Get the caller's own application, or null if they have none. */
export async function getOwnApplication(userId: string) {
  const app = await prisma.hostApplication.findUnique({ where: { userId } });
  return toApplicantView(app);
}

/**
 * Ensure the caller has a draft application to fill in. Idempotent: returns the
 * existing application when one already exists (the unique userId relation
 * prevents duplicates). An already-approved host, or an admin, does not need one.
 */
export async function ensureDraft(userId: string) {
  const user = await loadActiveUser(userId);

  const existing = await prisma.hostApplication.findUnique({ where: { userId } });
  if (existing) return toApplicantView(existing);

  if (user.role !== 'USER') {
    throw new ConflictError('Your account is already elevated; no host application is needed.');
  }

  const created = await prisma.hostApplication.create({
    data: { userId, status: 'DRAFT' },
  });
  return toApplicantView(created);
}

/** Update the caller's editable fields while the application is DRAFT/CHANGES_REQUESTED. */
export async function updateDraft(userId: string, data: ApplicantFields) {
  await loadActiveUser(userId);

  const app = await prisma.hostApplication.findUnique({ where: { userId } });
  if (!app) throw new NotFoundError('Host application');
  assertEditable(app.status);

  // Whitelist: only ever persist editable applicant fields.
  const patch: Record<string, unknown> = {};
  for (const field of EDITABLE_APPLICANT_FIELDS) {
    if (data[field] !== undefined) patch[field] = data[field];
  }

  const updated = await prisma.hostApplication.update({
    where: { userId },
    data: patch,
  });
  return toApplicantView(updated);
}

/** Submit the caller's application for review once all required fields are complete. */
export async function submitApplication(userId: string) {
  await loadActiveUser(userId);

  const app = await prisma.hostApplication.findUnique({ where: { userId } });
  if (!app) throw new NotFoundError('Host application');
  assertSubmittable(app);

  const updated = await prisma.hostApplication.update({
    where: { userId },
    // Clear any stale reviewer note now that a fresh review begins.
    data: { status: 'SUBMITTED', submittedAt: new Date(), reviewNote: null },
  });
  return toApplicantView(updated);
}

// ============================================================
// Admin service functions - reachable only through requireAdmin routes
// ============================================================

const ADMIN_APPLICATION_INCLUDE = {
  user: {
    select: { id: true, email: true, firstName: true, lastName: true, role: true, suspended: true },
  },
} as const;

export async function adminListApplications(filters: {
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

  const where: any = {};
  if (filters.status && (HOST_APPLICATION_STATUSES as string[]).includes(filters.status)) {
    where.status = filters.status;
  }
  if (filters.search) {
    where.OR = [
      { businessName: { contains: filters.search } },
      { contactEmail: { contains: filters.search } },
      { user: { email: { contains: filters.search } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.hostApplication.findMany({
      where,
      include: ADMIN_APPLICATION_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.hostApplication.count({ where }),
  ]);

  return {
    data: rows.map(toAdminView),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function adminGetApplication(id: string) {
  const app = await prisma.hostApplication.findUnique({
    where: { id },
    include: ADMIN_APPLICATION_INCLUDE,
  });
  if (!app) throw new NotFoundError('Host application');
  return toAdminView(app);
}

export async function adminRequestChanges(id: string, reviewerId: string, reason: string) {
  const app = await prisma.hostApplication.findUnique({ where: { id } });
  if (!app) throw new NotFoundError('Host application');
  assertCanRequestChanges(app.status);

  const updated = await prisma.hostApplication.update({
    where: { id },
    data: {
      status: 'CHANGES_REQUESTED',
      reviewNote: reason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    include: ADMIN_APPLICATION_INCLUDE,
  });
  // Never touches User.role.
  return toAdminView(updated);
}

export async function adminReject(id: string, reviewerId: string, reason: string) {
  const app = await prisma.hostApplication.findUnique({ where: { id } });
  if (!app) throw new NotFoundError('Host application');
  assertCanReject(app.status);

  const updated = await prisma.hostApplication.update({
    where: { id },
    data: {
      status: 'REJECTED',
      reviewNote: reason,
      reviewedBy: reviewerId,
      reviewedAt: new Date(),
    },
    include: ADMIN_APPLICATION_INCLUDE,
  });
  // Never touches User.role.
  return toAdminView(updated);
}

/**
 * Approve an application: atomically flip it to APPROVED and grant the applicant
 * the HOST role. Idempotent - a repeat call on an already-APPROVED application
 * is a no-op that does not change any role. A suspended applicant cannot be
 * approved into HOST. An ADMIN applicant keeps ADMIN (never demoted to HOST).
 *
 * Note on existing sessions: this only changes the DB role. Any access token the
 * applicant already holds still carries USER and stays least-privileged until it
 * expires (<=15m); the new HOST role takes effect once they re-login or refresh.
 * Privilege is therefore never granted from stale client state.
 */
export async function adminApprove(id: string, reviewerId: string) {
  return prisma.$transaction(async (tx) => {
    // Re-read both application and user inside the transaction so approval is
    // based on the state being promoted, not a stale pre-transaction snapshot.
    const app = await tx.hostApplication.findUnique({
      where: { id },
      include: ADMIN_APPLICATION_INCLUDE,
    });
    if (!app) throw new NotFoundError('Host application');

    const plan = planApproval(app.status);
    if (plan === 'IDEMPOTENT') return toAdminView(app);

    if (app.user.suspended) {
      throw new ForbiddenError('A suspended applicant cannot be approved as a host.');
    }

    // Only promote a plain USER. An ADMIN applicant remains ADMIN. The
    // suspended:false predicate closes the race where suspension happens after
    // the read but before the role update; throwing rolls back the whole approval.
    const nextRole = app.user.role === 'USER' ? 'HOST' : app.user.role;
    const promoted = await tx.user.updateMany({
      where: { id: app.userId, suspended: false },
      data: { role: nextRole as any },
    });
    if (promoted.count !== 1) {
      throw new ForbiddenError('A suspended applicant cannot be approved as a host.');
    }

    const updated = await tx.hostApplication.update({
      where: { id },
      data: {
        status: 'APPROVED',
        reviewedBy: reviewerId,
        reviewedAt: new Date(),
        reviewNote: null,
      },
      include: ADMIN_APPLICATION_INCLUDE,
    });
    return toAdminView(updated);
  });
}
