import prisma from '../config/prisma.js';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError } from '../types/index.js';

// Listing publication lifecycle - independent of the host's own account
// verification (User.role / HostApplication).
export const PROPERTY_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type ListingReviewAction = 'approve' | 'reject' | 'suspend' | 'unsuspend';

// ============================================================
// Listing lifecycle - pure transition logic, no database. Every DB-facing
// function below (submitPropertyForReview, adminReviewProperty) delegates its
// state-machine decision to these so the rules can be unit-tested in
// isolation (see tests/property.transitions.test.ts).
// ============================================================

/** Only a PUBLISHED listing may take bookings - draft/pending/rejected/
 *  suspended listings are never publicly bookable, independent of the host's
 *  own account verification. Used by booking.service.createBooking. */
export function isBookable(status: string): boolean {
  return status === 'PUBLISHED';
}

/** A host may submit a DRAFT or previously-REJECTED listing for review. */
export function canSubmitForReview(status: string): boolean {
  return status === 'DRAFT' || status === 'REJECTED';
}

export function assertCanSubmitForReview(status: string): void {
  if (!canSubmitForReview(status)) {
    throw new ValidationError(`Only a draft or rejected listing can be submitted for review (status: ${status}).`);
  }
}

/** Resolves the listing status an admin action moves to, or throws if the
 *  action is invalid for the listing's current status. */
export function planListingReview(status: string, action: ListingReviewAction): PropertyStatus {
  if (action === 'approve') {
    if (status !== 'PENDING_REVIEW') {
      throw new ValidationError(`Only a listing pending review can be approved (status: ${status}).`);
    }
    return 'PUBLISHED';
  }
  if (action === 'reject') {
    if (status !== 'PENDING_REVIEW') {
      throw new ValidationError(`Only a listing pending review can be rejected (status: ${status}).`);
    }
    return 'REJECTED';
  }
  if (action === 'suspend') {
    if (status !== 'PUBLISHED') {
      throw new ValidationError(`Only a published listing can be suspended (status: ${status}).`);
    }
    return 'SUSPENDED';
  }
  // unsuspend
  if (status !== 'SUSPENDED') {
    throw new ValidationError(`Only a suspended listing can be unsuspended (status: ${status}).`);
  }
  return 'PUBLISHED';
}

// SQLite stores arrays as JSON strings; Postgres uses native arrays.
// This helper normalizes both to JS arrays for API responses.
function normalizeProperty(property: any) {
  if (property.images !== undefined) {
    // PostgreSQL - native arrays
    return property;
  }
  // SQLite - JSON fields, map to expected property names
  const { imagesJson, amenitiesJson, nearbyJson, ...rest } = property;
  const parseArray = (value: string | null | undefined) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  return {
    ...rest,
    images: parseArray(imagesJson),
    amenities: parseArray(amenitiesJson),
    nearby: parseArray(nearbyJson),
  };
}

function normalizeProperties(properties: any[]) {
  return properties.map(normalizeProperty);
}

// Detect if we're using SQLite (JSON columns) or Postgres (native arrays)
function isSQLite(): boolean {
  // SQLite uses a file: URL and JSON string columns. Railway supplies a
  // PostgreSQL URL and the generated client uses native array columns.
  return (process.env.DATABASE_URL || '').trim().startsWith('file:');
}

function buildCreateData(data: any) {
  // Every new listing starts as a private draft, regardless of who creates it
  // or what status field (if any) was in the request body. Going live always
  // requires an explicit submit-for-review + admin approval - see
  // submitPropertyForReview / adminReviewProperty below.
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
      status: 'DRAFT',
    };
    if (data.hostId) base.hostId = data.hostId;
    if (data.price1Bed !== undefined) base.price1Bed = data.price1Bed;
    if (data.price2Bed !== undefined) base.price2Bed = data.price2Bed;
    if (data.bathrooms1Bed !== undefined) base.bathrooms1Bed = data.bathrooms1Bed;
    if (data.bathrooms2Bed !== undefined) base.bathrooms2Bed = data.bathrooms2Bed;
    return base;
  }
  const { status: _ignoredStatus, ...rest } = data;
  return { ...rest, status: 'DRAFT' };
}

