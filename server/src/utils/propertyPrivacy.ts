/**
 * What a property row may expose to someone who is not the owner or an admin.
 *
 * The arrival guide (how to get in, Wi-Fi credentials, house manual), the iCal
 * feed token and the internal listing-review trail left the server on every
 * public read path until these lists existed: `getProperty`'s comment claimed
 * its `select` was the boundary, but it is an `include`, so every column came
 * back to signed-out visitors.
 *
 * Kept in its own module so the rules can be unit-tested without a database.
 */

/** Columns that must never reach a visitor. */
export const PRIVATE_PROPERTY_FIELDS = [
  'directions',
  'checkInMethod',
  'wifiNetwork',
  'wifiPassword',
  'houseManual',
  'icalToken',
  'listingReviewNote',
  'listingReviewedBy',
  'listingReviewedAt',
] as const;

/**
 * Columns that a host-authored body may never write: ownership, the marketing
 * flag, the ops review trail, the calendar token and the aggregate rating all
 * belong to the workflow that owns them. Zod strips unknown keys today; this
 * keeps a future schema change from becoming an ownership or audit hole.
 */
export const UNWRITABLE_PROPERTY_FIELDS = [
  'status',
  'hostId',
  'featured',
  'icalToken',
  'listingReviewNote',
  'listingReviewedBy',
  'listingReviewedAt',
  'submittedAt',
  'rating',
  'reviews',
] as const;

/** Removes the host-only columns from a property object, in place of a copy. */
export function toPublicProperty<T>(property: T): T {
  const publicCopy = { ...(property as Record<string, unknown>) };
  for (const field of PRIVATE_PROPERTY_FIELDS) delete publicCopy[field];
  return publicCopy as T;
}

/**
 * The listing inside a booking payload, cut down for whoever is reading it.
 *
 * A booking response carries the whole property row. For the guest that is a
 * hole: anyone can create a PENDING booking on any published listing (or cancel
 * one) and read the result, which used to hand back the door instructions, the
 * Wi-Fi password and the host's iCal token without a single shilling paid.
 * A cancelled or never-paid stay is not an arrival.
 *
 * The owner (the host whose listing it is) and an admin keep everything. A
 * guest unlocks the arrival guide only once the booking is CONFIRMED, which is
 * the same rule the booking screen states.
 */
export function propertyForBookingViewer<T>(
  property: T,
  options: { status?: string | null; isOwner: boolean }
): T {
  if (!property || typeof property !== 'object') return property;
  if (options.isOwner) return property;
  if (options.status === 'CONFIRMED') return property;
  return toPublicProperty(property);
}
