import prisma from '../config/prisma.js';
import { ValidationError } from '../types/index.js';
import { hashIp } from '../utils/ipHash.js';

// Re-exported so the existing importers keep working; the implementation lives
// in utils/ipHash.ts because three tables need the same rule.
export { hashIp };

// ---------------------------------------------------------------
// Record consent (append-only, never updates an existing row)
// ---------------------------------------------------------------

// The version of the published Privacy Policy and Terms currently in force.
// Bumped whenever either document changes, so a stored acceptance always points
// at the exact wording the person agreed to rather than "whatever was live".
export const CURRENT_POLICY_VERSION = '2026-11-05';

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

/**
 * Users whose most recent recorded choice allows marketing. The trail is
 * append-only, so a later "no" must beat an earlier "yes": the first record seen
 * per user, newest first, decides. A user with no record at all is not opted in.
 */
export function marketingOptInUserIds(
  newestFirst: Array<{ userId: string | null; marketing: boolean }>,
): Set<string> {
  const decided = new Set<string>();
  const optedIn = new Set<string>();
  for (const record of newestFirst) {
    if (!record.userId || decided.has(record.userId)) continue;
    decided.add(record.userId);
    if (record.marketing) optedIn.add(record.userId);
  }
  return optedIn;
}

export async function getMarketingOptInUserIds(): Promise<Set<string>> {
  const records = await prisma.consentRecord.findMany({
    where: { userId: { not: null } },
    orderBy: { createdAt: 'desc' },
    select: { userId: true, marketing: true },
  });
  return marketingOptInUserIds(records);
}
