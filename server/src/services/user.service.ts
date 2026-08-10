import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';
import { normalizeKenyanMpesaPhone, payoutRecipientKey } from '../utils/payoutDestination.js';

const SALT_ROUNDS = 12;

export async function getUserProfile(userId: string) {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      googleId: true,
      bankName: true,
      bankAccountNo: true,
      bankCode: true,
      payoutMethod: true,
      mpesaPhone: true,
      payoutFrequency: true,
      createdAt: true,
    },
  });
  if (!user) throw new NotFoundError('User');
  return user;
}

export async function updateUserProfile(userId: string, data: { firstName?: string; lastName?: string; phone?: string; avatar?: string; email?: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  // If email is being changed, verify it isn't already taken by another user
  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('An account with this email already exists');
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      avatar: true,
      role: true,
      createdAt: true,
    },
  });
}

export async function updatePayoutDestination(
  userId: string,
  data:
    | { payoutMethod: 'bank'; bankName: string; bankAccountNo: string; bankCode: string }
    | { payoutMethod: 'mpesa'; mpesaPhone: string }
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  const destination = data.payoutMethod === 'mpesa'
    ? { payoutMethod: 'mpesa', mpesaPhone: normalizeKenyanMpesaPhone(data.mpesaPhone) }
    : {
        payoutMethod: 'bank',
        bankName: data.bankName.trim(),
        bankAccountNo: data.bankAccountNo.trim(),
        bankCode: data.bankCode.trim(),
      };
  const destinationKey = data.payoutMethod === 'mpesa'
    ? payoutRecipientKey('mpesa', destination.mpesaPhone!, 'MPESA')
    : payoutRecipientKey('bank', destination.bankAccountNo!, destination.bankCode!);
  const destinationChanged = user.paystackRecipientKey !== destinationKey;

  return prisma.user.update({
    where: { id: userId },
    data: {
      ...destination,
      paystackRecipientCode: destinationChanged ? null : undefined,
      paystackRecipientKey: destinationKey,
    },
    select: {
      id: true,
      bankName: true,
      bankAccountNo: true,
      bankCode: true,
      payoutMethod: true,
      mpesaPhone: true,
    },
  });
}

export async function updatePayoutFrequency(userId: string, frequency: string) {
  const valid = ['weekly', 'biweekly', 'monthly'];
  if (!valid.includes(frequency)) {
    throw new ValidationError(`Invalid frequency. Must be one of: ${valid.join(', ')}`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  return prisma.user.update({
    where: { id: userId },
    data: { payoutFrequency: frequency },
    select: {
      id: true,
      payoutFrequency: true,
    },
  });
}

// ── Admin user management ──────────────────────────────────────────────
// These functions are only reachable through requireAdmin-gated routes.

const VALID_ROLES = ['USER', 'HOST', 'ADMIN'];

const ADMIN_USER_SELECT = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  avatar: true,
  role: true,
  suspended: true,
  bankName: true,
  bankAccountNo: true,
  bankCode: true,
  payoutFrequency: true,
  createdAt: true,
} as const;

export async function listAllUsers(filters: { role?: string; search?: string }) {
  const where: any = {};
  if (filters.role && VALID_ROLES.includes(filters.role)) {
    where.role = filters.role;
  }
  if (filters.search) {
    where.OR = [
      { email: { contains: filters.search } },
      { firstName: { contains: filters.search } },
      { lastName: { contains: filters.search } },
    ];
  }

  const users = await prisma.user.findMany({
    where,
    select: {
      ...ADMIN_USER_SELECT,
      _count: { select: { properties: true, bookings: true } },
      wallet: { select: { balance: true } },
    },
    orderBy: { createdAt: 'desc' },
  });
  // Mask bank account numbers to last-4 in the list view; full value is
  // available when editing a single user via adminUpdateUser.
  return users.map((u) => ({
    ...u,
    bankAccountNo: u.bankAccountNo ? `••••${u.bankAccountNo.slice(-4)}` : null,
  }));
}

export async function adminUpdateUser(
  userId: string,
  data: {
    firstName?: string;
    lastName?: string;
    email?: string;
    phone?: string;
    bankName?: string;
    bankAccountNo?: string;
    bankCode?: string;
    payoutFrequency?: string;
  },
) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  if (data.email && data.email !== user.email) {
    const existing = await prisma.user.findUnique({ where: { email: data.email } });
    if (existing) throw new ConflictError('An account with this email already exists');
  }

  if (data.payoutFrequency && !['weekly', 'biweekly', 'monthly'].includes(data.payoutFrequency)) {
    throw new ValidationError('Invalid payout frequency. Must be weekly, biweekly, or monthly.');
  }

  return prisma.user.update({
    where: { id: userId },
    data,
    select: ADMIN_USER_SELECT,
  });
}

export async function setUserRole(userId: string, role: string) {
  if (!VALID_ROLES.includes(role)) {
    throw new ValidationError(`Invalid role. Must be one of: ${VALID_ROLES.join(', ')}`);
  }
  // Defense in depth: HOST is an approval-controlled marketplace privilege.
  // Even if a caller bypasses route validation, the generic user editor must
  // never grant it. Admins approve a submitted HostApplication instead.
  if (role === 'HOST') {
    throw new ValidationError('Approve the user\'s host application to grant HOST access.');
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  return prisma.user.update({
    where: { id: userId },
    // Validation above narrows this to USER | HOST | ADMIN. The cast keeps
    // this source compatible with SQLite's String and PostgreSQL's Role enum.
    data: { role: role as any },
    select: ADMIN_USER_SELECT,
  });
}

export async function setUserSuspended(userId: string, suspended: boolean) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  return prisma.user.update({
    where: { id: userId },
    data: { suspended },
    select: ADMIN_USER_SELECT,
  });
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  if (!user.passwordHash) {
    throw new ValidationError('This account uses Google sign-in. Please set a password first.');
  }

  const valid = await bcrypt.compare(currentPassword, user.passwordHash);
  if (!valid) throw new ValidationError('Current password is incorrect');

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  await prisma.user.update({
    where: { id: userId },
    data: { passwordHash },
  });

  return { message: 'Password updated successfully' };
}
