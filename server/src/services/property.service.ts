import prisma from '../config/prisma.js';
import type { Prisma } from '@prisma/client';
import { NotFoundError, ValidationError, ForbiddenError, ConflictError, propertyCreateSchema } from '../types/index.js';
import { isRangeAvailable } from './calendar.service.js';
import { deleteImage } from '../utils/imageStorage.js';
import { adminActor, recordAdminAuditSafely } from './audit.service.js';
import { paginationMeta, parseEnum, parsePaging } from '../utils/paging.js';

// Listing publication lifecycle - independent of the host's own account
// verification (User.role / HostApplication).
export const PROPERTY_STATUSES = ['DRAFT', 'PENDING_REVIEW', 'PUBLISHED', 'REJECTED', 'SUSPENDED'] as const;
export type PropertyStatus = (typeof PROPERTY_STATUSES)[number];
export type ListingReviewAction = 'approve' | 'reject' | 'suspend' | 'unsuspend';

/**
 * The host summary on the public property detail response.
 *
 * Only what a guest needs to judge whether to book: who the host is, when they
 * joined, and whether ZuriLofts has verified them. Contact details and payout
 * destinations are deliberately absent, because this object is served to
 * anyone on the internet. Built by getProperty, never read straight off the
 * User row.
 */
export interface PublicHostSummary {
  id: string;
  // First name only. This object is served to anyone on the internet, and a
  // surname adds nothing to a booking decision while making the host
  // personally identifiable. Admin endpoints carry the full name for staff.
  firstName: string;
  avatar: string | null;
  /** When the host account was created, so the badge can say "host since ...". */
  memberSince: Date;
  /** User identity verification APPROVED - the person is who they say they are. */
  identityVerified: boolean;
  /** HostApplication APPROVED - ZuriLofts has approved them to host. */
  hostVerified: boolean;
}

// ============================================================
// Listing lifecycle - pure transition logic, no database. Every DB-facing
// function below (submitPropertyForReview, adminReviewProperty) delegates its
// state-machine decision to these so the rules can be unit-tested in
// isolation (see tests/property.transitions.test.ts).
// ============================================================

/** Only a PUBLISHED listing may take bookings - draft/pending/rejected/
 *  suspended listings are never publicly bookable, independent of the host's
 *  own account verification. Used by booking.service.createBooking. */
/**
 * Validates a pair of raw `checkIn`/`checkOut` query values into real Dates
 * for the list availability filter, or `null` when the pair can't define a
 * real range (missing half, unparseable, or checkOut not after checkIn).
 * A lone date is intentionally ignored rather than guessed at.
 */
export function parseAvailabilityDateRange(
  checkIn: unknown,
  checkOut: unknown
): { checkIn: Date; checkOut: Date } | null {
  if (typeof checkIn !== 'string' || !checkIn || typeof checkOut !== 'string' || !checkOut) return null;
  const checkInDate = new Date(checkIn);
  const checkOutDate = new Date(checkOut);
  if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) return null;
  if (checkOutDate <= checkInDate) return null;
  return { checkIn: checkInDate, checkOut: checkOutDate };
}

/**
 * First image URL for a property row, regardless of whether the DB stores
 * images as a native Postgres array (`images`) or a SQLite JSON string
 * (`imagesJson`) - same duck-typing normalizeProperty uses. Returns null
 * when there's no image rather than fabricating one; callers (e.g. a
 * shortlist collage) must handle that themselves.
 */
export function firstPropertyImage(property: any): string | null {
  if (Array.isArray(property?.images)) return property.images[0] ?? null;
  if (typeof property?.imagesJson === 'string') {
    try {
      const parsed = JSON.parse(property.imagesJson);
      return Array.isArray(parsed) ? (parsed[0] ?? null) : null;
    } catch {
      return null;
    }
  }
  return null;
}

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

/** A host takes a live or in-review listing back to DRAFT. Existing stays keep
 *  working because only new bookings check isBookable. */
export function planHostUnpublish(status: string): PropertyStatus {
  if (status !== 'PUBLISHED' && status !== 'PENDING_REVIEW') {
    throw new ValidationError(`Only a published or pending listing can be unlisted (status: ${status}).`);
  }
  return 'DRAFT';
}

