// The server writes each page's title, description, share tags and canonical
// link into the HTML before it is sent (server/src/services/seo.service.ts),
// which is what crawlers and link previews read. Nothing updated those tags
// again afterwards, so a property's share image and description stayed put on
// every page the visitor clicked through to next. This module keeps the ones
// the browser can work out for itself in step with the current route.
//
// It deliberately does not try to mirror the server's whole head: title and
// structured data are already handled where the page owns them, and a second
// copy of the server's wording would drift out of step with it.

const DEFAULT_DESCRIPTION =
  'ZuriLofts - Premium short-let apartments in Nairobi. Book your stay today.';

// Routes the browser renders but that should not be offered to a crawler as a
// canonical destination. Kept in step with the robots rules and the client
// routes in src/App.jsx.
const NON_PUBLIC_PREFIXES = [
  '/admin', '/host', '/booking', '/bookings', '/booking-history', '/payment',
  '/auth', '/login', '/register', '/profile', '/trips', '/inbox', '/messages',
  '/favourites', '/shortlists', '/verify-identity', '/properties', '/property/',
  '/s/',
];

export function isPublicPath(pathname) {
  const clean = pathname.replace(/\/+$/, '') || '/';
  return !NON_PUBLIC_PREFIXES.some(
    (prefix) => clean === prefix.replace(/\/$/, '') || clean.startsWith(prefix)
  );
}

/** Points the canonical link at the current address, or removes it off-app. */
export function syncCanonical(pathname) {
  const existing = document.querySelector('link[rel="canonical"]');
  if (!isPublicPath(pathname)) {
    existing?.remove();
    return;
  }
  const link = existing || document.head.appendChild(
    Object.assign(document.createElement('link'), { rel: 'canonical' })
  );
  // The query string is left out: /stays?page=2 and /stays are one page.
  link.setAttribute('href', `${window.location.origin}${pathname}`);
}

/**
 * Sets the tags a detail page owns and returns a function that puts back
 * exactly what was there before. Call it from an effect and return it as the
 * cleanup, so leaving the page cannot leave its wording behind.
 */
export function applyPageOverrides({ description, ogTitle, ogDescription, ogImage }) {
  const previous = [];

  const write = (selector, attributes, content) => {
    if (!content) return;
    const existing = document.querySelector(selector);
    if (existing) {
      previous.push({ el: existing, content: existing.getAttribute('content') });
      existing.setAttribute('content', content);
      return;
    }
    const el = document.createElement('meta');
    Object.entries(attributes).forEach(([name, value]) => el.setAttribute(name, value));
    el.setAttribute('content', content);
    document.head.appendChild(el);
    previous.push({ el, content: null, created: true });
  };

  write('meta[name="description"]', { name: 'description' }, description);
  write('meta[property="og:title"]', { property: 'og:title' }, ogTitle);
  write('meta[property="og:description"]', { property: 'og:description' }, ogDescription);
  write('meta[property="og:image"]', { property: 'og:image' }, ogImage);
  write('meta[name="twitter:title"]', { name: 'twitter:title' }, ogTitle);
  write('meta[name="twitter:description"]', { name: 'twitter:description' }, ogDescription);
  write('meta[name="twitter:image"]', { name: 'twitter:image' }, ogImage);

  return () => {
    previous.forEach(({ el, content, created }) => {
      if (created) el.remove();
      else if (content === null) el.removeAttribute('content');
      else el.setAttribute('content', content);
    });
  };
}

export { DEFAULT_DESCRIPTION };
