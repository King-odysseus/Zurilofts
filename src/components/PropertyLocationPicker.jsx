import { useEffect, useRef, useState, useCallback } from 'react';
import PropTypes from 'prop-types';
import { CircleCheckBig, MapPin } from 'lucide-react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// Leaflet guesses its default icon URLs at runtime, and bundlers break that guess
// by renaming the imported assets - so point it at the bundled URLs explicitly.
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
const SEARCH_MIN_CHARS = 3;
const SEARCH_DEBOUNCE_MS = 450;

function isFiniteCoord(value) {
  const n = Number(value);
  return value != null && value !== '' && Number.isFinite(n);
}

// Nominatim address parts -> a compact, street-first label rather than the full
// admin-country chain. Shared by reverse geocoding and search results.
function compactLabel(a) {
  if (!a || typeof a !== 'object') return '';
  const street = [a.house_number, a.road || a.pedestrian].filter(Boolean).join(' ');
  const parts = [
    street,
    a.building || a.amenity || a.shop || a.tourism || a.neighbourhood,
    a.suburb,
    a.city_district,
    a.city || a.town || a.municipality || a.village,
  ].filter(Boolean);
  const joined = parts.join(', ');
  if (joined) return joined;
  return '';
}

function displayNameShort(displayName) {
  return String(displayName || '').split(',').slice(0, 3).join(',').trim();
}

// Reverse-geocode a coordinate pair to a street-level label (map click / drag).
function reverseGeocode(lat, lng) {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('lat', String(lat));
  url.searchParams.set('lon', String(lng));
  url.searchParams.set('addressdetails', '1');
  return fetch(url, { headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
      return res.json();
    })
    .then((data) => {
      if (!data || typeof data !== 'object') return '';
      return compactLabel(data.address) || displayNameShort(data.display_name);
    });
}

// Forward-geocode a free-text query into candidate places (the address search
// the host types). countrycodes=ke keeps Nairobi/Kenya listings relevant; hosts
// can still click anywhere on the map to fine-tune.
function searchPlaces(query, signal) {
  const url = new URL('https://nominatim.openstreetmap.org/search');
  url.searchParams.set('q', query);
  url.searchParams.set('format', 'jsonv2');
  url.searchParams.set('addressdetails', '1');
  url.searchParams.set('limit', '6');
  url.searchParams.set('countrycodes', 'ke');
  return fetch(url, { signal, headers: { Accept: 'application/json' } })
    .then((res) => {
      if (!res.ok) throw new Error(`Nominatim responded ${res.status}`);
      return res.json();
    })
    .then((list) =>
      (Array.isArray(list) ? list : [])
        .filter((r) => isFiniteCoord(r.lat) && isFiniteCoord(r.lon))
        .map((r) => ({
          lat: Number(r.lat),
          lng: Number(r.lon),
          label: compactLabel(r.address) || displayNameShort(r.display_name) || r.display_name,
        }))
        .slice(0, 6)
    );
}

/**
 * Drop-a-pin map for the listing form. The "Street address" box doubles as a
 * live search: type a street/estate/landmark before a pin exists and pick a
 * result to drop the pin there (map centers + address fills). You can also
 * click or drag directly on the map, which reverse-fills the address. Once a
 * pin exists the address box is plain editable text (add the unit/floor/gate);
 * search a new place by clearing the pin first. Scroll-wheel zoom stays off so
 * the page can scroll; zoom with the +/- buttons or double-click.
 */
