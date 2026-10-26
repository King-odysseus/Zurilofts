// Restores the property touched by the coordinate e2e back to its exact
// pre-test state, which the earlier failed run converted from null to "".
const BASE = 'http://localhost:3000/api';
const ID = process.argv[2];

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

const res = await fetch(`${BASE}/admin/properties/${ID}`, {
  method: 'PUT',
  headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
  body: JSON.stringify({ lat: null, lng: null, address: null }),
});
console.log(`restore status=${res.status}`);

const after = await fetch(`${BASE}/properties/${ID}`).then((r) => r.json());
const p = after?.data ?? {};
console.log(`now lat=${p.lat} lng=${p.lng} address=${JSON.stringify(p.address)}`);
