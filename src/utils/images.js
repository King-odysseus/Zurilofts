/**
 * Resolve the first image URL for a property, regardless of which shape the
 * API returned. The API sometimes sends a singular `image` string, sometimes
 * a plural `images` array, and occasionally an un-normalised `imagesJson`
 * JSON string. Returns `null` when no image can be found so callers can fall
 * back to their placeholder.
 *
 * Order of preference:
 *   1. `property.image` if it is already a string (never clobber it)
 *   2. `property.images?.[0]`
 *   3. first entry of parsed `property.imagesJson` (a JSON string)
 *   4. `null`
 */
/**
 * Every image URL for a property, in order, tolerating the same three shapes
 * `firstImage` handles. The card gallery needs the whole list, and duplicating
 * the parse there is how the two helpers would drift apart.
 */
export function propertyImages(property) {
  if (!property) return [];

  if (Array.isArray(property.images) && property.images.length > 0) {
    return property.images.filter(Boolean);
  }

  if (property.imagesJson) {
    try {
      const parsed = JSON.parse(property.imagesJson);
      if (Array.isArray(parsed)) return parsed.filter(Boolean);
    } catch (err) {
      console.error('Failed to parse property images:', err);
    }
  }

  // A singular `image` string is the last resort, and only when nothing else
  // described the gallery.
  return typeof property.image === 'string' && property.image ? [property.image] : [];
}

export function firstImage(property) {
  if (!property) return null;

  if (typeof property.image === 'string' && property.image) {
    return property.image;
  }

  if (Array.isArray(property.images) && property.images.length > 0) {
    return property.images[0];
  }

  if (property.imagesJson) {
    try {
      const parsed = JSON.parse(property.imagesJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed[0];
      }
    } catch (err) {
      console.error('Failed to parse property images:', err);
    }
  }

  return null;
}