function PropertyLocationPicker({ lat, lng, address, onChange }) {
  const mapElRef = useRef(null);
  const mapRef = useRef(null);
  const markerRef = useRef(null);
  const placePinRef = useRef(null);
  const geocodeSeq = useRef(0);
  const searchTimerRef = useRef(null);
  const searchAbortRef = useRef(null);

  const [busy, setBusy] = useState(false);
  const [lookupFailed, setLookupFailed] = useState(false);
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState([]);
  const [resultsOpen, setResultsOpen] = useState(false);
  const [searchNote, setSearchNote] = useState('');

  const hasPin = isFiniteCoord(lat) && isFiniteCoord(lng);

  // Drop a pin at a coordinate and reverse-geocode a label for it. The current
  // address stays put until the lookup returns, so typing is never wiped.
  const placePin = useCallback(async (la, ln) => {
    const numLat = Number(la);
    const numLng = Number(ln);
    setBusy(true);
    setLookupFailed(false);
    const seq = ++geocodeSeq.current;
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

  // Jump straight to a chosen place: pin + address come from the result, so no
  // reverse lookup is needed. Recenters the map.
  const moveToPlace = useCallback((la, ln, label) => {
    const numLat = Number(la);
    const numLng = Number(ln);
    geocodeSeq.current += 1; // cancel any in-flight reverse lookup
    setBusy(false);
    setLookupFailed(false);
    onChange({ lat: numLat, lng: numLng, address: label });
    if (mapRef.current) {
      mapRef.current.setView([numLat, numLng], ZOOM_PIN, { animate: true });
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
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    map.on('click', (e) => {
      map.scrollWheelZoom.enable();
      placePinRef.current(e.latlng.lat, e.latlng.lng);
    });
    mapRef.current = map;
    return () => {
      geocodeSeq.current += 1; // ignore in-flight lookups on unmount
      clearTimeout(searchTimerRef.current);
      searchAbortRef.current?.abort();
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
    closeSearch();
    onChange({ lat: null, lng: null, address: '' });
  }

  function closeSearch() {
    clearTimeout(searchTimerRef.current);
    searchAbortRef.current?.abort();
    setSearching(false);
    setResultsOpen(false);
  }

  // Typing in the address box. Only live-searches while there is no pin yet -
  // the box is the way to find the place. Once pinned, it is plain editable
  // text (fine-tune the unit/floor) and stray keystrokes don't open suggestions.
  function onAddressInput(value) {
    onChange({ address: value });
    setLookupFailed(false);
    setSearchNote('');
    closeSearch();
    const query = value.trim();
    if (hasPin || query.length < SEARCH_MIN_CHARS) {
      setResults([]);
      return;
    }
    setSearching(true);
    searchTimerRef.current = setTimeout(() => runSearch(query), SEARCH_DEBOUNCE_MS);
  }

  async function runSearch(query) {
    const controller = new AbortController();
    searchAbortRef.current = controller;
    try {
      const list = await searchPlaces(query, controller.signal);
      if (controller.signal.aborted) return;
      setResults(list);
      setSearching(false);
      setResultsOpen(list.length > 0);
    } catch (err) {
      if (err.name === 'AbortError') return;
      setSearching(false);
      setResults([]);
      setSearchNote('Could not reach the address search. Click the map to drop a pin instead.');
    }
  }

  function chooseResult(result) {
    closeSearch();
    moveToPlace(result.lat, result.lng, result.label);
  }

  function onAddressKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault(); // never submit the enclosing property form
      if (resultsOpen && results.length > 0) chooseResult(results[0]);
    } else if (e.key === 'Escape') {
      closeSearch();
    }
  }

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-[#E3E8EF] shadow-[0_8px_28px_rgba(11,31,66,0.08)]" onMouseDownCapture={() => setResultsOpen(false)}>
        <div
          ref={mapElRef}
          className="h-64 md:h-72 w-full"
          aria-label="Map to pin the property location. Type the address below or click the map to drop the pin."
          role="application"
        />
        {busy && (
          <div className="absolute right-3 top-3 flex items-center gap-2 rounded-full border border-[#E3E8EF] bg-white/95 px-3 py-1.5 text-xs font-medium text-[#0B1F42] shadow-md" role="status" aria-live="polite">
            <span className="w-3 h-3 border-2 border-[#C49A6C] border-t-transparent rounded-full animate-spin"></span>
            Finding address…
          </div>
        )}
      </div>

      <div className="flex items-start gap-2 mt-3" aria-live="polite">
        {hasPin ? (
          <>
            <CircleCheckBig className="w-5 h-5 text-green-600 shrink-0 mt-0.5" strokeWidth={2} aria-hidden="true" />
            <p className="text-sm text-[#0B1F42]">
              Pin dropped. Drag it or click elsewhere to adjust - or clear the pin to search a new place.
            </p>
          </>
        ) : (
          <>
            <MapPin className="w-5 h-5 text-[#C49A6C] shrink-0 mt-0.5" strokeWidth={2} aria-hidden="true" />
            <p className="text-sm text-[#5B6B82]">
              Type the estate or street below and pick a result, or click the map to drop the pin.
            </p>
          </>
        )}
      </div>

      <div className="mt-3 relative">
        <label className="mb-2 block text-sm font-semibold text-[#0B1F42]" htmlFor="property-address">
          Street address
        </label>
        <div className="relative">
          <input
            id="property-address"
            className="w-full rounded-[10px] border border-[#E3E8EF] bg-white px-4 py-2.5 pr-24 text-[#0B1F42] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#C49A6C]/30"
            placeholder="Type the estate or street to locate it on the map, e.g. Kilimani, Ngong Road"
            value={address || ''}
            maxLength={300}
            autoComplete="off"
            onChange={(e) => onAddressInput(e.target.value)}
            onKeyDown={onAddressKeyDown}
            aria-label="Street address - type to search the map for the location"
            role="combobox"
            aria-expanded={resultsOpen}
            aria-controls="location-search-results"
          />
          {searching ? (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-[#C49A6C] border-t-transparent rounded-full animate-spin" role="status" aria-label="Searching" />
          ) : hasPin ? (
            <button
              type="button"
              onClick={clearPin}
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-[10px] px-2.5 py-1 text-xs font-semibold text-[#5B6B82] transition-colors hover:bg-[#FDECEC] hover:text-[#B42318]"
            >
              Clear pin
            </button>
          ) : null}
        </div>

        {resultsOpen && results.length > 0 && (
          <ul
            id="location-search-results"
            role="listbox"
            className="absolute left-0 right-0 z-20 mt-1.5 max-h-60 overflow-y-auto overflow-hidden rounded-2xl border border-[#E3E8EF] bg-white shadow-[0_8px_28px_rgba(11,31,66,0.14)]"
            onMouseDown={(e) => e.preventDefault()}
          >
            {results.map((r, i) => (
              <li key={`${r.lat},${r.lng},${i}`}>
                <button
                  type="button"
                  className="flex w-full items-start gap-2.5 px-3.5 py-2.5 text-left text-sm text-[#0B1F42] transition-colors hover:bg-[#F7F4EF]"
                  onMouseDown={() => chooseResult(r)}
                >
                  <MapPin className="w-4 h-4 text-[#C49A6C] mt-0.5 shrink-0" strokeWidth={2} aria-hidden="true" />
                  <span className="min-w-0">{r.label || `${r.lat.toFixed(5)}, ${r.lng.toFixed(5)}`}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {searchNote && <p className="text-xs text-red-600 mt-1.5">{searchNote}</p>}
        <p className="mt-1.5 text-xs text-[#5B6B82]">
          {lookupFailed
            ? 'Automatic lookup did not find an address here - keep the text or type it manually.'
            : hasPin
              ? 'Found from the map. You can edit it to add the unit, floor or gate name.'
              : 'Pick a search result or click the map - the address fills in automatically and stays editable.'}
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
