import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { ValidationError } from '../types/index.js';

// ---------------------------------------------------------------
// IP hashing -- never store a raw IP address
// ---------------------------------------------------------------

export function hashIp(ip: string | undefined): string | null {
  if (!ip) return null;
  // Salt with JWT access secret so hashes are not rainbow-table reversible.
  // If the secret is rotated, old hashes become unlinkable -- that is by design.
  return crypto
    .createHash('sha256')
    .update(ip + env.JWT_ACCESS_SECRET)
    .digest('hex');
}

// ---------------------------------------------------------------
// Record consent (append-only, never updates an existing row)
// ---------------------------------------------------------------

// The version of the published Privacy Policy and Terms currently in force.
// Bumped whenever either document changes, so a stored acceptance always points
// at the exact wording the person agreed to rather than "whatever was live".
export const CURRENT_POLICY_VERSION = '2026-11-04';

interface RecordConsentInput {
  analytics: boolean;
  marketing: boolean;
  policyVersion: string;
  // Terms acceptance shares this append-only trail with cookie choices, but it
  // is a different fact: cookie consent says nothing about agreeing to the
  // contract, and an account needs the latter regardless of the former.
  termsAccepted?: boolean;
  termsVersion?: string;
  visitorId?: string;
  userId?: string;
  ip?: string;
  userAgent?: string;
}

export async function recordConsent(input: RecordConsentInput) {
  if (!input.policyVersion?.trim()) {
    throw new ValidationError('policyVersion is required');
  }

  const record = await prisma.consentRecord.create({
    data: {
      userId: input.userId ?? null,
      visitorId: input.visitorId ?? null,
      necessary: true, // always true, cannot be refused
      analytics: input.analytics,
      marketing: input.marketing,
      policyVersion: input.policyVersion.trim(),
      termsAccepted: input.termsAccepted ?? false,
      termsVersion: input.termsVersion ?? null,
      ipHash: hashIp(input.ip),
      userAgent: input.userAgent ?? null,
    },
  });

  // Never return ipHash to the client
  const { ipHash, ...safe } = record;
  return safe;
}

// ---------------------------------------------------------------
// List consent records for a user (for export)
// ---------------------------------------------------------------

export async function getConsentRecordsForUser(userId: string) {
  return prisma.consentRecord.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      visitorId: true,
      necessary: true,
      analytics: true,
      marketing: true,
      policyVersion: true,
      termsAccepted: true,
      termsVersion: true,
      userAgent: true,
      createdAt: true,
    },
  });
}