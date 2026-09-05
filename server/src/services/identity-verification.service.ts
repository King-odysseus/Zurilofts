import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError } from '../types/index.js';
import {
  decryptHostDocument,
  detectHostDocumentMime,
  encryptHostDocument,
  safeDocumentName,
} from '../utils/hostDocumentCrypto.js';

// ============================================================
// Guest identity verification - gates payment on a booking, not dashboard or
// draft-listing access (that is HostApplication's job). Every account -
// guest, host, or both - may hold exactly one of these records.
// Lifecycle: "UNVERIFIED" | "SUBMITTED" | "APPROVED" | "REJECTED".
// ============================================================

export type IdentityVerificationStatus = 'UNVERIFIED' | 'SUBMITTED' | 'APPROVED' | 'REJECTED';

export const IDENTITY_DOCUMENT_KINDS = ['ID_FRONT', 'ID_BACK', 'SELFIE'] as const;
export type IdentityDocumentKind = (typeof IDENTITY_DOCUMENT_KINDS)[number];

export function assertIdentityDocumentKind(value: string): IdentityDocumentKind {
  if (!(IDENTITY_DOCUMENT_KINDS as readonly string[]).includes(value)) {
    throw new ValidationError('Invalid identity document type');
  }
  return value as IdentityDocumentKind;
}

const REQUIRED_FIELDS = ['fullName', 'dateOfBirth', 'idType', 'idNumber'] as const;
const REQUIRED_DOCUMENTS: IdentityDocumentKind[] = ['ID_FRONT', 'SELFIE'];

export interface VerificationFields {
  fullName?: string | null;
  dateOfBirth?: string | null;
  idType?: string | null;
  idNumber?: string | null;
}

export function isEditable(status: string): boolean {
  return status === 'UNVERIFIED' || status === 'REJECTED';
}

export function assertEditable(status: string): void {
  if (!isEditable(status)) {
    throw new ValidationError(`This verification can no longer be edited (status: ${status}).`);
  }
}

export function missingRequiredFields(app: VerificationFields): string[] {
  return REQUIRED_FIELDS.filter((field) => {
    const value = app[field];
    return value === null || value === undefined || value.trim() === '';
  });
}

export function missingRequiredDocuments(uploadedKinds: string[]): IdentityDocumentKind[] {
  return REQUIRED_DOCUMENTS.filter((kind) => !uploadedKinds.includes(kind));
}

export function assertSubmittable(app: VerificationFields & { status: string }, uploadedKinds: string[] = []): void {
  assertEditable(app.status);
  const missing = missingRequiredFields(app);
  if (missing.length > 0) {
    throw new ValidationError(`Please complete all required fields: ${missing.join(', ')}.`);
  }
  const missingDocs = missingRequiredDocuments(uploadedKinds);
  if (missingDocs.length > 0) {
    throw new ValidationError(`Please upload all required documents: ${missingDocs.join(', ')}.`);
  }
}

export function assertCanReject(status: string): void {
  if (status !== 'SUBMITTED') {
    throw new ValidationError(`Only a submitted verification can be rejected (status: ${status}).`);
  }
}

export function planApproval(status: string): 'APPLY' | 'IDEMPOTENT' {
  if (status === 'APPROVED') return 'IDEMPOTENT';
  if (status === 'SUBMITTED') return 'APPLY';
  throw new ValidationError(`Only a submitted verification can be approved (status: ${status}).`);
}

const DOCUMENT_METADATA_SELECT = {
  id: true,
  kind: true,
  originalName: true,
  mimeType: true,
  size: true,
  createdAt: true,
  updatedAt: true,
} as const;

function toDocumentMetadata(document: any) {
  return {
    id: document.id,
    kind: document.kind,
    originalName: document.originalName,
    mimeType: document.mimeType,
    size: document.size,
    createdAt: document.createdAt,
    updatedAt: document.updatedAt,
  };
}

