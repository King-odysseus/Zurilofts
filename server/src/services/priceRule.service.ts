import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../types/index.js';

export async function listPriceRules(propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');
  return prisma.priceRule.findMany({
    where: { propertyId },
    orderBy: { start: 'asc' },
  });
}

export async function addPriceRule(
  propertyId: string,
  data: { name?: string; start: Date; end: Date; price: number }
) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');
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

export async function deletePriceRule(id: string) {
  const rule = await prisma.priceRule.findUnique({ where: { id } });
  if (!rule) throw new NotFoundError('Price rule');
  return prisma.priceRule.delete({ where: { id } });
}
