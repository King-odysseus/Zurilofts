import { z } from 'zod';
import prisma from '../config/prisma.js';
import { paginationMeta } from '../utils/paging.js';

/**
 * Durable, append-only governance log for staff decisions.
 *
 * The two properties that matter:
 *
 * 1. It survives the record it describes. `AdminAuditEvent` has no foreign keys,
 *    so deleting a listing, erasing an account or a cascade cannot take an entry
 *    with it. The per-domain tables (HostApplicationAudit, DisputeAudit) all
 *    cascade, which is exactly why this log exists alongside them.
 * 2. It is append-only. This module exposes create and read and nothing else.
 *    There is no update or delete function, deliberately: a governance log an
 *    ordinary code path can rewrite is not evidence. A test asserts that no
 *    update/delete/upsert on the model exists in this file.
 */

/** The action vocabulary. Free-form strings would make the log unfilterable. */
export const AUDIT_ACTIONS = [
  'LISTING_APPROVED',
  'LISTING_REJECTED',
  'LISTING_SUSPENDED',
  'LISTING_RESTORED',
  'LISTING_DELETED',
  'LISTING_FORCE_UNPUBLISHED',
  'HOST_APPLICATION_APPROVED',
  'HOST_APPLICATION_REJECTED',
  'HOST_APPLICATION_CHANGES_REQUESTED',
  'HOST_APPLICATION_STATUS_CHANGED',
  'HOST_VERIFICATION_SUSPENDED',
  'HOST_VERIFICATION_RESTORED',
  'USER_ROLE_CHANGED',
  'USER_PROFILE_UPDATED',
  'USER_SUSPENDED',
  'USER_RESTORED',
  'USER_PASSWORD_SET',
  'USER_ERASED',
  'DISPUTE_UNDER_REVIEW',
  'DISPUTE_RESOLVED',
  'DISPUTE_DISMISSED',
  'ORPHAN_LISTINGS_CLEANED',
  'DATA_INCIDENT_DECLARED',
  'DATA_INCIDENT_UPDATED',
] as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[number];

/** What kind of record the decision was about. */
export const AUDIT_TARGET_TYPES = ['Listing', 'User', 'HostApplication', 'Dispute', 'Account', 'Incident'] as const;

export type AuditTargetType = (typeof AUDIT_TARGET_TYPES)[number];

/**
 * Query for the governance log. Paging is validated here so the route cannot be
 * asked for the whole table; listAdminAudit clamps again for callers that skip
 * this schema entirely.
 */
export const adminAuditQuerySchema = z.object({
  action: z
    .string()
    .trim()
    .refine((value) => (AUDIT_ACTIONS as readonly string[]).includes(value), 'Unknown audit action')
    .optional(),
  targetType: z
    .string()
    .trim()
    .refine((value) => (AUDIT_TARGET_TYPES as readonly string[]).includes(value), 'Unknown audit target type')
    .optional(),
  targetId: z.string().trim().min(1).max(200).optional(),
  actorId: z.string().trim().min(1).max(200).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export interface AuditActor {
  id: string | null;
  email: string | null;
  role: string;
}

/**
 * Actor snapshot taken from an authenticated admin request: who acted, from
 * where, with which client. The email is copied now rather than read later
 * because the account may be erased while the entry must remain readable.
 */
export function auditActorFromRequest(req: {
  user?: { sub: string; email?: string; role?: string };
  ip?: string;
  headers?: Record<string, unknown>;
}): { actor: AuditActor; ipAddress: string | null; userAgent: string | null } {
  const userAgentHeader = req.headers?.['user-agent'];
  return {
    actor: {
      id: req.user?.sub ?? null,
      email: req.user?.email ?? null,
      role: (req.user?.role ?? 'ADMIN').toUpperCase(),
    },
    ipAddress: req.ip ?? null,
    userAgent: typeof userAgentHeader === 'string' ? userAgentHeader : null,
  };
}

/** A staff actor, for call sites that already know who is acting. */
export function adminActor(actor: { id: string; email?: string | null; role?: string | null }): AuditActor {
  return { id: actor.id, email: actor.email ?? null, role: (actor.role ?? 'ADMIN').toUpperCase() };
}

/** An entry written by the system rather than a person (scheduled jobs, backfills). */
export const SYSTEM_ACTOR: AuditActor = { id: null, email: null, role: 'SYSTEM' };

export interface AuditEntryInput {
  actor: AuditActor;
  action: AuditAction;
  targetType: AuditTargetType;
  targetId?: string | null;
  targetLabel?: string | null;
  reason?: string | null;
  metadata?: Record<string, unknown> | null;
  ipAddress?: string | null;
  userAgent?: string | null;
}

/**
 * Keys whose values must never be written to the log. A governance log is read
 * by more people than the table it describes, so a password hash or a bank
 * account that leaked in through a spread of the request body would be a new
 * disclosure, not a record of one.
 *
 * Split in two because substring matching on a two-letter key is a trap: "iv"
 * would also redact "delivery" and "activity". Short keys are matched exactly,
 * longer ones by substring so casing and punctuation do not matter.
 */
const SENSITIVE_EXACT_KEYS = ['iv', 'tag', 'salt', 'ciphertext', 'authtag'];

const SENSITIVE_KEY_PARTS = [
  'password',
  'token',
  'secret',
  'apikey',
  'authorization',
  'cookie',
  'credential',
  'bankaccountno',
  'accountnumber',
  'iban',
  'cvv',
  'paystackrecipientkey',
];

export const REDACTION_PLACEHOLDER = '[redacted]';

/**
 * Metadata is stored as JSON text. A single unparseable row must not take down
 * the whole list: this is the log consulted when something has already gone
 * wrong, so an unreadable entry is reported as unreadable rather than throwing
 * away every other entry in the response.
 */
function parseMetadataSafe(raw: string | null): unknown {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return { unreadable: true };
  }
}

function isSensitiveKey(key: string): boolean {
  const normalised = key.toLowerCase().replace(/[^a-z]/g, '');
  if (SENSITIVE_EXACT_KEYS.includes(normalised)) return true;
  return SENSITIVE_KEY_PARTS.some((sensitive) => normalised.includes(sensitive));
}

/**
 * Strip anything credential-shaped out of metadata before it is persisted.
 * Bounded in depth and width as well, so a large request body cannot turn one
 * audit row into an unbounded blob.
 */
export function redactAuditMetadata(
  value: unknown,
  depth = 0
): unknown {
  if (depth > 4) return '[truncated]';
  if (value === null || value === undefined) return null;
  if (typeof value === 'string') return value.length > 500 ? `${value.slice(0, 500)}...` : value;
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.slice(0, 25).map((item) => redactAuditMetadata(item, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>).slice(0, 40)) {
      // A key such as "bankAccountNo" or "passwordHash" is recognised without
      // caring about its casing or punctuation.
      out[key] = isSensitiveKey(key) && inner != null ? REDACTION_PLACEHOLDER : redactAuditMetadata(inner, depth + 1);
    }
    return out;
  }
  return String(value);
}

