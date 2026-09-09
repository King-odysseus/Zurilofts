import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../types/index.js';
import { decryptHostDocument, detectHostDocumentMime, encryptHostDocument, safeDocumentName } from '../utils/hostDocumentCrypto.js';

// ============================================================
// Booking-linked disputes between guest and host, mediated by admin.
// `messages` are visible to both participants and admin; `notes` are
// admin-only. Lifecycle: "OPEN" | "UNDER_REVIEW" | "RESOLVED" | "DISMISSED".
// ============================================================

export type DisputeStatus = 'OPEN' | 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED';

/** True once a dispute is closed - no more evidence, messages, or status changes. */
export function isClosed(status: string): boolean {
  return status === 'RESOLVED' || status === 'DISMISSED';
}

/**
 * Validates an admin status transition with no database access, so the rule
 * set is unit-testable in isolation (see tests/dispute.transitions.test.ts).
 * Throws instead of returning a boolean so every caller gets the same message.
 */
export function assertValidStatusTransition(
  currentStatus: string,
  nextStatus: DisputeStatus,
  resolution?: string
): void {
  if (isClosed(currentStatus)) {
    throw new ValidationError(`This dispute is already closed (status: ${currentStatus}).`);
  }
  if (nextStatus === 'RESOLVED' && !resolution?.trim()) {
    throw new ValidationError('A resolution summary is required to resolve a dispute.');
  }
}

const PARTICIPANT_INCLUDE = {
  booking: { select: { id: true, propertyId: true, userId: true, property: { select: { hostId: true, title: true } } } },
  evidence: { select: { id: true, uploadedBy: true, originalName: true, mimeType: true, size: true, createdAt: true } },
  messages: { orderBy: { createdAt: 'asc' as const } },
  auditLogs: { orderBy: { createdAt: 'asc' as const } },
} as const;

function toParticipantView(d: any) {
  if (!d) return null;
  return {
    id: d.id,
    bookingId: d.bookingId,
    raisedById: d.raisedById,
    raisedByRole: d.raisedByRole,
    category: d.category,
    description: d.description,
    status: d.status,
    resolution: d.resolution ?? null,
    resolvedAt: d.resolvedAt ?? null,
    createdAt: d.createdAt,
    updatedAt: d.updatedAt,
    evidence: (d.evidence || []).map((e: any) => ({
      id: e.id, uploadedBy: e.uploadedBy, originalName: e.originalName, mimeType: e.mimeType, size: e.size, createdAt: e.createdAt,
    })),
    messages: (d.messages || []).map((m: any) => ({
      id: m.id, senderId: m.senderId, senderRole: m.senderRole, body: m.body, createdAt: m.createdAt,
    })),
    // A participant-safe projection of the audit trail: action + note +
    // timestamp only, never `actorId` - that can be another participant's or
    // an admin's internal user id, which stays admin-only (see toAdminView's
    // full `auditLogs`). This is real recorded history, not synthesised.
    timeline: (d.auditLogs || []).map((a: any) => ({ action: a.action, note: a.note ?? null, createdAt: a.createdAt })),
    // notes are deliberately never included here - admin-only, see toAdminView.
  };
}

function toAdminView(d: any) {
  if (!d) return null;
  return {
    ...toParticipantView(d),
    resolvedBy: d.resolvedBy ?? null,
    notes: (d.notes || []).map((n: any) => ({ id: n.id, authorId: n.authorId, body: n.body, createdAt: n.createdAt })),
    auditLogs: (d.auditLogs || []).map((a: any) => ({ id: a.id, actorId: a.actorId, action: a.action, note: a.note ?? null, createdAt: a.createdAt })),
  };
}

/** Resolves the caller's role on a booking: GUEST if they made it, HOST if
 *  they own the property, throws NotFoundError otherwise (never leaks). */
async function resolveParticipantRole(bookingId: string, userId: string): Promise<'GUEST' | 'HOST'> {
  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    select: { userId: true, property: { select: { hostId: true } } },
  });
  if (!booking) throw new NotFoundError('Booking');
  if (booking.userId === userId) return 'GUEST';
  if (booking.property?.hostId === userId) return 'HOST';
  throw new NotFoundError('Booking');
}

