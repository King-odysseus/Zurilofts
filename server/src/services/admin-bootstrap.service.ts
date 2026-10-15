import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { env } from '../config/env.js';

const SALT_ROUNDS = 12;

/**
 * Where a demoted admin lands. Anyone who was acting as a host (approved
 * application or owns listings) keeps host access; everyone else becomes a
 * plain user. Admin and host are mutually exclusive roles.
 */
export function roleAfterAdminDemotion(facts: {
  hasApprovedHostApplication: boolean;
  ownsProperties: boolean;
}): 'HOST' | 'USER' {
  return facts.hasApprovedHostApplication || facts.ownsProperties ? 'HOST' : 'USER';
}

/**
 * An existing account may only become the platform admin if it is not
 * already a host. Returns the reason it must be refused, or null if allowed.
 */
export function adminPromotionBlocker(facts: {
  role: string;
  hasHostApplication: boolean;
  ownsProperties: boolean;
}): string | null {
  if (facts.role === 'HOST' || facts.hasHostApplication || facts.ownsProperties) {
    return 'this account is a host; admin and host accounts must be separate';
  }
  return null;
}

/**
 * Makes the ADMIN_EMAIL/ADMIN_PASSWORD account the only admin. Runs at boot
 * and is idempotent. Does nothing when the variables are unset so a missing
 * Railway variable can never demote the last admin and lock everyone out.
 */
export async function syncConfiguredAdmin(): Promise<void> {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return;
  const email = env.ADMIN_EMAIL.trim().toLowerCase();

  const existing = await prisma.user.findUnique({
    where: { email },
    include: {
      hostApplication: { select: { id: true } },
      _count: { select: { properties: true } },
    },
  });

  if (existing && existing.role !== 'ADMIN') {
    const blocker = adminPromotionBlocker({
      role: existing.role,
      hasHostApplication: Boolean(existing.hostApplication),
      ownsProperties: existing._count.properties > 0,
    });
    if (blocker) {
      // Logged, not thrown: a bad variable must not stop the site booting.
      console.error(` ADMIN_EMAIL ${email} was not made admin: ${blocker}. No admin changes were applied.`);
      return;
    }
  }

  const passwordUnchanged = existing?.passwordHash
    ? await bcrypt.compare(env.ADMIN_PASSWORD, existing.passwordHash)
    : false;
  const passwordHash = passwordUnchanged ? undefined : await bcrypt.hash(env.ADMIN_PASSWORD, SALT_ROUNDS);

  const admin = existing
    ? await prisma.user.update({
        where: { id: existing.id },
        data: { role: 'ADMIN' as any, suspended: false, deletedAt: null, ...(passwordHash && { passwordHash }) },
      })
    : await prisma.user.create({
        data: {
          email,
          passwordHash: passwordHash!,
          firstName: 'Platform',
          lastName: 'Admin',
          role: 'ADMIN' as any,
        },
      });

  // A changed password must sign out any session started with the old one.
  if (existing && passwordHash) {
    await prisma.refreshSession.deleteMany({ where: { userId: admin.id } });
  }

  const others = await prisma.user.findMany({
    where: { role: 'ADMIN' as any, id: { not: admin.id } },
    include: {
      hostApplication: { select: { status: true } },
      _count: { select: { properties: true } },
    },
  });

  for (const other of others) {
    const nextRole = roleAfterAdminDemotion({
      hasApprovedHostApplication: other.hostApplication?.status === 'APPROVED',
      ownsProperties: other._count.properties > 0,
    });
    await prisma.$transaction([
      prisma.user.update({ where: { id: other.id }, data: { role: nextRole as any } }),
      // Existing tokens still say ADMIN for up to 15 minutes; killing the
      // refresh sessions caps that and forces a fresh login.
      prisma.refreshSession.deleteMany({ where: { userId: other.id } }),
    ]);
    console.log(` Demoted ${other.email} from ADMIN to ${nextRole}`);
  }
  console.log(` Admin account ready: ${email}`);
}
