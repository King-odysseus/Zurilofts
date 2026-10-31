import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../types/index.js';

// A dated minimum stay, shaped like PriceRule: `start` is the first affected
// night and `end` is the check-out day, which is excluded.

async function requireProperty(propertyId: string, ownerId?: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...(ownerId ? { hostId: ownerId } : {}) },
  });
  if (!property) throw new NotFoundError('Property');
  return property;
}

export async function listStayRules(propertyId: string, ownerId?: string) {
  await requireProperty(propertyId, ownerId);
  return prisma.stayRule.findMany({
    where: { propertyId },
    orderBy: { start: 'asc' },
  });
}

export async function addStayRule(
  propertyId: string,
  data: { start: Date; end: Date; minNights: number },
  ownerId?: string
) {
  await requireProperty(propertyId, ownerId);
  if (data.end <= data.start) throw new ValidationError('End date must be after the start date');
  if (data.minNights < 1) throw new ValidationError('Minimum stay must be at least one night');
  return prisma.stayRule.create({
    data: {
      propertyId,
      start: data.start,
      end: data.end,
      minNights: data.minNights,
    },
  });
}

export async function deleteStayRule(id: string, ownerId?: string) {
  const rule = await prisma.stayRule.findFirst({
    where: { id, ...(ownerId ? { property: { hostId: ownerId } } : {}) },
  });
  if (!rule) throw new NotFoundError('Stay rule');
  return prisma.stayRule.delete({ where: { id } });
}

/**
 * The longest minimum applying to the night a stay checks in on. No matching
 * rule means no minimum, so callers can treat 1 as "unrestricted".
 */
export async function minNightsForCheckIn(propertyId: string, checkIn: Date): Promise<number> {
  const rules = await prisma.stayRule.findMany({
    where: { propertyId, start: { lte: checkIn }, end: { gt: checkIn } },
    select: { minNights: true },
  });
  return rules.reduce((longest, rule) => Math.max(longest, rule.minNights), 1);
}