async function assertParticipantOrAdmin(disputeId: string, userId: string, isAdmin: boolean) {
  const dispute = await prisma.dispute.findUnique({
    where: { id: disputeId },
    select: { booking: { select: { userId: true, property: { select: { hostId: true } } } } },
  });
  if (!dispute) throw new NotFoundError('Dispute');
  if (isAdmin) return;
  const isGuest = dispute.booking.userId === userId;
  const isHost = dispute.booking.property?.hostId === userId;
  if (!isGuest && !isHost) throw new NotFoundError('Dispute');
}

export async function create(userId: string, input: { bookingId: string; category: string; description: string }) {
  const role = await resolveParticipantRole(input.bookingId, userId);

  const created = await prisma.$transaction(async (tx) => {
    const dispute = await tx.dispute.create({
      data: {
        bookingId: input.bookingId,
        raisedById: userId,
        raisedByRole: role,
        category: input.category,
        description: input.description,
      },
      include: PARTICIPANT_INCLUDE,
    });
    await tx.disputeAudit.create({
      data: { disputeId: dispute.id, actorId: userId, action: 'OPENED', note: input.category },
    });
    return dispute;
  });
  return toParticipantView(created);
}

/** Lists disputes the caller participates in (as guest or host on the booking). */
export async function listMine(userId: string) {
  const rows = await prisma.dispute.findMany({
    where: { booking: { OR: [{ userId }, { property: { hostId: userId } }] } },
    include: PARTICIPANT_INCLUDE,
    orderBy: { createdAt: 'desc' },
  });
  return rows.map(toParticipantView);
}

export async function getForParticipant(id: string, userId: string, isAdmin: boolean) {
  await assertParticipantOrAdmin(id, userId, isAdmin);
  const dispute = await prisma.dispute.findUnique({ where: { id }, include: PARTICIPANT_INCLUDE });
  if (!dispute) throw new NotFoundError('Dispute');
  return toParticipantView(dispute);
}

export async function addEvidence(id: string, userId: string, isAdmin: boolean, file: Express.Multer.File) {
  await assertParticipantOrAdmin(id, userId, isAdmin);
  const dispute = await prisma.dispute.findUnique({ where: { id }, select: { status: true } });
  if (!dispute) throw new NotFoundError('Dispute');
  if (isClosed(dispute.status)) {
    throw new ValidationError(`Cannot add evidence to a closed dispute (status: ${dispute.status}).`);
  }

  const mimeType = detectHostDocumentMime(file.buffer);
  const encrypted = encryptHostDocument(file.buffer);
  const [evidence] = await prisma.$transaction([
    prisma.disputeEvidence.create({
      data: { disputeId: id, uploadedBy: userId, originalName: safeDocumentName(file.originalname), mimeType, size: file.size, ...encrypted },
    }),
    prisma.disputeAudit.create({ data: { disputeId: id, actorId: userId, action: 'EVIDENCE_ADDED' } }),
  ]);
  return { id: evidence.id, uploadedBy: evidence.uploadedBy, originalName: evidence.originalName, mimeType: evidence.mimeType, size: evidence.size, createdAt: evidence.createdAt };
}

export async function downloadEvidence(disputeId: string, evidenceId: string, userId: string, isAdmin: boolean) {
  await assertParticipantOrAdmin(disputeId, userId, isAdmin);
  const evidence = await prisma.disputeEvidence.findFirst({ where: { id: evidenceId, disputeId } });
  if (!evidence) throw new NotFoundError('Dispute evidence');
  const buffer = decryptHostDocument(Buffer.from(evidence.ciphertext), Buffer.from(evidence.iv), Buffer.from(evidence.authTag));
  return { buffer, mimeType: evidence.mimeType, originalName: evidence.originalName };
}

