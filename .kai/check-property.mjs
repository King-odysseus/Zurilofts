// Inspect a property through the admin endpoint (the public one 403s for
// listings that are not approved), and optionally reset its coordinates.
const BASE = 'http://localhost:3000/api';
const id = process.argv[2];
const reset = process.argv.includes('--reset');

const login = await fetch(`${BASE}/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'admin@zurilofts.co.ke', password: 'Admin@123' }),
}).then((r) => r.json());
const token = login?.data?.tokens?.accessToken || login?.data?.accessToken;
if (!token) {
  console.error('login failed');
  process.exit(1);
}

const admin = await fetch(`${BASE}/admin/properties/${id}`, {
  headers: { Authorization: `Bearer ${token}` },
}).then((r) => r.json());
const p = admin?.data ?? {};
console.log(`admin read: status=${admin?.data?.status} lat=${p.lat} lng=${p.lng} address=${JSON.stringify(p.address)} title=${p.title}`);

if (reset) {
  const res = await fetch(`${BASE}/admin/properties/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ lat: null, lng: null, address: null }),
  });
  console.log(`reset status=${res.status}`);
  const after = await fetch(`${BASE}/admin/properties/${id}`, {
    headers: { Authorization: `Bearer ${token}` },
  }).then((r) => r.json());
  const q = after?.data ?? {};
  console.log(`after reset: lat=${q.lat} lng=${q.lng} address=${JSON.stringify(q.address)}`);
}