/**
 * Whether a listing can be hard-deleted given its bookings. A paid booking
 * carries earnings, payouts, reviews and possibly disputes that a delete would
 * cascade away, so any paid booking blocks it. Unpaid ones (abandoned
 * checkouts, cancelled before payment) hold no financial record and are
 * removed with the listing.
 */
export function listingDeleteVerdict(bookings: { paidAt: Date | null }[]): {
  canDelete: boolean;
  paid: number;
  unpaid: number;
} {
  const paid = bookings.filter((booking) => booking.paidAt !== null).length;
  return { canDelete: paid === 0, paid, unpaid: bookings.length - paid };
}

// Both schemas store these lists as JSON strings, so this turns the stored
// columns back into the arrays the API returns.
function normalizeProperty(property: any) {
  const { houseRulesJson, ...rest } = property;
  const toArray = (value: string | null | undefined) => {
    if (!value) return [];
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };
  // Both schemas keep these lists as JSON strings, so one mapping serves both
  // providers. There is no native-array branch to switch on (see
  // withJsonListColumns for the write side, which is where that assumption
  // actually broke production).
  const { imagesJson, amenitiesJson, nearbyJson, ...fields } = rest;
  return {
    ...fields,
    images: toArray(imagesJson),
    amenities: toArray(amenitiesJson),
    nearby: toArray(nearbyJson),
    houseRules: toArray(houseRulesJson),
  };
}

/**
 * The rating/reviews columns on Property are a cache, and a seeded demo
 * listing can carry numbers with no review rows behind them: the cards then
 * advertise "4.8 from 7 reviews" while the detail page has nothing to show.
 * Recompute both from the visible reviews on the way out so the card, the
 * detail page and the admin views all report the same real figure.
 */
