import { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Fix Leaflet default marker icon paths broken by bundlers (Vite/webpack) -
// same fix as NearbyMap.jsx so the shared icon is correct module-wide.
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
});

const NAIROBI_CENTER = [-1.2864, 36.8172];
const ZOOM_CITY = 12;
const ZOOM_PIN = 16;

// Nominatim reverse-geocoding (free, no API key) - ask for a compact
// street-level label rather than the full admin-country chain.
function isFiniteCoord(value) {
  const n = Number(value);
  return value != null && value !== '' && Number.isFinite(n);
}

function reverseGeocode(lat, lng, signal) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('addressdetails', '1');
  return fetch(url, { signal, headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data || typeof data !== 'object') return '';
      const a = data.address || {};
      const street = a.house_number ? `${a.house_number} ${a.road || a.pedestrian || ''}`.trim() : a.road || a.pedestrian || '';
      const parts = [
        street,
        a.building || a.amenity || a.shop || a.tourism || a.neighbourhood,
        a.suburb,
        a.city_district,
        a.city || a.town || a.municipality || a.village,
      ].filter(Boolean);
      const joined = parts.join(', ');
      if (joined) return joined;
      return data.display_name ? data.display_name.split(',').slice(0, 3).join(',').trim() : '';
    });
}

/**
 * Drop-a-pin map for the listing form. Clicking (or dragging) the pin writes
 * lat/lng via onChange and reverse-geocodes a street-level label into the
 * editable address box. Scroll-wheel zoom stays off so the page can scroll;
 * zoom with the +/- buttons or double-click.
 */
function PropertyLocationPicker({ lat, lng, address, onChange }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const placePinRef = useRef(null);
  const geocodeSeq = useRef(0);
  const [busy, setBusy] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);

  const hasPin = isFiniteCoord(lat) && isFiniteCoord(lng);

  const placePin = useCallback(async (la, ln) => {
    const numLat = Number(la);
    const numLng = Number(ln);
    setBusy(true);
    setLookupFailed(false);
    const seq = ++geocodeSeq.current;
    // Move the pin immediately; keep the existing address until the lookup returns.
    onChange({ lat: numLat, lng: numLng });
    try {
      const label = await reverseGeocode(numLat, numLng);
      if (seq === geocodeSeq.current) {
        onChange({ lat: numLat, lng: numLng, address: label });
      }
    } catch {
      if (seq === geocodeSeq.current) setLookupFailed(true);
    } finally {
      if (seq === geocodeSeq.current) setBusy(false);
    }
  }, [onChange]);

  placePinRef.current = placePin;

  // Create the map once. Placeholder lat/lng may arrive later (edit load).
  useEffect(() => {
    if (!mapElRef.current || mapRef.current) return;
    const map = L.map(mapElRef.current, {
      scrollWheelZoom: false,
      center: hasPin ? [Number(lat), Number(lng)] : NAIROBI_CENTER,
      zoom: hasPin ? ZOOM_PIN : ZOOM_CITY,
    });
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (e) => {
      map.scrollWheelZoom.enable();
      placePinRef.current(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => {
      geocodeSeq.current += 1; // ignore in-flight lookups on unmount
      map.remove();
      mapRef.current = null;
      markerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Keep the marker in step with the controlled lat/lng (server load, clear).
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (hasPin) {
      const la = Number(lat);
      const ln = Number(lng);
      if (!markerRef.current) {
        markerRef.current = L.marker([la, ln], { draggable: true })
          .addTo(map)
          .on('dragend', () => {
            const pos = markerRef.current.getLatLng();
            placePinRef.current(pos.lat, pos.lng);
          });
        map.setView([la, ln], ZOOM_PIN);
      } else {
        const pos = markerRef.current.getLatLng();
        if (Math.abs(pos.lat - la) > 1e-9 || Math.abs(pos.lng - ln) > 1e-9) {
          markerRef.current.setLatLng([la, ln]);
        }
      }
    } else if (markerRef.current) {
      markerRef.current.remove();
      markerRef.current = null;
    }
  }, [lat, lng, hasPin]);

  function clearPin() {
    geocodeSeq.current += 1;
    setBusy(false);
    setLookupFailed(false);
    onChange({ lat: null, lng: null, address: '' });
  }

  return (
    <div>
      <div className="relative rounded-xl overflow-hidden shadow-sm">
        <div
          ref={mapElRef}
          className="h-64 md:h-72 w-full"
          aria-label="Map to pin the property location. Click to drop the pin."
          role="application"
        />
        {busy && (
          <div className="absolute top-3 right-3 bg-white/95 rounded-full shadow-md px-3 py-1.5 flex items-center gap-2 text-xs font-medium text-[#0B0B45]" role="status" aria-live="polite">
            <span className="w-3 h-3 border-2 border-[#C49A6C] border-t-transparent rounded-full animate-spin"></span>
            Finding address…
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 mt-3" aria-live="polite">
        {hasPin ? (
          <>
            <svg className="w-5 h-5 text-green-600 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-sm text-[#1f2937]">
              Location pinned. Drag the pin or click elsewhere to adjust — the address below auto-fills and stays editable.
            </p>
          </>
        ) : (
          <>
            <svg className="w-5 h-5 text-[#C49A6C] shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm text-[#6b7280]">
              Click the map to drop a pin at the exact entrance. Guests use this pin to get directions. Scroll the page to move around; zoom with the buttons or double-click.
            </p>
          </>
        )}
      </div>

      <div className="mt-3">
        <label className="block text-sm font-semibold text-[#1f2937] mb-2" htmlFor="property-address">
          Street address
        </label>
        <div className="flex gap-2">
          <input
            id="property-address"
            className="w-full px-4 py-2.5 rounded-xl bg-white text-[#1f2937] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30"
            placeholder="e.g. 4th Floor, Rose Avenue, Kilimani"
            value={address || ''}
            maxLength={300}
            onChange={(e) => onChange({ address: e.target.value })}
          />
          {hasPin && (
            <button
              type="button"
              onClick={clearPin}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold text-[#6b7280] hover:text-red-600 hover:bg-red-50 transition-colors"
            >
              Clear pin
            </button>
          )}
        </div>
        <p className="text-xs text-[#6b7280] mt-1.5">
          {lookupFailed
            ? 'Automatic lookup did not find an address here — type it manually.'
            : hasPin
              ? 'Auto-filled from the pin. You can edit it to add the unit, floor or gate name.'
              : 'This is filled automatically when you drop a pin, and you can edit it.'}
        </p>
      </div>
    </div>
  );
}

PropertyLocationPicker.propTypes = {
  lat: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  lng: PropTypes.oneOfType([PropTypes.number, PropTypes.string]),
  address: PropTypes.string,
  onChange: PropTypes.func.isRequired,
};

export default PropertyLocationPicker;
