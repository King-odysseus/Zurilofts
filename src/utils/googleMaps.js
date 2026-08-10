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

export function googleMapsDirectionsUrl({ lat, lng, label = '', preferLabel = false }) {
  const latitude = Number(lat);
  const longitude = Number(lng);
  const hasCoordinates = hasMapCoordinates(lat, lng);
  const cleanLabel = String(label).trim();
  const destination = preferLabel && cleanLabel
    ? cleanLabel
    : hasCoordinates ? `${latitude},${longitude}` : cleanLabel;

  if (!destination) return 'https://www.google.com/maps';

  const params = new URLSearchParams({
    api: '1',
    destination,
    travelmode: 'driving',
    dir_action: 'navigate',
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}
