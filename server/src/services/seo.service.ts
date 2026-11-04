import type { Request } from 'express';
import prisma from '../config/prisma.js';
import { publicOriginForCrawlers } from '../utils/publicUrl.js';

/**
 * Search engine surface for a single-page app.
 *
 * Every path returns the same index.html, so without this module each page
 * ships the home page's <title>, description and share image: Google's first
 * fetch and every link preview (WhatsApp, Facebook, LinkedIn, X) would describe
 * the site generically, and no page would carry a canonical URL.
 *
 * The crawler files and per-path head tags are built here so robots.txt,
 * sitemap.xml and the injected <head> can never disagree about the URL set.
 */

export const SITE_NAME = 'ZuriLofts';

const DEFAULT_OG_IMAGE_PATH = '/og-default.jpg';

const DEFAULT_DESCRIPTION =
  'Premium short-let apartments in Nairobi with verified hosts, fast Wi-Fi and self check-in. Book a stay in Westlands, Kilimani, Karen or Lavington.';

interface StaticPage {
  path: string;
  title: string;
  description: string;
  changefreq: 'daily' | 'weekly' | 'monthly' | 'yearly';
  priority: string;
}

// Public, indexed pages. Kept in one list because both the sitemap and the
// per-path head tags read it; a page added here appears in both.
const STATIC_PAGES: StaticPage[] = [
  {
    path: '/',
    title: 'ZuriLofts | Premium Short-let Apartments in Nairobi',
    description: DEFAULT_DESCRIPTION,
    changefreq: 'daily',
    priority: '1.0',
  },
  {
    path: '/stays',
    title: 'Short-let Apartments in Nairobi | ZuriLofts',
    description:
      'Browse furnished apartments and studios across Nairobi. Filter by neighbourhood, guests and amenities, then book verified stays instantly.',
    changefreq: 'daily',
    priority: '0.9',
  },
  {
    path: '/places',
    title: 'Places to Visit in Nairobi | ZuriLofts',
    description:
      'Our guide to Nairobi places worth the trip, mapped and grouped by neighbourhood so guests can plan a day out from their apartment.',
    changefreq: 'weekly',
    priority: '0.6',
  },
  {
    path: '/restaurants',
    title: 'Restaurants Near Our Nairobi Apartments | ZuriLofts',
    description:
      'Where to eat near our Nairobi short-lets, from coffee to dinner, with neighbourhood notes and map links for each restaurant.',
    changefreq: 'weekly',
    priority: '0.6',
  },
  {
    path: '/guides',
    title: 'Nairobi Travel Guides | ZuriLofts',
    description:
      'Practical Nairobi guides from the people who host here: neighbourhoods, getting around, food and what to do on a short stay.',
    changefreq: 'weekly',
    priority: '0.7',
  },
  {
    path: '/become-a-host',
    title: 'List Your Apartment in Nairobi | ZuriLofts',
    description:
      'Host your Nairobi apartment with ZuriLofts. See what you could earn, keep control of your calendar and get paid through M-Pesa.',
    changefreq: 'monthly',
    priority: '0.7',
  },
  {
    path: '/host-earnings-calculator',
    title: 'Nairobi Short-let Earnings Calculator | ZuriLofts',
    description:
      'Estimate what your Nairobi apartment could earn as a short-let, based on location, size and nightly rate.',
    changefreq: 'monthly',
    priority: '0.5',
  },
  {
    path: '/privacy',
    title: 'Privacy Policy | ZuriLofts',
    description: 'How ZuriLofts collects, uses and protects guest and host information.',
    changefreq: 'yearly',
    priority: '0.2',
  },
  {
    path: '/terms',
    title: 'Terms of Service | ZuriLofts',
    description: 'The terms that apply when you book or host a stay through ZuriLofts.',
    changefreq: 'yearly',
    priority: '0.2',
  },
];

const STATIC_PAGE_BY_PATH = new Map(STATIC_PAGES.map((page) => [page.path, page]));

