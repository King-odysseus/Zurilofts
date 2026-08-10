import { useEffect, useRef } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon paths broken by bundlers (Vite/webpack)
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';
import { googleMapsDirectionsUrl } from '../utils/googleMaps.js';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

function NearbyMap({ items, title }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markersRef = useRef([]);

  useEffect(() => {
    if (!mapRef.current || items.length === 0) return;

    // Initialise map once
    if (!mapInstanceRef.current) {
      mapInstanceRef.current = L.map(mapRef.current).setView([-1.2921, 36.8219], 12);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
        maxZoom: 19,
      }).addTo(mapInstanceRef.current);
    }

    const map = mapInstanceRef.current;

    // Clear old markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    const bounds = L.latLngBounds();

    items.forEach((item) => {
      const popup = document.createElement('div');
      const heading = document.createElement('strong');
      heading.textContent = item.name;
      popup.appendChild(heading);

      if (item.desc) {
        const description = document.createElement('p');
        description.textContent = item.desc;
        description.style.margin = '6px 0 10px';
        popup.appendChild(description);
      }

      const directions = document.createElement('a');
      directions.href = googleMapsDirectionsUrl(item);
      directions.target = '_blank';
      directions.rel = 'noopener noreferrer';
      directions.textContent = 'Get directions in Google Maps';
      directions.setAttribute('aria-label', `Get directions to ${item.name} in Google Maps`);
      directions.style.cssText = 'display:inline-block;color:#0B0B45;font-weight:700;text-decoration:underline;';
      popup.appendChild(directions);

      const marker = L.marker([Number(item.lat), Number(item.lng)], {
        title: item.name,
        alt: `Map pin for ${item.name}`,
      })
        .addTo(map)
        .bindPopup(popup);

      markersRef.current.push(marker);
      bounds.extend([Number(item.lat), Number(item.lng)]);
    });

    if (items.length > 1 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (items.length === 1) {
      map.setView([items[0].lat, items[0].lng], 15);
    }

    // Invalidate size after render (helps when container was hidden/displayed)
    setTimeout(() => map.invalidateSize(), 100);
  }, [items]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div className="rounded-2xl overflow-hidden border border-[#D9D9D9] shadow-sm mx-4 md:mx-0">
      <div
        ref={mapRef}
        style={{ width: '100%', height: '500px' }}
        aria-label={`${title} map`}
      />
      <p className="bg-white px-4 py-3 text-center text-sm text-[#6b7280]">
        Tap a pin, then choose <span className="font-semibold text-[#0B0B45]">Get directions in Google Maps</span>.
      </p>
    </div>
  );
}

NearbyMap.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    desc: PropTypes.string,
    lat: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    lng: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  })).isRequired,
  title: PropTypes.string.isRequired,
};

export default NearbyMap;
