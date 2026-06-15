import prisma from '../config/prisma.js';
import { NotFoundError } from '../types/index.js';

// SQLite stores arrays as JSON strings; Postgres uses native arrays.
// This helper normalizes both to JS arrays for API responses.
function normalizeProperty(property: any) {
  if (property.images !== undefined) {
    // PostgreSQL — native arrays
    return property;
  }
  // SQLite — JSON fields, map to expected property names
  const { imagesJson, amenitiesJson, nearbyJson, ...rest } = property;
  return {
    ...rest,
    images: imagesJson ? JSON.parse(imagesJson) : [],
    amenities: amenitiesJson ? JSON.parse(amenitiesJson) : [],
    nearby: nearbyJson ? JSON.parse(nearbyJson) : [],
  };
}

function normalizeProperties(properties: any[]) {
  return properties.map(normalizeProperty);
}

// Detect if we're using SQLite (JSON columns) or Postgres (native arrays)
function isSQLite(): boolean {
  // SQLite Prisma client uses imagesJson; Postgres uses images
  return true; // always use JSON fields for local dev
}

function buildCreateData(data: any) {
  if (isSQLite()) {
    const base: any = {
      title: data.title,
      location: data.location,
      price: data.price,
      bedrooms: data.bedrooms,
      bathrooms: data.bathrooms,
      area: data.area,
      description: data.description,
      imagesJson: JSON.stringify(data.images || data.imagesJson || []),
      amenitiesJson: JSON.stringify(data.amenities || data.amenitiesJson || []),
      nearbyJson: JSON.stringify(data.nearby || data.nearbyJson || []),
      type: data.type,
      available: data.available,
      featured: data.featured,
      rating: data.rating,
      reviews: data.reviews,
    };
    if (data.price1Bed !== undefined) base.price1Bed = data.price1Bed;
    if (data.price2Bed !== undefined) base.price2Bed = data.price2Bed;
    return base;
  }
  return data;
}

function buildUpdateData(data: any) {
  const updateData: any = { ...data };
  if (isSQLite()) {
    if (data.images !== undefined) {
      updateData.imagesJson = JSON.stringify(data.images);
      delete updateData.images;
    }
    if (data.amenities !== undefined) {
      updateData.amenitiesJson = JSON.stringify(data.amenities);
      delete updateData.amenities;
    }
    if (data.nearby !== undefined) {
      updateData.nearbyJson = JSON.stringify(data.nearby);
      delete updateData.nearby;
    }
  }
  // Allow clearing bed prices by sending null
  if (data.price1Bed === null) updateData.price1Bed = null;
  if (data.price2Bed === null) updateData.price2Bed = null;
  return updateData;
}

interface PropertyFilters {
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  available?: boolean;
  featured?: boolean;
  page?: number;
  limit?: number;
}

export async function listProperties(filters: PropertyFilters) {
  const { type, minPrice, maxPrice, search, available, featured, page = 1, limit = 12 } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (type) where.type = type;
  if (available !== undefined) where.available = available;
  if (featured !== undefined) where.featured = featured;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }
  if (search) {
    where.OR = [
      { title: { contains: search } },
      { location: { contains: search } },
    ];
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy: [{ featured: 'desc' }, { createdAt: 'desc' }],
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties: normalizeProperties(properties),
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
}

export async function getProperty(id: string) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new NotFoundError('Property');
  return normalizeProperty(property);
}

export async function createProperty(data: any) {
  const property = await prisma.property.create({ data: buildCreateData(data) });
  return normalizeProperty(property);
}

export async function updateProperty(id: string, data: any) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new NotFoundError('Property');
  const updated = await prisma.property.update({ where: { id }, data: buildUpdateData(data) });
  return normalizeProperty(updated);
}

export async function deleteProperty(id: string) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new NotFoundError('Property');
  return prisma.property.delete({ where: { id } });
}
