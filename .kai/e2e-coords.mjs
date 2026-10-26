// End-to-end check for item 4: coordinates persist, and a cleared pin can be
// written back as null (the .nullable() fix). Restores the original values so
// the dev database is left exactly as found. Deleted after use.
const BASE = 'http://localhost:3000/api';
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` :: ${detail}` : ''}`);
}

async function json(path, { method = 'GET', body, token } = {}) {
  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (token) headers.Authorization = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  return { status: res.status, payload };
}

const login = await json('/auth/login', {
  method: 'POST',
  body: { email: 'admin@zurilofts.co.ke', password: 'Admin@123' },
});
const token = login.payload?.data?.tokens?.accessToken || login.payload?.data?.accessToken;
check('admin login', Boolean(token));
if (!token) process.exit(1);

const list = await json('/properties?limit=1');
const id = list.payload?.data?.[0]?.id;
check('found a property to test', Boolean(id), `id=${id}`);
if (!id) process.exit(1);

const before = await json(`/properties/${id}`);
const original = {
  lat: before.payload?.data?.lat ?? null,
  lng: before.payload?.data?.lng ?? null,
  address: before.payload?.data?.address ?? null,
};
console.log(`original: ${JSON.stringify(original)}`);

// 1. Set a pin the way the picker does (numbers).
const setPin = await json(`/admin/properties/${id}`, {
  method: 'PUT',
  token,
  body: { lat: -1.2921, lng: 36.8219, address: 'E2E Test Point, Nairobi' },
});
check('setting a pin returns 200', setPin.status === 200, `status=${setPin.status} error=${setPin.payload?.error}`);

const afterSet = await json(`/properties/${id}`);
const lat = afterSet.payload?.data?.lat;
const addr = afterSet.payload?.data?.address;
check('coordinates persisted', typeof lat === 'number' && Math.abs(lat - -1.2921) < 1e-6, `lat=${lat}`);
check('address persisted', addr === 'E2E Test Point, Nairobi', `address=${addr}`);

// 2. Clear the pin the way the picker does (explicit null) - this is the path
// that .optional() alone would have rejected with a 400.
const clear = await json(`/admin/properties/${id}`, {
  method: 'PUT',
  token,
  body: { lat: null, lng: null, address: '' },
});
check('clearing a pin returns 200 (nullable accepted)', clear.status === 200, `status=${clear.status} error=${clear.payload?.error}`);

const afterClear = await json(`/properties/${id}`);
check('cleared pin reads back as null', afterClear.payload?.data?.lat === null, `lat=${afterClear.payload?.data?.lat}`);

// 3. Out-of-range coordinate is still rejected.
const bad = await json(`/admin/properties/${id}`, {
  method: 'PUT',
  token,
  body: { lat: 999, lng: 36.8219 },
});
check('out-of-range latitude rejected with 400', bad.status === 400, `status=${bad.status} error=${bad.payload?.error}`);

// 4. Restore the original values.
const restore = await json(`/admin/properties/${id}`, {
  method: 'PUT',
  token,
  body: original,
});
check('restore original values', restore.status === 200, `status=${restore.status} error=${restore.payload?.error}`);

const finalState = await json(`/properties/${id}`);
const restored = {
  lat: finalState.payload?.data?.lat ?? null,
  lng: finalState.payload?.data?.lng ?? null,
  address: finalState.payload?.data?.address ?? null,
};
check(
  'database left as found',
  restored.lat === original.lat && restored.lng === original.lng && restored.address === original.address,
  `now=${JSON.stringify(restored)} was=${JSON.stringify(original)}`
);

const failed = results.filter((r) => !r.pass);
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