function buildUpdateData(data: any) {
  // status is never writable through the plain update path - it only moves via
  // submitPropertyForReview / adminReviewProperty, which own their own audit
  // trail (submittedAt/listingReviewedBy/listingReviewedAt/listingReviewNote).
  const { status: _ignoredStatus, ...data2 } = data;
  const updateData: any = { ...data2 };
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
  // Allow clearing bed prices & bathrooms by sending null
  if (data.price1Bed === null) updateData.price1Bed = null;
  if (data.price2Bed === null) updateData.price2Bed = null;
  if (data.bathrooms1Bed === null) updateData.bathrooms1Bed = null;
  if (data.bathrooms2Bed === null) updateData.bathrooms2Bed = null;
  return updateData;
}

interface PropertyFilters {
  type?: string;
  minPrice?: number;
  maxPrice?: number;
  search?: string;
  neighborhood?: string;
  minBedrooms?: number;
  minRating?: number;
  available?: boolean;
  featured?: boolean;
  hostId?: string;
  status?: PropertyStatus;
  // Bypasses the public PUBLISHED-only filter - only ever set by admin-facing
  // callers (the admin property queue, which reviews DRAFT/PENDING_REVIEW too).
  includeAllStatuses?: boolean;
  page?: number;
  limit?: number;
}

export async function listProperties(filters: PropertyFilters) {
  const { type, minPrice, maxPrice, search, neighborhood, minBedrooms, minRating, available, featured, hostId, status, includeAllStatuses, page = 1, limit = 12 } = filters;
  const skip = (page - 1) * limit;

  const where: any = {};

  if (hostId) {
    where.hostId = hostId;
  } else if (!includeAllStatuses) {
    // Public discovery: hide listings of suspended hosts. Keeps null-host
    // properties and properties owned by active hosts.
    where.NOT = { host: { is: { suspended: true } } };
  }
  // Public/guest-facing discovery only ever surfaces PUBLISHED listings - a
  // host's own drafts and pending submissions are never publicly visible.
  // `hostId`-scoped calls (a host viewing their own listings) and admin's
  // `includeAllStatuses` calls see every lifecycle status.
  if (status) {
    where.status = status;
  } else if (!hostId && !includeAllStatuses) {
    where.status = 'PUBLISHED';
  }
  if (type) where.type = type;
  if (available !== undefined) where.available = available;
  if (featured !== undefined) where.featured = featured;
  if (minPrice !== undefined || maxPrice !== undefined) {
    where.price = {};
    if (minPrice !== undefined) where.price.gte = minPrice;
    if (maxPrice !== undefined) where.price.lte = maxPrice;
  }
  if (neighborhood) where.neighborhood = neighborhood;
  if (minBedrooms) where.bedrooms = { gte: minBedrooms };
  if (minRating) where.rating = { gte: minRating };
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

// `viewer` lets an unpublished listing still be read by its own host or an
// admin (e.g. previewing a draft before submitting it) while staying 404 to
// everyone else - draft/pending/rejected/suspended listings are never public.
export async function getProperty(id: string, viewer?: { sub: string; role: string } | null) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new NotFoundError('Property');
  const isOwnerOrAdmin = viewer && (viewer.role === 'ADMIN' || viewer.sub === property.hostId);
  if (property.status !== 'PUBLISHED' && !isOwnerOrAdmin) {
    throw new NotFoundError('Property');
  }
  return normalizeProperty(property);
}

export async function createProperty(data: any) {
  const property = await prisma.property.create({ data: buildCreateData(data) });
  return normalizeProperty(property);
}

export async function updateProperty(id: string, data: any, hostId?: string) {
  const where: any = { id };
  // If hostId provided, scope the update to properties owned by that user
  if (hostId) where.hostId = hostId;
  const property = await prisma.property.findUnique({ where });
  if (!property) throw new NotFoundError('Property');
  // A listing mid-review is frozen: editing it while an admin is looking at it
  // would let the host swap the details out from under that decision.
  if (property.status === 'PENDING_REVIEW') {
    throw new ValidationError('This listing is awaiting admin review and cannot be edited until that review completes.');
  }
  const updated = await prisma.property.update({ where: { id }, data: buildUpdateData(data) });
  return normalizeProperty(updated);
}

/**
 * Host submits a DRAFT or previously-REJECTED listing for admin review.
 * Requires the caller's own HostApplication to be APPROVED - a host may hold
 * and edit drafts at any verification stage, but may not put a listing in
 * front of guests until their own account verification is complete.
 */
