import crypto from 'crypto';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';
import { ValidationError } from '../types/index.js';

// ---------------------------------------------------------------
// IP hashing -- never store a raw IP address
// ---------------------------------------------------------------

function hashIp(ip: string | undefined): string | null {
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

interface RecordConsentInput {
  analytics: boolean;
  marketing: boolean;
  policyVersion: string;
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
      userAgent: true,
      createdAt: true,
    },
  });
}