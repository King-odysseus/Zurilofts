// End-to-end check for the guide-sanitization change set (item 2).
// Exercises the real HTTP surface against the running API and cleans up after
// itself. Deleted after use.
const BASE = 'http://localhost:3000/api';
const results = [];

function check(name, pass, detail) {
  results.push({ name, pass, detail });
  console.log(`${pass ? 'PASS' : 'FAIL'} - ${name}${detail ? ` :: ${detail}` : ''}`);
}

async function json(path, { method = 'GET', body, token, raw } = {}) {
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
  return raw ? { status: res.status, payload, headers: res.headers } : { status: res.status, payload };
}

const login = await json('/auth/login', {
  method: 'POST',
  body: { email: 'admin@zurilofts.co.ke', password: 'Admin@123' },
});
const token = login.payload?.data?.tokens?.accessToken || login.payload?.data?.accessToken;
check('admin login', login.status === 200 && Boolean(token), `status=${login.status}`);
if (!token) {
  console.log(JSON.stringify(login.payload, null, 2));
  process.exit(1);
}

const slug = `e2e-sanitizer-${Date.now().toString(36)}`;
const hostile = '<h2>Heading</h2><script>alert(1)</script><p onclick="steal()">text</p>'
  + '<a href="javascript:alert(2)">link</a><img src="/ok.png" onerror="boom()" alt="pic" />';

const create = await json('/admin/guides', {
  method: 'POST',
  token,
  body: {
    title: 'E2E Sanitizer Check',
    slug,
    excerpt: 'temporary',
    body: hostile,
    published: true,
  },
});
check('create guide returns 201', create.status === 201, `status=${create.status}`);
const createdId = create.payload?.data?.id;
const storedBody = create.payload?.data?.body ?? '';
check('write path strips <script>', !storedBody.includes('<script') && !storedBody.includes('alert(1)'), storedBody.slice(0, 120));
check('write path strips on* handlers', !storedBody.includes('onclick') && !storedBody.includes('onerror'), storedBody.slice(0, 160));
check('write path strips javascript: URLs', !storedBody.includes('javascript:'), storedBody.slice(0, 160));
check('write path keeps safe markup', storedBody.includes('<h2>Heading</h2>') && storedBody.includes('src="/ok.png"'), storedBody.slice(0, 160));

const pub = await json(`/guides/${slug}`);
check('public read returns 200', pub.status === 200, `status=${pub.status}`);
const pubBody = pub.payload?.data?.body ?? '';
check('public read returns sanitized body', !pubBody.includes('<script') && !pubBody.includes('onclick') && !pubBody.includes('javascript:'), pubBody.slice(0, 160));

const dup = await json('/admin/guides', {
  method: 'POST',
  token,
  body: { title: 'Duplicate', slug, body: '<p>x</p>', published: false },
});
check('duplicate slug returns 409 not 500', dup.status === 409, `status=${dup.status} error=${dup.payload?.error}`);

const badSlug = await json('/admin/guides', {
  method: 'POST',
  token,
  body: { title: 'Bad', slug: 'Bad Slug!', body: '<p>x</p>' },
});
check('invalid slug rejected with 400', badSlug.status === 400, `status=${badSlug.status} error=${badSlug.payload?.error}`);

const noBody = await json('/admin/guides', {
  method: 'POST',
  token,
  body: { title: 'No body', slug: `${slug}-nobody` },
});
check('missing body rejected with 400', noBody.status === 400, `status=${noBody.status} error=${noBody.payload?.error}`);

const unauth = await json(`/admin/guides/${createdId}`, { method: 'DELETE' });
check('guide delete requires auth', unauth.status === 401 || unauth.status === 403, `status=${unauth.status}`);

if (createdId) {
  const del = await json(`/admin/guides/${createdId}`, { method: 'DELETE', token });
  check('cleanup deletes the test guide', del.status === 200, `status=${del.status}`);
}

const after = await json(`/guides/${slug}`);
check('deleted guide no longer public', after.status === 404, `status=${after.status}`);

const failed = results.filter((r) => !r.pass);
console.log(`\nSUMMARY: ${results.length - failed.length}/${results.length} passed`);
process.exit(failed.length === 0 ? 0 : 1);
