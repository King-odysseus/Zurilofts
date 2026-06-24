import prisma from '../config/prisma.js';
import { NotFoundError } from '../types/index.js';

function normalizeProperty(p: any) {
  if (!p) return p;
  const x = { ...p };
  if (x.imagesJson) {
    try { x.images = JSON.parse(x.imagesJson); } catch { x.images = []; }
    delete x.imagesJson;
  }
  return x;
}

/** The user's favourited properties, newest first. */
export async function listFavorites(userId: string) {
  const favs = await prisma.favorite.findMany({
    where: { userId },
    orderBy: { createdAt: 'desc' },
    include: { property: true },
  });
  return favs.map((f) => normalizeProperty(f.property));
}

export async function addFavorite(userId: string, propertyId: string) {
  const property = await prisma.property.findUnique({ where: { id: propertyId } });
  if (!property) throw new NotFoundError('Property');
  await prisma.favorite.upsert({
    where: { userId_propertyId: { userId, propertyId } },
    create: { userId, propertyId },
    update: {},
  });
  return { propertyId, favorited: true };
}

export async function removeFavorite(userId: string, propertyId: string) {
  await prisma.favorite.deleteMany({ where: { userId, propertyId } });
  return { propertyId, favorited: false };
}
