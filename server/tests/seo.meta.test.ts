/**
 * Run from server/:
 *   DATABASE_URL="file:./dev.db" node --import tsx --test tests/seo.meta.test.ts
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';

import { buildRobots, injectMeta, type PageMeta } from '../src/services/seo.service.js';

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