/** A participant or admin posts a message visible to both sides + admin. */
export async function postMessage(id: string, userId: string, isAdmin: boolean, body: string) {
  await assertParticipantOrAdmin(id, userId, isAdmin);
  const dispute = await prisma.dispute.findUnique({ where: { id }, select: { status: true, booking: { select: { userId: true, property: { select: { hostId: true } } } } } });
  if (!dispute) throw new NotFoundError('Dispute');
  if (isClosed(dispute.status)) {
    throw new ValidationError(`Cannot message on a closed dispute (status: ${dispute.status}).`);
  }

  const senderRole = isAdmin ? 'ADMIN' : dispute.booking.userId === userId ? 'GUEST' : 'HOST';
  const [message] = await prisma.$transaction([
    prisma.disputeMessage.create({ data: { disputeId: id, senderId: userId, senderRole, body } }),
    prisma.disputeAudit.create({ data: { disputeId: id, actorId: userId, action: 'MESSAGE_SENT' } }),
  ]);
  return { id: message.id, senderId: message.senderId, senderRole: message.senderRole, body: message.body, createdAt: message.createdAt };
}

// ============================================================
// Admin functions - reachable only through requireAdmin routes
// ============================================================

export async function adminList(filters: { status?: string; page?: number; limit?: number }) {
  const page = Math.max(1, Number(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, Number(filters.limit) || 20));
  const where: any = {};
  if (filters.status) where.status = filters.status;

  const [rows, total] = await Promise.all([
    prisma.dispute.findMany({
      where,
      include: {
        ...PARTICIPANT_INCLUDE,
        notes: { orderBy: { createdAt: 'asc' } },
        booking: { select: { id: true, propertyId: true, userId: true, property: { select: { hostId: true, title: true } }, user: { select: { firstName: true, lastName: true, email: true } } } },
      },
      orderBy: { createdAt: 'desc' },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.dispute.count({ where }),
  ]);
  return { data: rows.map(toAdminView), pagination: { page, limit, total, totalPages: Math.ceil(total / limit) } };
}

export async function adminGet(id: string) {
  const dispute = await prisma.dispute.findUnique({
    where: { id },
    include: { ...PARTICIPANT_INCLUDE, notes: { orderBy: { createdAt: 'asc' } } },
  });
  if (!dispute) throw new NotFoundError('Dispute');
  return toAdminView(dispute);
}

export async function addNote(id: string, adminId: string, body: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id }, select: { id: true } });
  if (!dispute) throw new NotFoundError('Dispute');
  const [note] = await prisma.$transaction([
    prisma.disputeNote.create({ data: { disputeId: id, authorId: adminId, body } }),
    prisma.disputeAudit.create({ data: { disputeId: id, actorId: adminId, action: 'NOTE_ADDED' } }),
  ]);
  return { id: note.id, authorId: note.authorId, body: note.body, createdAt: note.createdAt };
}

/** Admin transitions a dispute's status; RESOLVED requires a resolution summary. */
export async function updateStatus(id: string, adminId: string, status: 'UNDER_REVIEW' | 'RESOLVED' | 'DISMISSED', resolution?: string) {
  const dispute = await prisma.dispute.findUnique({ where: { id } });
  if (!dispute) throw new NotFoundError('Dispute');
  assertValidStatusTransition(dispute.status, status, resolution);

  const isClosing = isClosed(status);
  const updated = await prisma.$transaction(async (tx) => {
    const row = await tx.dispute.update({
      where: { id },
      data: {
        status,
        resolution: status === 'RESOLVED' ? resolution : dispute.resolution,
        resolvedBy: isClosing ? adminId : dispute.resolvedBy,
        resolvedAt: isClosing ? new Date() : dispute.resolvedAt,
      },
      include: { ...PARTICIPANT_INCLUDE, notes: { orderBy: { createdAt: 'asc' } } },
    });
    await tx.disputeAudit.create({
      data: { disputeId: id, actorId: adminId, action: status === 'RESOLVED' ? 'RESOLVED' : status === 'DISMISSED' ? 'DISMISSED' : 'STATUS_CHANGED', note: resolution },
    });
    return row;
  });
  return toAdminView(updated);
}

export async function adminDownloadEvidence(disputeId: string, evidenceId: string) {
  const evidence = await prisma.disputeEvidence.findFirst({ where: { id: evidenceId, disputeId } });
  if (!evidence) throw new NotFoundError('Dispute evidence');
  const buffer = decryptHostDocument(Buffer.from(evidence.ciphertext), Buffer.from(evidence.iv), Buffer.from(evidence.authTag));
  return { buffer, mimeType: evidence.mimeType, originalName: evidence.originalName };
}
