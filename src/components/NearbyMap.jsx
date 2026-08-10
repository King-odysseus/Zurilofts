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
  const markersRef = useRef(new Map());

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
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current.clear();

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
      directions.href = googleMapsDirectionsUrl({
        ...item,
        label: item.mapsQuery || `${item.name}, Nairobi, Kenya`,
        preferLabel: true,
      });
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
        .bindPopup(popup)
        .bindTooltip(item.name, { direction: 'top', offset: [0, -30] });

      markersRef.current.set(item.name, marker);
      bounds.extend([Number(item.lat), Number(item.lng)]);
    });

    if (items.length > 1 && bounds.isValid()) {
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
    } else if (items.length === 1) {
      map.setView([Number(items[0].lat), Number(items[0].lng)], 15);
    }

    // Invalidate size after render (helps when container was hidden/displayed)
    setTimeout(() => map.invalidateSize(), 100);
  }, [items]);

  function focusVenue(item) {
    const map = mapInstanceRef.current;
    const marker = markersRef.current.get(item.name);
    if (!map || !marker) return;
    map.flyTo([Number(item.lat), Number(item.lng)], 16, { duration: 0.7 });
    marker.openPopup();
  }

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
    <div className="mx-4 overflow-hidden rounded-2xl border border-[#D9D9D9] bg-white shadow-sm md:mx-0">
      <div className="grid lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div
          ref={mapRef}
          className="h-[420px] w-full md:h-[520px]"
          aria-label={`${title} map`}
        />
        <aside className="max-h-80 overflow-y-auto border-t border-[#D9D9D9] bg-white lg:max-h-[520px] lg:border-l lg:border-t-0" aria-label={`${title} locations`}>
          <div className="sticky top-0 z-10 border-b border-[#D9D9D9] bg-white px-4 py-3">
            <p className="font-bold text-[#0B0B45]">{items.length} locations</p>
            <p className="text-xs text-[#6b7280]">Select a venue to reveal its pin.</p>
          </div>
          {items.map((item) => (
            <div key={item.name} className="flex items-center gap-2 border-b border-[#D9D9D9]/70 px-3 py-3 last:border-0">
              <button
                type="button"
                onClick={() => focusVenue(item)}
                className="min-w-0 flex-1 text-left text-sm font-semibold text-[#0B0B45] hover:text-[#C49A6C] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#C49A6C]"
              >
                {item.name}
              </button>
              <a
                href={googleMapsDirectionsUrl({ ...item, label: item.mapsQuery || `${item.name}, Nairobi, Kenya`, preferLabel: true })}
                target="_blank"
                rel="noopener noreferrer"
                className="shrink-0 rounded-full bg-[#0B0B45] px-3 py-1.5 text-xs font-semibold text-white hover:bg-[#C49A6C]"
                aria-label={`Get directions to ${item.name}`}
              >
                Directions ↗
              </a>
            </div>
          ))}
        </aside>
      </div>
      <p className="bg-white px-4 py-3 text-center text-sm text-[#6b7280]">
        Tap a pin or venue name, then choose <span className="font-semibold text-[#0B0B45]">Get directions in Google Maps</span>.
      </p>
    </div>
  );
}

NearbyMap.propTypes = {
  items: PropTypes.arrayOf(PropTypes.shape({
    name: PropTypes.string.isRequired,
    desc: PropTypes.string,
    mapsQuery: PropTypes.string,
    lat: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
    lng: PropTypes.oneOfType([PropTypes.string, PropTypes.number]).isRequired,
  })).isRequired,
  title: PropTypes.string.isRequired,
};

export default NearbyMap;