/** A reason is shown to the affected member, so it is trimmed and bounded. */
export function normaliseAuditReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  const trimmed = reason.replace(/\s+/g, ' ').trim();
  if (!trimmed) return null;
  return trimmed.length > 1000 ? `${trimmed.slice(0, 1000)}...` : trimmed;
}

export interface AuditPageRequest {
  page?: number | string | null;
  limit?: number | string | null;
}

/** Paging that cannot be used to ask for the whole table. */
export function clampAuditPaging(request: AuditPageRequest): { page: number; limit: number; skip: number } {
  const page = Math.max(1, Math.trunc(Number(request.page)) || 1);
  const requested = Math.trunc(Number(request.limit)) || 25;
  const limit = Math.min(Math.max(requested, 1), 100);
  return { page, limit, skip: (page - 1) * limit };
}

/**
 * The exact row to insert, built as a pure value so the shape can be tested
 * without a database. Everything is snapshotted here rather than joined later.
 */
export function buildAuditRow(input: AuditEntryInput) {
  const metadata = input.metadata ? redactAuditMetadata(input.metadata) : null;
  return {
    actorId: input.actor.id,
    actorEmail: input.actor.email,
    actorRole: input.actor.role,
    action: input.action,
    targetType: input.targetType,
    targetId: input.targetId ?? null,
    targetLabel: input.targetLabel ?? null,
    reason: normaliseAuditReason(input.reason),
    metadataJson: metadata && Object.keys(metadata as Record<string, unknown>).length > 0 ? JSON.stringify(metadata) : null,
    ipAddress: input.ipAddress ?? null,
    userAgent: input.userAgent ? input.userAgent.slice(0, 300) : null,
  };
}

/**
 * Record one decision. Call it inside the same transaction as the change when
 * the two must not diverge (see me.service.ts, host-application.service.ts and
 * dispute.service.ts, which write the entry through their own `tx`).
 *
 * Returns the new entry's id so a caller can reference it.
 */
export async function recordAdminAudit(input: AuditEntryInput): Promise<string> {
  const row = await prisma.adminAuditEvent.create({ data: buildAuditRow(input) });
  return row.id;
}

/**
 * Record a decision without letting a logging problem break the caller. Used at
 * call sites that run after the change has already committed, where throwing
 * would report failure for something that actually happened. The failure is
 * logged with the whole entry, so it is recoverable by hand.
 */
export async function recordAdminAuditSafely(input: AuditEntryInput): Promise<void> {
  try {
    await recordAdminAudit(input);
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    console.error('[audit] could not record a governance entry', JSON.stringify(buildAuditRow(input)), reason);
  }
}

export interface AuditQuery {
  action?: string;
  targetType?: string;
  targetId?: string;
  actorId?: string;
  from?: Date;
  to?: Date;
  page?: number;
  limit?: number;
}

/** Read side. Newest first, filtered, paged, and joined to nothing. */
export async function listAdminAudit(query: AuditQuery) {
  const { page, limit, skip } = clampAuditPaging({ page: query.page, limit: query.limit });
  const where: {
    action?: string;
    targetType?: string;
    targetId?: string;
    actorId?: string;
    createdAt?: { gte?: Date; lte?: Date };
  } = {};
  if (query.action) where.action = query.action;
  if (query.targetType) where.targetType = query.targetType;
  if (query.targetId) where.targetId = query.targetId;
  if (query.actorId) where.actorId = query.actorId;
  if (query.from || query.to) {
    where.createdAt = {
      ...(query.from ? { gte: query.from } : {}),
      ...(query.to ? { lte: query.to } : {}),
    };
  }

  const [rows, total] = await Promise.all([
    prisma.adminAuditEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.adminAuditEvent.count({ where }),
  ]);

  return {
    data: rows.map((row) => ({
      ...row,
      metadata: parseMetadataSafe(row.metadataJson),
    })),
    pagination: paginationMeta(total, { page, limit }),
  };
}
