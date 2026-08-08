import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError } from '../types/index.js';

interface CreateShortlistInput {
  userId: string;
  name: string;
}

interface AddItemInput {
  shortlistId: string;
  propertyId: string;
  note?: string;
  userId: string;
}

export async function createShortlist(input: CreateShortlistInput) {
  const shortlist = await prisma.shortlist.create({
    data: {
      ownerId: input.userId,
      name: input.name,
    },
    include: {
      _count: { select: { items: true } },
    },
  });
  return shortlist;
}

export async function listUserShortlists(userId: string) {
  return prisma.shortlist.findMany({
    where: { ownerId: userId },
    include: {
      _count: { select: { items: true } },
    },
    orderBy: { updatedAt: 'desc' },
  });
}

export async function getShortlist(shortlistId: string, userId: string) {
  const shortlist = await prisma.shortlist.findUnique({
    where: { id: shortlistId },
    include: {
      items: {
        include: {
          property: {
            select: {
              id: true,
              title: true,
              location: true,
              price: true,
              price1Bed: true,
              price2Bed: true,
              imagesJson: true,
              rating: true,
              reviews: true,
              type: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      },
      _count: { select: { items: true } },
    },
  });

  if (!shortlist) throw new NotFoundError('Shortlist');
  if (shortlist.ownerId !== userId) throw new NotFoundError('Shortlist');

  // Normalize imagesJson to images array
  return {
    ...shortlist,
    items: shortlist.items.map((item) => ({
      ...item,
      property: {
        ...item.property,
        images: (() => {
          try {
            const parsed = JSON.parse((item.property as any).imagesJson || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      },
    })),
  };
}

export async function updateShortlist(shortlistId: string, userId: string, name: string) {
  const shortlist = await prisma.shortlist.findUnique({ where: { id: shortlistId } });
  if (!shortlist) throw new NotFoundError('Shortlist');
  if (shortlist.ownerId !== userId) throw new NotFoundError('Shortlist');

  return prisma.shortlist.update({
    where: { id: shortlistId },
    data: { name },
    include: { _count: { select: { items: true } } },
  });
}

export async function deleteShortlist(shortlistId: string, userId: string) {
  const shortlist = await prisma.shortlist.findUnique({ where: { id: shortlistId } });
  if (!shortlist) throw new NotFoundError('Shortlist');
  if (shortlist.ownerId !== userId) throw new NotFoundError('Shortlist');

  await prisma.shortlist.delete({ where: { id: shortlistId } });
  return { deleted: true };
}

export async function addItem(input: AddItemInput) {
  const shortlist = await prisma.shortlist.findUnique({ where: { id: input.shortlistId } });
  if (!shortlist) throw new NotFoundError('Shortlist');
  if (shortlist.ownerId !== input.userId) throw new NotFoundError('Shortlist');

  // Verify property exists
  const property = await prisma.property.findUnique({ where: { id: input.propertyId } });
  if (!property) throw new NotFoundError('Property');

  // Check for duplicate
  const existing = await prisma.shortlistItem.findUnique({
    where: {
      shortlistId_propertyId: {
        shortlistId: input.shortlistId,
        propertyId: input.propertyId,
      },
    },
  });
  if (existing) throw new ValidationError('Property is already in this shortlist');

  return prisma.shortlistItem.create({
    data: {
      shortlistId: input.shortlistId,
      propertyId: input.propertyId,
      note: input.note || null,
    },
    include: {
      property: {
        select: { id: true, title: true, location: true, price: true, imagesJson: true },
      },
    },
  });
}

export async function removeItem(shortlistId: string, propertyId: string, userId: string) {
  const shortlist = await prisma.shortlist.findUnique({ where: { id: shortlistId } });
  if (!shortlist) throw new NotFoundError('Shortlist');
  if (shortlist.ownerId !== userId) throw new NotFoundError('Shortlist');

  await prisma.shortlistItem.deleteMany({
    where: { shortlistId, propertyId },
  });
  return { removed: true };
}

export async function getSharedShortlist(token: string) {
  const shortlist = await prisma.shortlist.findUnique({
    where: { token },
    include: {
      items: {
        include: {
          property: {
            select: {
              id: true,
              title: true,
              location: true,
              price: true,
              price1Bed: true,
              price2Bed: true,
              imagesJson: true,
              rating: true,
              reviews: true,
              type: true,
              bedrooms: true,
              bathrooms: true,
            },
          },
        },
        orderBy: { addedAt: 'desc' },
      },
    },
  });

  if (!shortlist) throw new NotFoundError('Shortlist');

  return {
    ...shortlist,
    items: shortlist.items.map((item) => ({
      ...item,
      property: {
        ...item.property,
        images: (() => {
          try {
            const parsed = JSON.parse((item.property as any).imagesJson || '[]');
            return Array.isArray(parsed) ? parsed : [];
          } catch {
            return [];
          }
        })(),
      },
    })),
  };
}
