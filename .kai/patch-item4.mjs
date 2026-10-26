// One-off patch runner for item 4: mount the existing drop-a-pin picker in the
// listing form and persist the coordinates.
//
// The backend half was already complete (schema columns, zod bounds,
// buildCreateData/buildUpdateData, normalizeProperty). Only the form was missing.
import { readFileSync, writeFileSync } from 'node:fs';

function patch(path, edits) {
  const raw = readFileSync(path, 'utf8');
  const eol = raw.includes('\r\n') ? '\r\n' : '\n';
  let text = raw.split('\r\n').join('\n');

  for (const [oldText, newText, expected] of edits) {
    const count = text.split(oldText).length - 1;
    if (count !== expected) {
      throw new Error(
        `${path}: expected ${expected} occurrence(s), found ${count} for anchor:\n${oldText.slice(0, 120)}`
      );
    }
    text = text.split(oldText).join(newText);
  }

  writeFileSync(path, eol === '\r\n' ? text.split('\n').join('\r\n') : text, 'utf8');
  console.log(`patched ${path} (eol=${eol === '\r\n' ? 'CRLF' : 'LF'}, ${edits.length} edit(s))`);
}

// 1. A cleared pin sends null, which .optional() alone rejects in zod v3, so the
//    coordinate fields must accept null for a pin to be removable.
patch('server/src/types/index.ts', [
  [
    `  lat: z.number().min(-90).max(90).optional(),
  lng: z.number().min(-180).max(180).optional(),`,
    `  // .nullable() matters: the picker's "clear pin" action submits null, which
  // .optional() alone rejects (it allows undefined, not null).
  lat: z.number().min(-90).max(90).nullable().optional(),
  lng: z.number().min(-180).max(180).nullable().optional(),`,
    1,
  ],
]);

// 2. The listing form itself.
patch('src/pages/AdminPropertyForm.jsx', [
  [
    `import { findSearchLocation, isNairobiSearchLocation, SEARCH_LOCATION_GROUPS } from '../data/searchLocations.js';`,
    `import { findSearchLocation, isNairobiSearchLocation, SEARCH_LOCATION_GROUPS } from '../data/searchLocations.js';
import PropertyLocationPicker from '../components/PropertyLocationPicker.jsx';`,
    1,
  ],
  [
    `  amenities: '',
  nearby: '',
};`,
    `  amenities: '',
  nearby: '',
  // Pin-confirmed coordinates. '' means "no pin chosen yet"; null means the
  // author cleared a pin that was previously set.
  lat: '',
  lng: '',
  address: '',
};`,
    1,
  ],
  [
    `  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);`,
    `  const [form, setForm] = useState(EMPTY);
  const [loading, setLoading] = useState(isEdit);
  // Stable identity: the picker's geocode callbacks list onChange in their
  // dependency arrays, so an inline closure would rebuild them on every render.
  const handleLocationChange = useCallback((patchValues) => {
    setForm((current) => ({ ...current, ...patchValues }));
  }, []);`,
    1,
  ],
  [
    `          nearby: (p.nearby || []).join('\\n'),
        });`,
    `          nearby: (p.nearby || []).join('\\n'),
          lat: p.lat ?? '',
          lng: p.lng ?? '',
          address: p.address || '',
        });`,
    1,
  ],
  [
    `    if (form.bathrooms2Bed !== '') payload.bathrooms2Bed = Number(form.bathrooms2Bed);`,
    `    if (form.bathrooms2Bed !== '') payload.bathrooms2Bed = Number(form.bathrooms2Bed);

    // null means the author cleared a pin on an existing listing, so send it
    // explicitly to null out the stored coordinates. '' means no pin was ever
    // chosen, so omit the fields rather than writing empty strings.
    if (form.lat === null) {
      payload.lat = null;
      payload.lng = null;
    } else if (form.lat !== '') {
      payload.lat = Number(form.lat);
      payload.lng = Number(form.lng);
    }
    if (typeof form.address === 'string') payload.address = form.address;`,
    1,
  ],
  [
    `                  <TextInput id="listing-location" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Street, building or landmark" required />
                </div>`,
    `                  <TextInput id="listing-location" value={form.location} onChange={(e) => update('location', e.target.value)} placeholder="Street, building or landmark" required />
                </div>
                <div className="op-host-editor-field-full">
                  <Label htmlFor="listing-map-pin" className="op-host-editor-label">Map pin (optional)</Label>
                  <PropertyLocationPicker
                    lat={form.lat}
                    lng={form.lng}
                    address={form.address}
                    onChange={handleLocationChange}
                  />
                </div>`,
    1,
  ],
]);

console.log('all edits applied');
