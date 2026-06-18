import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ConflictError } from '../types/index.js';

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

export async function updateBankDetails(userId: string, data: { bankName: string; bankAccountNo: string; bankCode: string }) {
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  return prisma.user.update({
    where: { id: userId },
    data: {
      bankName: data.bankName,
      bankAccountNo: data.bankAccountNo,
      bankCode: data.bankCode,
    },
    select: {
      id: true,
      bankName: true,
      bankAccountNo: true,
      bankCode: true,
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
  return users;
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
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) throw new NotFoundError('User');

  return prisma.user.update({
    where: { id: userId },
    data: { role },
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
