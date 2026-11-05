import crypto from 'crypto';
import { env } from '../config/env.js';

/**
 * A stable hash of a network address, never the address itself.
 *
 * Three tables record where a request came from: ConsentRecord, AdminAuditEvent
 * and RefreshSession. Before this existed, two of them stored the address in
 * clear while the third stored a hash, which made the careful one pointless:
 * one raw copy anywhere is enough to identify the person, so the hashed copy
 * was decoration.
 *
 * Salted with the JWT access secret so a hash cannot be reversed by trying the
 * whole IPv4 space. Rotating that secret makes older hashes unlinkable, which
 * is the intended trade: the ability to correlate across a rotation is worth
 * less than a leaked secret being useless against the stored values.
 */
export function hashIp(ip: string | undefined | null): string | null {
  if (!ip) return null;
  return crypto.createHash('sha256').update(ip + env.JWT_ACCESS_SECRET).digest('hex');
}