export async function withLiveRatings<T extends { id: string }>(properties: T[]): Promise<T[]> {
  if (!properties.length) return properties;
  const aggregates = await prisma.review.groupBy({
    by: ['propertyId'],
    where: { hidden: false, propertyId: { in: properties.map((p) => p.id) } },
    _avg: { rating: true },
    _count: { _all: true },
  });
  const byProperty = new Map(aggregates.map((row) => [row.propertyId, row]));
  return properties.map((property) => {
    const row = byProperty.get(property.id);
    const count = row?._count._all ?? 0;
    const average = row?._avg.rating ?? 0;
    return {
      ...property,
      rating: count > 0 ? Math.round(average * 10) / 10 : 0,
      reviews: count,
    };
  });
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

// Both Prisma schemas keep the list columns as JSON strings: imagesJson,
// amenitiesJson, nearbyJson and houseRulesJson. Postgres never moved to native
// arrays, so a body still carrying the plural API names (images, amenities,
// nearby, houseRules) has to be re-keyed before Prisma sees it. Miss that and
// production answers every listing save with "Unknown argument `images`".
const JSON_LIST_COLUMNS: Record<string, string> = {
  images: 'imagesJson',
  amenities: 'amenitiesJson',
  nearby: 'nearbyJson',
  houseRules: 'houseRulesJson',
};

function withJsonListColumns(data: Record<string, any>): Record<string, any> {
  const mapped: Record<string, any> = {};
  for (const [key, value] of Object.entries(data)) {
    // Dropping the key rather than writing a value is what keeps "the host did
    // not touch this field" intact, so the column default applies instead of an
    // empty list overwriting what is already stored.
    if (value === undefined) continue;
    const column = JSON_LIST_COLUMNS[key];
    if (!column) {
      mapped[key] = value;
      continue;
    }
    // A caller may already hold the stored string form; encoding that again
    // would nest a JSON string inside a JSON string, so only arrays are encoded.
    mapped[column] = typeof value === 'string' ? value : JSON.stringify(Array.isArray(value) ? value : []);
  }
  return mapped;
}

export function buildCreateData(raw: any) {
  // One conversion for both providers. The columns are the same shape on each,
  // and branching on the provider is what let the two drift apart.
  const data = withJsonListColumns(raw);
  // Every new listing starts as a private draft, regardless of who creates it
  // or what status field (if any) was in the request body. Going live always
  // requires an explicit submit-for-review + admin approval - see
  // submitPropertyForReview / adminReviewProperty below.
  //
  // These eight columns are NOT NULL, but the draft route lets a host save a
  // listing with only some fields filled, so an omitted one still needs a value
  // here or Prisma throws and the host loses their work. 0 / '' are the honest
  // "not set yet" values: the listing is a private draft, never shown to guests.
  const defaults = {
    title: '',
    location: '',
    price: 0,
    bedrooms: 1,
    bathrooms: 1,
    area: 0,
    description: '',
    type: 'apartment',
  };
  if (isSQLite()) {
    const base: any = {
      title: data.title ?? defaults.title,
      location: data.location ?? defaults.location,
      neighborhood: data.neighborhood,
      price: data.price ?? defaults.price,
      bedrooms: data.bedrooms ?? defaults.bedrooms,
      bathrooms: data.bathrooms ?? defaults.bathrooms,
      area: data.area ?? defaults.area,
      description: data.description ?? defaults.description,
      imagesJson: data.imagesJson ?? '[]',
      amenitiesJson: data.amenitiesJson ?? '[]',
      nearbyJson: data.nearbyJson ?? '[]',
      type: data.type ?? defaults.type,
      available: data.available,
      featured: data.featured,
      rating: data.rating,
      reviews: data.reviews,
      status: 'DRAFT',
    };
    if (data.hostId) base.hostId = data.hostId;
    if (data.lat !== undefined) base.lat = data.lat;
    if (data.lng !== undefined) base.lng = data.lng;
    if (data.address !== undefined) base.address = data.address;
    if (data.price1Bed !== undefined) base.price1Bed = data.price1Bed;
    if (data.price2Bed !== undefined) base.price2Bed = data.price2Bed;
    if (data.bathrooms1Bed !== undefined) base.bathrooms1Bed = data.bathrooms1Bed;
    if (data.bathrooms2Bed !== undefined) base.bathrooms2Bed = data.bathrooms2Bed;
    // Arrival guide. houseRules travels as an array and is stored as JSON, the
    // same way images/amenities/nearby are.
    if (data.directions !== undefined) base.directions = data.directions;
    if (data.checkInMethod !== undefined) base.checkInMethod = data.checkInMethod;
    if (data.checkInWindowStart !== undefined) base.checkInWindowStart = data.checkInWindowStart;
    if (data.checkInWindowEnd !== undefined) base.checkInWindowEnd = data.checkInWindowEnd;
    if (data.checkOutTime !== undefined) base.checkOutTime = data.checkOutTime;
    if (data.wifiNetwork !== undefined) base.wifiNetwork = data.wifiNetwork;
    if (data.wifiPassword !== undefined) base.wifiPassword = data.wifiPassword;
    if (data.houseManual !== undefined) base.houseManual = data.houseManual;
    base.houseRulesJson = data.houseRulesJson ?? '[]';
    return base;
  }
  const { status: _ignoredStatus, ...rest } = data;
  // The defaults go in first and whatever the host actually sent overwrites
  // them. A key that arrived as undefined is skipped: spreading it would put
  // undefined back over a default, which is exactly what makes Prisma reject
  // the insert on a NOT NULL column.
  const payload: any = { ...defaults };
  for (const [key, value] of Object.entries(rest)) {
    if (value !== undefined) payload[key] = value;
  }
  payload.houseRulesJson = data.houseRulesJson ?? '[]';
  payload.status = 'DRAFT';
  return payload;
}

export function buildUpdateData(raw: any) {
  // Same conversion as create. An update carrying photos sent them as `images`
  // and was refused on Postgres for exactly the reason create was.
  const data = withJsonListColumns(raw);
  // status is never writable through the plain update path - it only moves via
  // submitPropertyForReview / adminReviewProperty, which own their own audit
  // trail (submittedAt/listingReviewedBy/listingReviewedAt/listingReviewNote).
  const { status: _ignoredStatus, ...data2 } = data;
  const updateData: any = { ...data2 };
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
  minBathrooms?: number;
  amenities?: string[];
  sort?: string;
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
  // Optional stay dates for real availability filtering (see below) - not a
  // Prisma `where` column, since availability depends on bookings/blocks.
  checkIn?: Date;
  checkOut?: Date;
}

/**
 * Builds a location-aware property search. Comma-separated selections such as
 * "Westlands, Nairobi" are treated as separate required tokens so a listing
 * must satisfy each part of the chosen area while still matching across title,
 * location, neighbourhood, and confirmed address.
 */
export function buildPropertySearchWhere(search?: string) {
  const tokens = String(search || '')
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean);

  if (!tokens.length) return null;

  return {
    AND: tokens.map((token) => ({
      OR: [
        { title: { contains: token } },
        { location: { contains: token } },
        { neighborhood: { contains: token } },
        { address: { contains: token } },
      ],
    })),
  };
}

