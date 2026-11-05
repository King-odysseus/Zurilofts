/**
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/seo.meta.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import prisma from '../src/config/prisma.js';
import { buildRobots, injectMeta, isAppOnlyPath, metaForPath, type PageMeta } from '../src/services/seo.service.js';

const shell = `<!doctype html><html lang="en"><head>
    <meta name="description" content="Home page description." />
    <title>ZuriLofts - Premium Short-let Apartments</title>
  </head><body><div id="root"></div></body></html>`;

function meta(overrides: Partial<PageMeta> = {}): PageMeta {
  return {
    status: 200,
    title: 'Short-let Apartments in Nairobi | ZuriLofts',
    description: 'Browse furnished apartments across Nairobi.',
    canonicalUrl: 'https://thezurilofts.com/stays',
    imageUrl: 'https://thezurilofts.com/og-default.jpg',
    imageIsBranded: true,
    type: 'website',
    jsonLd: [],
    ...overrides,
  };
}

test('injectMeta replaces the shell title and description instead of adding a second copy', () => {
  const html = injectMeta(shell, meta());

  assert.equal((html.match(/<title>/g) || []).length, 1);
  assert.match(html, /<title>Short-let Apartments in Nairobi \| ZuriLofts<\/title>/);
  assert.equal((html.match(/name="description"/g) || []).length, 1);
  assert.match(html, /content="Browse furnished apartments across Nairobi\."/);
  assert.ok(!html.includes('Home page description.'), 'home description must not survive');
});

test('injectMeta adds canonical, Open Graph and Twitter tags inside head', () => {
  const html = injectMeta(shell, meta());
  const head = html.slice(0, html.indexOf('</head>'));

  assert.match(head, /<link rel="canonical" href="https:\/\/thezurilofts\.com\/stays">/);
  assert.match(head, /<meta property="og:title" content="Short-let Apartments in Nairobi \| ZuriLofts">/);
  assert.match(head, /<meta property="og:url" content="https:\/\/thezurilofts\.com\/stays">/);
  assert.match(head, /<meta property="og:image" content="https:\/\/thezurilofts\.com\/og-default\.jpg">/);
  assert.match(head, /<meta name="twitter:card" content="summary_large_image">/);
});

test('injectMeta escapes quotes in titles so the attribute cannot break out', () => {
  const html = injectMeta(shell, meta({ title: 'Suite "A" <script>' }));

  assert.match(html, /<title>Suite &quot;A&quot; &lt;script&gt;<\/title>/);
  assert.ok(!html.includes('<title>Suite "A" <script>'), 'raw quotes and angle brackets must not reach the head');
});

test('injectMeta writes JSON-LD and escapes angle brackets inside it', () => {
  const html = injectMeta(
    shell,
    meta({ jsonLd: [{ '@type': 'Organization', name: 'Zuri </script><script>alert(1)</script>' }] })
  );

  assert.match(html, /<script type="application\/ld\+json">/);
  assert.ok(!html.includes('</script><script>alert(1)'), 'JSON-LD must not close its own script tag');
});

test('buildRobots blocks signed-in and checkout screens and names the sitemap', () => {
  const robots = buildRobots('https://thezurilofts.com');
  const lines = robots.split('\n');

  assert.equal(lines[0], 'User-agent: *');
  assert.ok(lines.includes('Disallow: /admin'));
  assert.ok(lines.includes('Disallow: /booking/'));
  assert.ok(!lines.includes('Disallow: /stays'), 'public listing pages must stay crawlable');
  assert.ok(robots.includes('Sitemap: https://thezurilofts.com/sitemap.xml'));
});

test('buildRobots does not block a public page that merely starts with a private prefix', () => {
  // A bare `Disallow: /host` is a prefix match, so it also hid
  // /host-earnings-calculator - a public page the sitemap advertises. Asking a
  // crawler to index a URL and to skip it at the same time loses the page.
  const rules = buildRobots('https://thezurilofts.com')
    .split('\n')
    .filter((line) => line.startsWith('Disallow: '))
    .map((line) => line.slice('Disallow: '.length));

  const publicPages = [
    '/', '/stays', '/places', '/restaurants', '/guides',
    '/become-a-host', '/host-earnings-calculator', '/privacy', '/terms',
  ];

  for (const path of publicPages) {
    const blocking = rules.filter((rule) => path.startsWith(rule));
    assert.deepEqual(blocking, [], `${path} must not match any Disallow rule`);
  }
});

test('a protected prefix answers only for its own segment', () => {
  // Real signed-in screens keep the app shell, even deep inside the workspace.
  for (const path of ['/host', '/host/today', '/host/listings/abc/edit', '/admin', '/trips', '/profile']) {
    assert.equal(isAppOnlyPath(path), true, `${path} should be app-only`);
  }
});

test('a word that merely starts like a protected prefix is not one', () => {
  // These used to answer 200 with the app shell, so every typo built on a
  // protected prefix looked healthy to a crawler or a link checker.
  for (const path of ['/hostxyz', '/adminpanel', '/tripsomething', '/loginfoo', '/bookinger']) {
    assert.equal(isAppOnlyPath(path), false, `${path} should be unknown`);
  }
});

/** Enough of a Request for the canonical link to be absolute. */
function fakeRequest() {
  return {
    protocol: 'https',
    headers: {},
    get: (name: string) => (name.toLowerCase() === 'host' ? 'thezurilofts.com' : undefined),
  } as unknown as Parameters<typeof metaForPath>[1];
}

/**
 * A read that fails must not describe the page as missing.
 *
 * This is the difference between "come back later" and "this listing is gone":
 * the second one, served during a few seconds of database trouble, drops a live
 * listing out of search results and misinforms every link preview. The two
 * branch on the same failed query, so both paths are checked here.
 */
test('a listing or guide whose read fails answers 503, not 404', async () => {
  const propertyDelegate = prisma.property as unknown as { findFirst: unknown };
  const postDelegate = prisma.blogPost as unknown as { findFirst: unknown };
  const originalProperty = propertyDelegate.findFirst;
  const originalPost = postDelegate.findFirst;
  // The service logs each failed read deliberately; keeping that quiet here so a
  // passing run stays readable.
  const originalError = console.error;
  console.error = () => {};

  try {
    propertyDelegate.findFirst = () => Promise.reject(new Error('database is down'));
    const stay = await metaForPath('/stay/abc123', fakeRequest());
    assert.equal(stay?.status, 503, 'a failed listing read is an outage, not a retirement');
    assert.match(stay?.title ?? '', /Temporarily unavailable/);
    assert.equal(stay?.canonicalUrl, 'https://thezurilofts.com/stay/abc123');

    postDelegate.findFirst = () => Promise.reject(new Error('database is down'));
    const guide = await metaForPath('/guides/nairobi-in-a-weekend', fakeRequest());
    assert.equal(guide?.status, 503, 'a failed guide read is an outage, not a deleted guide');
    assert.match(guide?.title ?? '', /Temporarily unavailable/);
  } finally {
    propertyDelegate.findFirst = originalProperty;
    postDelegate.findFirst = originalPost;
    console.error = originalError;
  }
});