export interface PageMeta {
  status: 200 | 404;
  title: string;
  description: string;
  canonicalUrl: string;
  imageUrl: string;
  imageIsBranded?: boolean;
  type: 'website' | 'article' | 'product';
  jsonLd: Record<string, unknown>[];
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/** Meta descriptions are read as one line; long copy gets truncated at a word. */
function toDescription(text: string | null | undefined, fallback: string): string {
  const plain = (text || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (!plain) return fallback;
  if (plain.length <= 155) return plain;
  const cut = plain.slice(0, 155);
  const lastSpace = cut.lastIndexOf(' ');
  return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim()}...`;
}

/**
 * Uploaded photo names keep whatever the host's camera wrote, spaces included
 * ("Ely Homes Photography (13 of 20).jpg"). A browser fills those in, but
 * crawlers and link-preview bots read the og:image string literally, so the
 * characters that break a URL are escaped here once.
 */
function encodeUrlForMeta(url: string): string {
  return url.replace(/[\s"<>]/g, (char) => encodeURIComponent(char));
}

/** Uploads are stored as /uploads/* in dev and absolute Cloudinary URLs in prod. */
function absoluteUrl(origin: string, url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return encodeUrlForMeta(url);
  return encodeUrlForMeta(`${origin}${url.startsWith('/') ? '' : '/'}${url}`);
}

function firstImageUrl(imagesJson: string): string | null {
  try {
    const parsed = JSON.parse(imagesJson || '[]');
    if (!Array.isArray(parsed)) return null;
    const first = parsed.find((entry) => typeof entry === 'string' && entry.trim());
    return typeof first === 'string' ? first : null;
  } catch {
    return null;
  }
}

function baseMeta(
  origin: string,
  pathname: string,
  page: { title: string; description: string; imageUrl?: string | null }
): PageMeta {
  return {
    status: 200,
    title: page.title,
    description: page.description,
    canonicalUrl: `${origin}${pathname === '/' ? '/' : pathname}`,
    imageUrl: page.imageUrl || `${origin}${DEFAULT_OG_IMAGE_PATH}`,
    imageIsBranded: !page.imageUrl,
    type: 'website',
    jsonLd: [],
  };
}

function organizationJsonLd(origin: string): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: SITE_NAME,
    url: `${origin}/`,
    logo: `${origin}/pwa-512x512.png`,
    areaServed: 'Nairobi, Kenya',
  };
}

function breadcrumbJsonLd(origin: string, trails: { name: string; path: string }[]): Record<string, unknown> {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trails.map((trail, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: trail.name,
      item: `${origin}${trail.path}`,
    })),
  };
}

// Listings are often saved as "ZuriLofts - Serenity Residency", so the brand is
// dropped here and added back once by the page title.
function stripBrand(title: string): string {
  const trimmed = title.trim();
  const separators = [' - ', ' : ', ': ', ' | ', ' -'];
  for (const separator of separators) {
    const prefix = `zurilofts${separator}`;
    if (trimmed.toLowerCase().startsWith(prefix)) return trimmed.slice(prefix.length).trim();
  }
  return trimmed;
}

async function stayMeta(origin: string, id: string): Promise<PageMeta> {
  // Only PUBLISHED listings are public; anything else must not be indexed.
  const property = await prisma.property
    .findFirst({
      where: { id, status: 'PUBLISHED' },
      select: {
        id: true,
        title: true,
        location: true,
        neighborhood: true,
        description: true,
        imagesJson: true,
        price: true,
        reviews: true,
        rating: true,
      },
    })
    .catch(() => null);

  if (!property) {
    return {
      status: 404,
      title: `Stay not found | ${SITE_NAME}`,
      description: 'This listing is no longer available. Browse our Nairobi short-let apartments instead.',
      canonicalUrl: `${origin}/stays`,
      imageUrl: `${origin}${DEFAULT_OG_IMAGE_PATH}`,
      imageIsBranded: true,
      type: 'website',
      jsonLd: [],
    };
  }

  const place = property.neighborhood || property.location;
  const image = firstImageUrl(property.imagesJson);
  // Listing titles often already carry the brand; adding it again reads badly
  // in a search result.
  const listingTitle = stripBrand(property.title);
  const meta = baseMeta(origin, `/stay/${property.id}`, {
    title: `${listingTitle} in ${place} | ${SITE_NAME}`,
    description: toDescription(
      property.description,
      `${listingTitle} is a furnished short-let apartment in ${place}, Nairobi.`
    ),
    imageUrl: absoluteUrl(origin, image),
  });

  const lodging: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Apartment',
    name: listingTitle,
    description: toDescription(property.description, `${listingTitle} in ${place}, Nairobi.`),
    url: meta.canonicalUrl,
    image: meta.imageUrl,
    address: {
      '@type': 'PostalAddress',
      addressLocality: place,
      addressRegion: 'Nairobi',
      addressCountry: 'KE',
    },
  };
  if (property.price) {
    lodging.priceRange = `KES ${property.price}`;
  }
  if (property.reviews > 0) {
    lodging.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: property.rating || undefined,
      reviewCount: property.reviews,
    };
  }

  meta.jsonLd = [
    lodging,
    breadcrumbJsonLd(origin, [
      { name: 'Home', path: '/' },
      { name: 'Stays', path: '/stays' },
      { name: listingTitle, path: `/stay/${property.id}` },
    ]),
  ];
  return meta;
}

async function guideMeta(origin: string, slug: string): Promise<PageMeta> {
  const post = await prisma.blogPost
    .findFirst({
      where: { slug, published: true },
      select: { title: true, slug: true, excerpt: true, coverImage: true, updatedAt: true },
    })
    .catch(() => null);

  if (!post) {
    return {
      status: 404,
      title: `Guide not found | ${SITE_NAME}`,
      description: 'This guide is no longer available. Read our other Nairobi travel guides instead.',
      canonicalUrl: `${origin}/guides`,
      imageUrl: `${origin}${DEFAULT_OG_IMAGE_PATH}`,
      imageIsBranded: true,
      type: 'website',
      jsonLd: [],
    };
  }

  const meta = baseMeta(origin, `/guides/${post.slug}`, {
    title: `${post.title} | ${SITE_NAME}`,
    description: toDescription(post.excerpt, `${post.title} - a Nairobi guide from ZuriLofts.`),
    imageUrl: absoluteUrl(origin, post.coverImage),
  });
  meta.type = 'article';
  meta.jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'Article',
      headline: post.title,
      description: meta.description,
      image: [meta.imageUrl],
      dateModified: post.updatedAt.toISOString(),
      author: { '@type': 'Organization', name: SITE_NAME },
      publisher: {
        '@type': 'Organization',
        name: SITE_NAME,
        logo: { '@type': 'ImageObject', url: `${origin}/pwa-512x512.png` },
      },
      mainEntityOfPage: meta.canonicalUrl,
    },
    breadcrumbJsonLd(origin, [
      { name: 'Home', path: '/' },
      { name: 'Guides', path: '/guides' },
      { name: post.title, path: `/guides/${post.slug}` },
    ]),
  ];
  return meta;
}

function staticMeta(origin: string, page: StaticPage): PageMeta {
  const meta = baseMeta(origin, page.path, page);
  if (page.path === '/') {
    meta.jsonLd = [
      organizationJsonLd(origin),
      {
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        name: SITE_NAME,
        url: `${origin}/`,
        inLanguage: ['en', 'sw'],
      },
    ];
  } else {
    meta.jsonLd = [
      breadcrumbJsonLd(origin, [
        { name: 'Home', path: '/' },
        { name: page.title.split(' | ')[0], path: page.path },
      ]),
    ];
  }
  return meta;
}

/**
 * Routes the browser handles on its own: signed-in screens, checkout, auth and
 * the legacy addresses that redirect. They keep the plain shell and they are not
 * not-founds, so the catch-all must answer 200 for them.
 */
const APP_ONLY_PREFIXES = [
  '/admin',
  '/host',
  '/booking',
  '/bookings',
  '/booking-history',
  '/payment',
  '/auth',
  '/login',
  '/register',
  '/profile',
  '/trips',
  '/inbox',
  '/messages',
  '/favourites',
  '/shortlists',
  '/verify-identity',
  '/s/',
  // Old addresses that the client redirects to their replacement.
  '/properties',
  '/property/',
];

export function isAppOnlyPath(pathname: string): boolean {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return APP_ONLY_PREFIXES.some((prefix) => {
    const base = prefix.replace(/\/$/, '');
    // Match the segment itself or something below it, never a longer word. A
    // plain startsWith treated /hostxyz as a signed-in screen, so every typo
    // built on a protected prefix answered 200 with the app shell instead of
    // being a not-found.
    return clean === base || clean.startsWith(`${base}/`);
  });
}

/**
 * Head metadata for a request path, or null when the path is app-only
 * (signed-in screens, checkout) and should keep the plain shell.
 */
export async function metaForPath(pathname: string, req: Request): Promise<PageMeta | null> {
  const origin = publicOriginForCrawlers(req);
  const clean = pathname.replace(/\/+$/, '') || '/';

  const staticPage = STATIC_PAGE_BY_PATH.get(clean);
  if (staticPage) return staticMeta(origin, staticPage);

  if (clean.startsWith('/stay/')) {
    const id = clean.slice('/stay/'.length).split('/')[0];
    if (!id) return null;
    return stayMeta(origin, id);
  }

  if (clean.startsWith('/guides/')) {
    const slug = clean.slice('/guides/'.length).split('/')[0];
    if (!slug) return null;
    return guideMeta(origin, slug);
  }

  return null;
}

/** Writes the per-page tags into the built shell, replacing the home defaults. */
export function injectMeta(html: string, meta: PageMeta): string {
  const title = escapeHtml(meta.title);
  const description = escapeHtml(meta.description);

  const tags = [
    `<link rel="canonical" href="${escapeHtml(meta.canonicalUrl)}">`,
    `<meta property="og:site_name" content="${escapeHtml(SITE_NAME)}">`,
    `<meta property="og:type" content="${meta.type}">`,
    `<meta property="og:title" content="${title}">`,
    `<meta property="og:description" content="${description}">`,
    `<meta property="og:url" content="${escapeHtml(meta.canonicalUrl)}">`,
    `<meta property="og:image" content="${escapeHtml(meta.imageUrl)}">`,
    meta.imageIsBranded ? '<meta property="og:image:width" content="1200">' : '',
    meta.imageIsBranded ? '<meta property="og:image:height" content="630">' : '',
    meta.imageIsBranded ? '<meta property="og:image:alt" content="ZuriLofts short-let apartments in Nairobi">' : '',
    `<meta name="twitter:card" content="summary_large_image">`,
    `<meta name="twitter:title" content="${title}">`,
    `<meta name="twitter:description" content="${description}">`,
    `<meta name="twitter:image" content="${escapeHtml(meta.imageUrl)}">`,
    ...meta.jsonLd.map(
      (entry) => `<script type="application/ld+json">${JSON.stringify(entry).replace(/</g, '\\u003c')}</script>`
    ),
  ].filter(Boolean);

  const withTitle = html.replace(/<title>[\s\S]*?<\/title>/i, `<title>${title}</title>`);
  const withDescription = withTitle.replace(
    /<meta\s+name="description"[^>]*>/i,
    `<meta name="description" content="${description}">`
  );
  return withDescription.replace(/<\/head>/i, `    ${tags.join('\n    ')}\n  </head>`);
}

/**
 * Addresses that were public before the /properties -> /stays rename. Search
 * results, emails and old share links still point at them, and the client fixes
 * those up in React, which a crawler only sees after it runs the app. Answering
 * with a permanent redirect here consolidates their ranking on the new URL.
 */
export function legacyRedirect(pathname: string): string | null {
  const clean = pathname.replace(/\/+$/, '') || '/';
  if (clean === '/properties') return '/stays';
  if (clean.startsWith('/property/')) {
    const id = clean.slice('/property/'.length).split('/')[0];
    if (id) return `/stay/${id}`;
  }
  return null;
}

/** robots.txt: block signed-in and checkout screens, point crawlers at the sitemap. */
export function buildRobots(origin: string): string {
  const disallow = [
    '/api/',
    '/admin',
    // Trailing slash matters: a bare '/host' is a prefix match that also blocks
    // /host-earnings-calculator, a public page the sitemap advertises.
    '/host/',
    '/booking/',
    '/bookings',
    '/payment/',
    '/auth/',
    '/login',
    '/register',
    '/profile',
    '/trips',
    '/inbox',
    '/messages',
    '/favourites',
    '/shortlists',
    '/verify-identity',
    '/s/',
  ];

  return [
    'User-agent: *',
    'Allow: /',
    ...disallow.map((path) => `Disallow: ${path}`),
    '',
    `Sitemap: ${origin}/sitemap.xml`,
    '',
  ].join('\n');
}

/** sitemap.xml: public pages plus every live listing and published guide. */
export async function buildSitemap(origin: string): Promise<string> {
  const [properties, posts] = await Promise.all([
    prisma.property
      .findMany({
        where: { status: 'PUBLISHED' },
        select: { id: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      })
      .catch(() => []),
    prisma.blogPost
      .findMany({
        where: { published: true },
        select: { slug: true, updatedAt: true },
        orderBy: { updatedAt: 'desc' },
      })
      .catch(() => []),
  ]);

  const urls = [
    ...STATIC_PAGES.map(
      (page) => `  <url>
    <loc>${escapeXml(`${origin}${page.path}`)}</loc>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
    ),
    ...properties.map(
      (property) => `  <url>
    <loc>${escapeXml(`${origin}/stay/${property.id}`)}</loc>
    <lastmod>${property.updatedAt.toISOString()}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`
    ),
    ...posts.map(
      (post) => `  <url>
    <loc>${escapeXml(`${origin}/guides/${post.slug}`)}</loc>
    <lastmod>${post.updatedAt.toISOString()}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.6</priority>
  </url>`
    ),
  ];

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.join('\n')}
</urlset>
`;
}
