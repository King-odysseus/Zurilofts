/**
 * Google Maps link builders - the app's only map feature.
 *
 * There is deliberately no embedded or interactive map: Leaflet, the
 * OpenStreetMap/CARTO tile hosts and the drop-a-pin location picker were all
 * removed. Every location in the UI is now a plain outbound link, so a listing
 * needs nothing more than a readable address. Building the URLs here keeps every
 * surface pointing at the same spot for the same listing.
 */

export function hasMapCoordinates(lat, lng) {
  if (lat === null || lat === undefined || lat === '' || lng === null || lng === undefined || lng === '') return false;
  const latitude = Number(lat);
  const longitude = Number(lng);
  return Number.isFinite(latitude)
    && Number.isFinite(longitude)
    && latitude >= -90
    && latitude <= 90
    && longitude >= -180
    && longitude <= 180;
}

/**
 * Decide what to hand Google Maps: a readable address when the caller asks for
 * one and we have it, otherwise the raw coordinates.
 *
 * Directions default to coordinates because they are exact for turn-by-turn use.
 * Search links default to the label, because a human-readable address is the
 * answer to "where is this place" and is the only thing new listings have - the
 * picker that produced coordinates is gone.
 */
function mapDestination({ lat, lng, label = '', preferLabel }) {
  const cleanLabel = String(label ?? '').trim();
  if (preferLabel && cleanLabel) return cleanLabel;
  if (hasMapCoordinates(lat, lng)) return `${Number(lat)},${Number(lng)}`;
  return cleanLabel;
}

/** Open Google Maps at a place. Used by the "Open in Google Maps" links. */
export function googleMapsSearchUrl({ lat, lng, label = '', preferLabel = true }) {
  const query = mapDestination({ lat, lng, label, preferLabel });
  if (!query) return 'https://www.google.com/maps';
  const params = new URLSearchParams({ api: '1', query });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

/** Start turn-by-turn directions to a place. Used by the "Get directions" links. */
export function googleMapsDirectionsUrl({ lat, lng, label = '', preferLabel = false }) {
  const destination = mapDestination({ lat, lng, label, preferLabel });
  if (!destination) return 'https://www.google.com/maps';
  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
    dir_action: 'navigate',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