export function toApplicantView(v: any) {
  if (!v) return { status: 'UNVERIFIED', fullName: null, dateOfBirth: null, idType: null, idNumber: null, documents: [], reviewNote: null, submittedAt: null, reviewedAt: null };
  return {
    id: v.id,
    status: v.status,
    fullName: v.fullName ?? null,
    dateOfBirth: v.dateOfBirth ?? null,
    idType: v.idType ?? null,
    idNumber: v.idNumber ?? null,
    documents: (v.documents || []).map(toDocumentMetadata),
    reviewNote: v.reviewNote ?? null,
    submittedAt: v.submittedAt ?? null,
    reviewedAt: v.reviewedAt ?? null,
    createdAt: v.createdAt,
    updatedAt: v.updatedAt,
  };
}

export function toAdminView(v: any) {
  if (!v) return null;
  return {
    ...toApplicantView(v),
    userId: v.userId,
    reviewedBy: v.reviewedBy ?? null,
    user: v.user
      ? { id: v.user.id, email: v.user.email, firstName: v.user.firstName, lastName: v.user.lastName, role: v.user.role, suspended: v.user.suspended }
      : undefined,
  };
}

async function loadActiveUser(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');
  if (user.suspended) {
    throw new ForbiddenError('This account has been suspended. Please contact support.');
  }
  return user;
}

/** Get the caller's own verification, or the UNVERIFIED default view if none exists. */
export async function getOwn(userId: string) {
  const v = await prisma.identityVerification.findUnique({
    where: { userId },
    include: { documents: { select: DOCUMENT_METADATA_SELECT } },
  });
  return toApplicantView(v);
}

/** Idempotent: ensures a row exists so the caller has something to fill in and upload against. */
export async function ensureRecord(userId: string) {
  await loadActiveUser(userId);
  const v = await prisma.identityVerification.upsert({
    where: { userId },
    update: {},
    create: { userId, status: 'UNVERIFIED' },
    include: { documents: { select: DOCUMENT_METADATA_SELECT } },
  });
  return toApplicantView(v);
}

export async function updateOwn(userId: string, data: VerificationFields) {
  await loadActiveUser(userId);
  const v = await prisma.identityVerification.upsert({
    where: { userId },
    update: {},
    create: { userId, status: 'UNVERIFIED' },
  });
  assertEditable(v.status);

  const patch: Record<string, unknown> = {};
  for (const field of REQUIRED_FIELDS) {
    if (data[field] !== undefined) patch[field] = data[field];
  }

  const updated = await prisma.identityVerification.update({
    where: { userId },
    data: patch,
    include: { documents: { select: DOCUMENT_METADATA_SELECT } },
  });
  return toApplicantView(updated);
}

export async function submit(userId: string) {
  await loadActiveUser(userId);
  const v = await prisma.identityVerification.findUnique({
    where: { userId },
    include: { documents: { select: DOCUMENT_METADATA_SELECT } },
  });
  if (!v) throw new NotFoundError('Identity verification');
  assertSubmittable(v, v.documents.map((d) => d.kind));

  const updated = await prisma.identityVerification.update({
    where: { userId },
    data: { status: 'SUBMITTED', submittedAt: new Date(), reviewNote: null },
    include: { documents: { select: DOCUMENT_METADATA_SELECT } },
  });
  return toApplicantView(updated);
}

export async function uploadDocument(userId: string, rawKind: string, file: Express.Multer.File) {
  await loadActiveUser(userId);
  const kind = assertIdentityDocumentKind(rawKind);
  const v = await prisma.identityVerification.upsert({
    where: { userId },
    update: {},
    create: { userId, status: 'UNVERIFIED' },
  });
  assertEditable(v.status);

  const mimeType = detectHostDocumentMime(file.buffer);
  const encrypted = encryptHostDocument(file.buffer);
  const document = await prisma.identityVerificationDocument.upsert({
    where: { verificationId_kind: { verificationId: v.id, kind } },
    update: { originalName: safeDocumentName(file.originalname), mimeType, size: file.size, ...encrypted },
    create: { verificationId: v.id, kind, originalName: safeDocumentName(file.originalname), mimeType, size: file.size, ...encrypted },
  });
  return toDocumentMetadata(document);
}

