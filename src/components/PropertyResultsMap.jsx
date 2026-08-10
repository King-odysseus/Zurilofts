import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { googleMapsDirectionsUrl, hasMapCoordinates } from '../utils/googleMaps.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({ iconRetinaUrl: markerIcon2x, iconUrl: markerIcon, shadowUrl: markerShadow });

function PropertyResultsMap({ listings }) {
  const mapElementRef = useRef(null);
  const mapRef = useRef(null);
  const markersRef = useRef([]);
  const hasCoordinates = listings.some((listing) => hasMapCoordinates(listing.lat, listing.lng));

  useEffect(() => {
    if (!hasCoordinates) {
      mapRef.current?.remove();
      mapRef.current = null;
      markersRef.current = [];
      return undefined;
    }
    if (!mapElementRef.current) return undefined;

    if (!mapRef.current) {
      mapRef.current = L.map(mapElementRef.current).setView([-1.2921, 36.8219], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapRef.current);
    }

    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    const uniqueListings = [...new Map(listings.map((listing) => [listing.id, listing])).values()]
      .filter((listing) => hasMapCoordinates(listing.lat, listing.lng));
    const bounds = L.latLngBounds();

    uniqueListings.forEach((listing) => {
      const popup = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = listing.title;
      popup.appendChild(heading);

      const location = document.createElement('p');
      location.textContent = listing.location || '';
      location.style.margin = '5px 0 10px';
      popup.appendChild(location);

      const propertyLink = document.createElement('a');
      propertyLink.href = `/property/${encodeURIComponent(listing.id)}`;
      propertyLink.textContent = 'View property';
      propertyLink.style.cssText = 'display:inline-block;margin-right:12px;color:#0B0B45;font-weight:700;text-decoration:underline;';
      popup.appendChild(propertyLink);

      const directionsLink = document.createElement('a');
      directionsLink.href = googleMapsDirectionsUrl({ lat: listing.lat, lng: listing.lng, label: listing.location });
      directionsLink.target = '_blank';
      directionsLink.rel = 'noopener noreferrer';
      directionsLink.textContent = 'Google Maps ↗';
      directionsLink.setAttribute('aria-label', `Get directions to ${listing.title} in Google Maps`);
      directionsLink.style.cssText = 'display:inline-block;color:#C49A6C;font-weight:700;text-decoration:underline;';
      popup.appendChild(directionsLink);

      const marker = L.marker([Number(listing.lat), Number(listing.lng)], {
        title: listing.title,
        alt: `Map pin for ${listing.title}`,
      }).addTo(mapRef.current).bindPopup(popup);
      markersRef.current.push(marker);
      bounds.extend([Number(listing.lat), Number(listing.lng)]);
    });

    if (bounds.isValid()) mapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    window.setTimeout(() => mapRef.current?.invalidateSize(), 100);

    return undefined;
  }, [hasCoordinates, listings]);

  useEffect(() => () => {
    mapRef.current?.remove();
    mapRef.current = null;
  }, []);

  if (!hasCoordinates) {
    return (
      <div className="rounded-2xl border border-[#D9D9D9] bg-white px-6 py-12 text-center text-[#6b7280]">
        Map coordinates are not available for these properties yet. Open a property to use its address in Google Maps.
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-[#D9D9D9] shadow-sm">
      <div ref={mapElementRef} className="h-[520px] w-full md:h-[600px]" aria-label="Property locations map" />
      <p className="bg-white px-4 py-3 text-center text-sm text-[#6b7280]">
        Tap a property pin to view the listing or open turn-by-turn directions in Google Maps.
      </p>
    </div>
  );
}

PropertyResultsMap.propTypes = {
  listings: PropTypes.arrayOf(PropTypes.shape({
    id: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    title: PropTypes.string.isRequired,
    location: PropTypes.string,
    lat: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
    lng: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
  })).isRequired,
};

export default PropertyResultsMap;