export async function submitPropertyForReview(id: string, hostId: string) {
  const [property, application] = await Promise.all([
    prisma.property.findUnique({ where: { id, hostId } }),
    prisma.hostApplication.findUnique({ where: { userId: hostId }, select: { status: true } }),
  ]);
  if (!property) throw new NotFoundError('Property');
  if (application?.status !== 'APPROVED') {
    throw new ForbiddenError('Your host account must be verified before you can submit a listing for review.');
  }
  assertCanSubmitForReview(property.status);
  const updated = await prisma.property.update({
    where: { id },
    data: { status: 'PENDING_REVIEW', submittedAt: new Date(), listingReviewNote: null },
  });
  return normalizeProperty(updated);
}

/**
 * Admin action on a single listing's publication status. Independent of the
 * host's own account verification (HostApplication) - a fully verified host
 * can still have an individual listing rejected or suspended.
 */
export async function adminReviewProperty(
  id: string,
  reviewerId: string,
  action: ListingReviewAction,
  note?: string
) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new NotFoundError('Property');

  const nextStatus = planListingReview(property.status, action);

  const updated = await prisma.property.update({
    where: { id },
    data: {
      status: nextStatus,
      listingReviewNote: note ?? null,
      listingReviewedBy: reviewerId,
      listingReviewedAt: new Date(),
    },
  });
  return normalizeProperty(updated);
}

export async function getPropertiesByIds(ids: string[]) {
  if (!ids.length) return [];
  const properties = await prisma.property.findMany({
    where: { id: { in: ids } },
  });
  return normalizeProperties(properties);
}


// ---------------------------------------------------------------
// Similar properties - public discovery
// ---------------------------------------------------------------

/** Matches same location, then type, then closest price. Excludes the
 *  current property. Tops up with highly-rated or recent properties
 *  when fewer than `limit` matches are found. */
export async function getSimilarProperties(id: string, limit: number = 4) {
  const property = await prisma.property.findUnique({ where: { id } });
  if (!property) throw new NotFoundError('Property');

  const suspendedFilter = { host: { is: { suspended: true } } };
  const result: any[] = [];
  const seen = new Set<string>([id]);

  // Helper to collect up to `needed` properties from a query
  async function collect(
    needed: number,
    where: any,
    orderBy: any
  ): Promise<any[]> {
    if (needed <= 0) return [];
    const batch = await prisma.property.findMany({
      where: { ...where, id: { notIn: [...seen] }, NOT: suspendedFilter },
      take: needed,
      orderBy,
    });
    for (const p of batch) seen.add(p.id);
    return batch;
  }

  // 1. Same location
  const byLocation = await collect(limit, { location: property.location }, { rating: 'desc' });
  result.push(...byLocation);
  if (result.length >= limit) return normalizeProperties(result.slice(0, limit));

  // 2. Same type
  const byType = await collect(limit - result.length, { type: property.type }, { rating: 'desc' });
  result.push(...byType);
  if (result.length >= limit) return normalizeProperties(result.slice(0, limit));

  // 3. Closest price (within ~30% band)
  const priceBuffer = Math.max(Math.round(property.price * 0.3), 1000);
  const byPrice = await collect(
    limit - result.length,
    { price: { gte: property.price - priceBuffer, lte: property.price + priceBuffer } },
    { rating: 'desc' }
  );
  result.push(...byPrice);
  if (result.length >= limit) return normalizeProperties(result.slice(0, limit));

  // 4. Top up with highly-rated or recent
  const topUp = await collect(
    limit - result.length,
    {},
    [{ rating: 'desc' }, { createdAt: 'desc' }]
  );
  result.push(...topUp);

  return normalizeProperties(result.slice(0, limit));
}


export async function deleteProperty(id: string, hostId?: string) {
  const where: any = { id };
  // If hostId provided, scope the delete to properties owned by that user
  if (hostId) where.hostId = hostId;
  const property = await prisma.property.findUnique({ where });
  if (!property) throw new NotFoundError('Property');

  // A property that has ever been booked carries financial history (bookings,
  // earnings, payouts, reviews, disputes) that a hard delete would cascade away.
  // Deactivate the listing instead so the audit trail survives.
  const bookingCount = await prisma.booking.count({ where: { propertyId: id } });
  if (bookingCount > 0) {
    throw new ConflictError(
      'This property has booking history and cannot be deleted. Suspend or unpublish it instead to stop new bookings.'
    );
  }

  return prisma.property.delete({ where: { id } });
}