type PropertySort = 'recommended' | 'price_asc' | 'price_desc' | 'rating' | 'newest' | 'oldest';

/** Maps the public ?sort= value to a Prisma orderBy; unknown values fall back to the default ranking. */
export function buildPropertyOrderBy(sort?: string) {
  switch (sort as PropertySort) {
    case 'price_asc': return [{ price: 'asc' as const }, { createdAt: 'desc' as const }];
    case 'price_desc': return [{ price: 'desc' as const }, { createdAt: 'desc' as const }];
    case 'rating': return [{ rating: 'desc' as const }, { reviews: 'desc' as const }];
    case 'newest': return [{ createdAt: 'desc' as const }];
    // Oldest first is what a moderation queue wants: the longest-waiting
    // submission is the one a guest or host is blocked on.
    case 'oldest': return [{ createdAt: 'asc' as const }];
    default: return [{ featured: 'desc' as const }, { createdAt: 'desc' as const }];
  }
}

export async function listProperties(filters: PropertyFilters) {
  const { type, minPrice, maxPrice, search, neighborhood, minBedrooms, minBathrooms, amenities, sort, minRating, available, featured, hostId, status, includeAllStatuses, page = 1, limit = 12, checkIn, checkOut } = filters;
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
  if (minBathrooms) where.bathrooms = { gte: minBathrooms };
  // amenitiesJson is a JSON string array, so each required amenity is a substring match; all must be present.
  if (amenities?.length) {
    where.AND = [...(where.AND || []), ...amenities.map((a) => ({ amenitiesJson: { contains: a } }))];
  }
  if (minRating) where.rating = { gte: minRating };
  const searchWhere = buildPropertySearchWhere(search);
  if (searchWhere) {
    where.AND = [...(where.AND || []), ...searchWhere.AND];
  }
  const orderBy = buildPropertyOrderBy(sort);

  // Real stay-date availability filtering: reuses the same isRangeAvailable
  // check the booking flow validates against (calendar blocks + non-cancelled
  // bookings), so a listing that survives this filter is authoritatively
  // free for the requested dates - not a text-search guess. Pagination must
  // apply to the filtered set, so this fetches every `where` match first and
  // pages the availability-filtered result in memory rather than at the DB
  // level; acceptable at this catalogue's scale.
  if (checkIn && checkOut) {
    const candidates = await prisma.property.findMany({
      where,
      orderBy,
    });
    const availabilityFlags = await Promise.all(
      candidates.map((p) => isRangeAvailable(p.id, checkIn, checkOut))
    );
    const available = candidates.filter((_, i) => availabilityFlags[i]);
    const total = available.length;
    const paged = available.slice(skip, skip + limit);
    return {
      properties: await withLiveRatings(normalizeProperties(paged)),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  const [properties, total] = await Promise.all([
    prisma.property.findMany({
      where,
      skip,
      take: limit,
      orderBy,
    }),
    prisma.property.count({ where }),
  ]);

  return {
    properties: await withLiveRatings(normalizeProperties(properties)),
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
  const property = await prisma.property.findUnique({
    where: { id },
    // This select is the security boundary for the public detail response.
    // Whatever is listed here is served to signed-out visitors, so it must
    // never grow email, phone, bankName, bankAccountNo, bankCode, mpesaPhone,
    // any paystack* recipient field, or any document relation. Add a field here
    // only if it is safe to publish on a billboard.
    include: {
      host: {
        select: {
          id: true,
          firstName: true,
          avatar: true,
          createdAt: true,
          identityVerification: { select: { status: true } },
          hostApplication: { select: { status: true } },
        },
      },
    },
  });
  if (!property) throw new NotFoundError('Property');
  const isOwnerOrAdmin = viewer && (viewer.role === 'ADMIN' || viewer.sub === property.hostId);
  if (property.status !== 'PUBLISHED' && !isOwnerOrAdmin) {
    throw new NotFoundError('Property');
  }

  // The summary is hand-built from the narrow select above instead of passing
  // the relation through. That way the shape of a public response is decided
  // here and cannot silently widen when a column is added to User: a new
  // contact or payout field is invisible to this payload until someone edits
  // this object on purpose. The two verification relations are collapsed to
  // booleans for the same reason - the host only ever shows as verified or not.
  //
  // The aggregate guest rating is not part of this object; it is attached by
  // the caller that already reads reviews for the listing.
  const { host, ...rest } = property;
  // hostId is nullable, so a property can exist with no host row left to read.
  const hostSummary: PublicHostSummary | null = host
    ? {
        id: host.id,
        firstName: host.firstName,
        avatar: host.avatar,
        memberSince: host.createdAt,
        identityVerified: host.identityVerification?.status === 'APPROVED',
        hostVerified: host.hostApplication?.status === 'APPROVED',
      }
    : null;

  return { ...normalizeProperty(rest), host: hostSummary };
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
 * A draft may be saved almost empty (see propertyDraftCreateSchema), so this is
 * the point of no return: a listing carrying nothing a guest could act on must
 * not reach the admin queue, where it would be reviewed and published blank.
 * The create schema is the definition of a complete listing, so it is reused
 * here rather than restating which fields matter.
 */
function assertListingIsComplete(property: Record<string, unknown>): void {
  // The stored row carries null for every optional column the host never filled
  // (neighborhood, the per-bed rates, the legacy pin). Those fields are optional
  // in the schema but not nullable, so a null would read as a bad value rather
  // than an absent one and refuse a perfectly good listing. Dropping them makes
  // "null in the database" mean the same thing as "not sent" here.
  const present = Object.fromEntries(
    Object.entries(property).filter(([, value]) => value !== null && value !== undefined)
  );

  const result = propertyCreateSchema.safeParse(present);
  if (result.success) return;
  const missing = [...new Set(result.error.issues.map((issue) => String(issue.path[0] ?? '')))].filter(Boolean);
  throw new ValidationError(
    `This listing is not ready to submit yet. Finish these first: ${missing.join(', ')}.`
  );
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
  assertListingIsComplete(normalizeProperty(property));
  const updated = await prisma.property.update({
    where: { id },
    data: { status: 'PENDING_REVIEW', submittedAt: new Date(), listingReviewNote: null },
  });
  return normalizeProperty(updated);
}

/**
 * What the host is told when an admin decides on one of their listings.
 *
 * Kept pure and exported so the wording can be asserted without a database and
 * so the push body and the in-app copy cannot drift apart. A reviewer's note is
 * the reason the host has to read, so it wins over the generic sentence: "Update
 * the requested details" tells them nothing when the reviewer already said which
 * photo is wrong.
 *
 * Approval is the one decision with nothing to do, so it opens the listings page
 * rather than to the editor.
 */
export function listingDecisionNotice(input: {
  action: ListingReviewAction;
  title: string;
  note?: string | null;
  propertyId: string;
}): { title: string; body: string; url: string } {
  const name = input.title || 'your listing';
  const note = (input.note || '').trim();
  const editUrl = `/host/listings/${input.propertyId}/edit`;

  switch (input.action) {
    case 'approve':
      return {
        title: 'Your listing is live',
        body: `${name} is now visible to guests and open for bookings.`,
        url: '/host/listings',
      };
    case 'reject':
      return {
        title: 'Changes needed on your listing',
        body: note
          ? `${name} was not approved. ${note}`
          : `${name} was not approved. Update the requested details and submit it again.`,
        url: editUrl,
      };
    case 'suspend':
      return {
        title: 'Your listing is hidden',
        body: note
          ? `${name} has been hidden from guests. ${note}`
          : `${name} has been hidden from guests.`,
        url: '/host/listings',
      };
    // unsuspend
    default:
      return {
        title: 'Your listing is live again',
        body: `${name} is visible to guests again.`,
        url: '/host/listings',
      };
  }
}

/**
 * Governance action for each review outcome, so the log, the status machine and
 * the API's own vocabulary cannot drift apart.
 * A verified host can still have one listing taken down by review.
 */
const LISTING_AUDIT_ACTION: Record<ListingReviewAction, 'LISTING_APPROVED' | 'LISTING_REJECTED' | 'LISTING_SUSPENDED' | 'LISTING_RESTORED'> = {
  approve: 'LISTING_APPROVED',
  reject: 'LISTING_REJECTED',
  suspend: 'LISTING_SUSPENDED',
  unsuspend: 'LISTING_RESTORED',
};

/**
 * Admin action on a single listing's publication status. Independent of the
 * host's own account verification (HostApplication) - a fully verified host can
 * still have an individual listing rejected or suspended. The decision is
 * recorded in the governance log, which outlives the listing itself.
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

  // Governance entry, written before the notification because the decision is
  // what must be durable: a failed push must not cost us the record of who
  // decided it. Written after the update commits, so a logging failure is
  // surfaced in the log rather than reported to the reviewer as a failed
  // decision that actually happened (see recordAdminAuditSafely).
  await recordAdminAuditSafely({
    actor: adminActor({ id: reviewerId }),
    action: LISTING_AUDIT_ACTION[action],
    targetType: 'Listing',
    targetId: updated.id,
    // Snapshotted: this row must still say what was removed after the listing
    // itself is deleted.
    targetLabel: updated.title,
    reason: note ?? null,
    metadata: {
      previousStatus: property.status,
      nextStatus,
      hostId: updated.hostId,
      neighborhood: updated.neighborhood ?? null,
    },
  });

  // Tell the host. The decision is already committed, so a host who never enabled
  // push notifications must not lose the review over a failed send: this is
  // best-effort and their listing card carries the same note either way.
  // hostId is nullable (an admin-created listing may have none), so there may be
  // nobody to notify.
  try {
    if (updated.hostId) {
      const { sendPushToUser } = await import('./push.service.js');
      const notice = listingDecisionNotice({
        action,
        title: updated.title,
        note,
        propertyId: updated.id,
      });
      await sendPushToUser(updated.hostId, notice.title, notice.body, notice.url);
    }
  } catch (err) {
    console.error('Listing decision notification failed:', err);
  }

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

  // A property with a paid booking carries financial history (earnings,
  // payouts, reviews, disputes) that a hard delete would cascade away.
  // Unlist or suspend it instead so the audit trail survives.
  const bookings = await prisma.booking.findMany({ where: { propertyId: id }, select: { paidAt: true } });
  const verdict = listingDeleteVerdict(bookings);
  if (!verdict.canDelete) {
    throw new ConflictError(
      `This listing has ${verdict.paid} paid booking${verdict.paid === 1 ? '' : 's'} and cannot be deleted. Unlist it instead to stop new bookings.`
    );
  }

  try {
    // Unpaid bookings go first: the Booking-to-Property relation has no cascade.
    const [, deleted] = await prisma.$transaction([
      prisma.booking.deleteMany({ where: { propertyId: id, paidAt: null } }),
      prisma.property.delete({ where: { id } }),
    ]);
    // After the commit, and best-effort: a leftover file is harmless, a
    // missing photo on a live listing is not.
    await Promise.all(parseImageUrls(property.imagesJson).map((url) => deleteImage(url)));
    return deleted;
  } catch (err) {
    // A booking was paid between the check above and the delete (foreign key).
    if ((err as { code?: string })?.code === 'P2003') {
      throw new ConflictError('This listing just received a booking and cannot be deleted. Unlist it instead.');
    }
    throw err;
  }
}

function parseImageUrls(imagesJson: string | null | undefined): string[] {
  try {
    const parsed = JSON.parse(imagesJson || '[]');
    return Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === 'string') : [];
  } catch {
    return [];
  }
}

/** Host takes their own listing off the market without losing it. */
export async function unpublishProperty(id: string, hostId: string) {
  const property = await prisma.property.findUnique({ where: { id, hostId } });
  if (!property) throw new NotFoundError('Property');
  const status = planHostUnpublish(property.status);
  const updated = await prisma.property.update({ where: { id }, data: { status } });
  return normalizeProperty(updated);
}

/** Listings with no host account, with the booking counts an admin needs to
 *  decide between deleting and suspending each one. */
export interface OrphanedListingFilters {
  search?: string;
  status?: string;
  page?: number;
  limit?: number;
}

export async function listOrphanedProperties(filters: OrphanedListingFilters = {}) {
  const paging = parsePaging({ page: filters.page, limit: filters.limit });
  const where: Prisma.PropertyWhereInput = { hostId: null };

  const search = filters.search?.trim();
  if (search) {
    where.OR = [{ title: { contains: search } }, { location: { contains: search } }];
  }
  // Only a real status, so a typo cannot silently return everything.
  const status = parseEnum(filters.status, PROPERTY_STATUSES);
  if (status) where.status = status;

  const total = await prisma.property.count({ where });
  const rows = await prisma.property.findMany({
      where,
      skip: paging.skip,
      take: paging.limit,
    orderBy: { createdAt: 'desc' },
    select: {
      id: true,
      title: true,
      location: true,
      status: true,
      createdAt: true,
      imagesJson: true,
      bookings: { select: { paidAt: true } },
    },
  });
  const data = rows.map(({ bookings, imagesJson, ...rest }) => ({
    ...rest,
    image: parseImageUrls(imagesJson)[0] ?? null,
    ...listingDeleteVerdict(bookings),
  }));

  return { data, pagination: paginationMeta(total, paging) };
}

/**
 * Admin cleanup of host-less listings. Ids are re-checked here (hostId must
 * still be null) so a stale list can never delete a listing that was assigned
 * a host meanwhile. Each id is reported on its own; one failure does not abort
 * the rest. Suspend only applies to PUBLISHED listings, others are already off
 * the market.
 */
export async function cleanupOrphanedProperties(ids: string[], mode: 'delete' | 'suspend', adminId: string) {
  const orphans = await prisma.property.findMany({
    where: { id: { in: ids }, hostId: null },
    select: { id: true, status: true, title: true },
  });
  const orphanById = new Map(orphans.map((orphan) => [orphan.id, orphan]));
  // Captured before deletion, so the governance entry can still name the listing.
  const labels = new Map(orphans.map((orphan) => [orphan.id, orphan.title]));

  const results: { id: string; outcome: 'deleted' | 'suspended' | 'skipped'; reason?: string }[] = [];
  for (const id of ids) {
    const orphan = orphanById.get(id);
    if (!orphan) {
      results.push({ id, outcome: 'skipped', reason: 'Not found or no longer without a host' });
      continue;
    }
    try {
      if (mode === 'delete') {
        await deleteProperty(id);
        results.push({ id, outcome: 'deleted' });
      } else if (orphan.status === 'PUBLISHED') {
        await adminReviewProperty(id, adminId, 'suspend', 'Listing has no host account');
        results.push({ id, outcome: 'suspended' });
      } else {
        results.push({ id, outcome: 'skipped', reason: `Already off the market (${orphan.status})` });
      }
    } catch (err) {
      results.push({ id, outcome: 'skipped', reason: err instanceof Error ? err.message : 'Failed' });
    }
  }
  // This used to be a console.info line, which is not a record: the deleted
  // listings are gone and stdout is not queryable. Each outcome is now an
  // append-only entry that names the listing by title.
  for (const result of results) {



    // Only deletions are recorded here: suspensions are already recorded above
    // by adminReviewProperty, and a skipped id or a missing listing changed
    // nothing, so there is no decision to record.
    if (result.outcome !== 'deleted') continue;
    await recordAdminAuditSafely({
      actor: adminActor({ id: adminId }),
      action: 'ORPHAN_LISTINGS_CLEANED',
      targetType: 'Listing',
      targetId: result.id,
      targetLabel: labels.get(result.id) ?? null,
      reason: 'Removed: listing had no host account',
      metadata: { mode },


      // mode records what the admin asked for; the outcome is fixed here (only
      // deletions reach this point), so there is nothing more to say.
    });
  }
  return results;
}
