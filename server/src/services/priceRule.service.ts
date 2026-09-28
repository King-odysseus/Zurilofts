import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../types/index.js';

async function requireProperty(propertyId: string, ownerId?: string) {
  const property = await prisma.property.findFirst({
    where: { id: propertyId, ...(ownerId ? { hostId: ownerId } : {}) },
  });
  if (!property) throw new NotFoundError('Property');
  return property;
}

export async function listPriceRules(propertyId: string, ownerId?: string) {
  await requireProperty(propertyId, ownerId);
  return prisma.priceRule.findMany({
    where: { propertyId },
    orderBy: { start: 'asc' },
  });
}

export async function addPriceRule(
  propertyId: string,
  data: { name?: string; start: Date; end: Date; price: number },
  ownerId?: string
) {
  await requireProperty(propertyId, ownerId);
  if (data.end <= data.start) throw new ValidationError('End date must be after the start date');
  if (data.price <= 0) throw new ValidationError('Price must be greater than zero');
  return prisma.priceRule.create({
    data: {
      propertyId,
      name: data.name || null,
      start: data.start,
      end: data.end,
      price: data.price,
    },
  });
}

export async function deletePriceRule(id: string, ownerId?: string) {
  const rule = await prisma.priceRule.findFirst({
    where: { id, ...(ownerId ? { property: { hostId: ownerId } } : {}) },
  });
  if (!rule) throw new NotFoundError('Price rule');
  return prisma.priceRule.delete({ where: { id } });
}