export async function deleteDocument(userId: string, rawKind: string) {
  await loadActiveUser(userId);
  const kind = assertIdentityDocumentKind(rawKind);
  const v = await prisma.identityVerification.findUnique({ where: { userId } });
  if (!v) throw new NotFoundError('Identity verification');
  assertEditable(v.status);
  await prisma.identityVerificationDocument.deleteMany({ where: { verificationId: v.id, kind } });
  return { deleted: true };
}

/** Pure predicate behind the payment gate - used by both the assertion below
 *  and booking.controller.ts's own checks, so the rule is unit-testable in
 *  isolation (see tests/identity-verification.transitions.test.ts). */
export function isApprovedForPayment(status: string | null | undefined): boolean {
  return status === 'APPROVED';
}

/**
 * Gate used right before a booking's payment is initialized. Throws
 * ForbiddenError (never silently downgrades) so callers can distinguish
 * "needs verification" from other payment failures.
 */
export async function assertApprovedForPayment(userId: string): Promise<void> {
  const v = await prisma.identityVerification.findUnique({ where: { userId }, select: { status: true } });
  if (!isApprovedForPayment(v?.status)) {
    throw new ForbiddenError('IDENTITY_VERIFICATION_REQUIRED');
  }
}

// ============================================================
// Admin functions
// ============================================================

const ADMIN_INCLUDE = {
  user: { select: { id: true, email: true, firstName: true, lastName: true, role: true, suspended: true } },
  documents: { select: DOCUMENT_METADATA_SELECT },
} as const;

export async function adminList(filters: { status?: string; search?: string; page?: number; limit?: number }) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));

  const where: any = {};
  if (filters.status) where.status = filters.status;
  if (filters.search) {
    where.OR = [
      { fullName: { contains: filters.search } },
      { user: { email: { contains: filters.search } } },
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.identityVerification.findMany({
      where,
      include: ADMIN_INCLUDE,
      orderBy: { updatedAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.identityVerification.count({ where }),
  ]);

  return {
    data: rows.map(toAdminView),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

export async function adminGet(id: string) {
  const v = await prisma.identityVerification.findUnique({ where: { id }, include: ADMIN_INCLUDE });
  if (!v) throw new NotFoundError('Identity verification');
  return toAdminView(v);
}

export async function adminDownloadDocument(verificationId: string, documentId: string) {
  const document = await prisma.identityVerificationDocument.findFirst({ where: { id: documentId, verificationId } });
  if (!document) throw new NotFoundError('Identity verification document');
  const buffer = decryptHostDocument(Buffer.from(document.ciphertext), Buffer.from(document.iv), Buffer.from(document.authTag));
  return { buffer, mimeType: document.mimeType, originalName: document.originalName };
}

export async function adminReject(id: string, reviewerId: string, reason: string) {
  const v = await prisma.identityVerification.findUnique({ where: { id } });
  if (!v) throw new NotFoundError('Identity verification');
  assertCanReject(v.status);

  const updated = await prisma.identityVerification.update({
    where: { id },
    data: { status: 'REJECTED', reviewNote: reason, reviewedBy: reviewerId, reviewedAt: new Date() },
    include: ADMIN_INCLUDE,
  });
  return toAdminView(updated);
}

export async function adminApprove(id: string, reviewerId: string) {
  const v = await prisma.identityVerification.findUnique({ where: { id }, include: ADMIN_INCLUDE });
  if (!v) throw new NotFoundError('Identity verification');

  const plan = planApproval(v.status);
  if (plan === 'IDEMPOTENT') return toAdminView(v);

  const updated = await prisma.identityVerification.update({
    where: { id },
    data: { status: 'APPROVED', reviewedBy: reviewerId, reviewedAt: new Date(), reviewNote: null },
    include: ADMIN_INCLUDE,
  });
  return toAdminView(updated);
}
