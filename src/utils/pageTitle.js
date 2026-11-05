// Tab titles, in one place.
//
// Every route needs its own title the moment it opens, and no route may keep
// the previous page's title. Before this table, 17 pages named themselves and
// the rest named nothing, so leaving the host workspace left the tab reading
// "Today | ZuriLofts Host" on the public site, and most pages read as the home
// page.
//
// A page whose title depends on loaded data (a property's name, a guide's
// title) still sets its own title afterwards: this resolves first, so the
// specific title wins and this one covers the moment before the data arrives.

/** The title the shipped HTML carries, used for the home page and as a fallback. */
export const BASE_TITLE = 'ZuriLofts - Premium Short-let Apartments';

// First match wins, so the more specific paths come before the broad prefixes.
// Rule order is the only thing to get right here: /booking/:id is a checkout
// while /bookings/:id is a past booking, and /host-earnings-calculator is a
// public page even though its path begins with /host.
const ROUTE_TITLES = [
  [/^\/$/, 'title.home'],

  // Guest: discovery and public pages
  [/^\/stays$/, 'title.stays'],
  [/^\/stay\/[^/]+$/, 'title.stay'],
  // Old guest addresses, which redirect. Listed so the tab title is already
  // correct during that redirect instead of blinking "Page not found".
  [/^\/properties$/, 'title.stays'],
  [/^\/property\/[^/]+$/, 'title.stay'],
  [/^\/places$/, 'title.places'],
  [/^\/restaurants$/, 'title.restaurants'],
  [/^\/guides$/, 'title.guides'],
  [/^\/guides\/[^/]+$/, 'title.guide'],
  [/^\/become-a-host$/, 'title.becomeHost'],
  [/^\/host-earnings-calculator$/, 'title.earningsCalculator'],
  [/^\/help$/, 'title.help'],
  [/^\/help\/[^/]+$/, 'title.helpArticle'],
  [/^\/privacy$/, 'title.privacy'],
  [/^\/terms$/, 'title.terms'],
  [/^\/credits$/, 'title.credits'],

  // Guest: account and the booking flow
  [/^\/login$/, 'title.login'],
  [/^\/forgot-password$/, 'title.forgotPassword'],
  [/^\/reset-password$/, 'title.resetPassword'],
  [/^\/register$/, 'title.register'],
  [/^\/auth\/callback$/, 'title.authCallback'],
  [/^\/booking\/[^/]+$/, 'title.checkout'],
  [/^\/payment\/callback$/, 'title.payment'],
  [/^\/trips$/, 'title.trips'],
  [/^\/(?:booking-history|bookings)$/, 'title.bookingHistory'],
  [/^\/bookings\/[^/]+$/, 'title.bookingDetail'],
  [/^\/inbox$/, 'title.messages'],
  [/^\/inbox\/[^/]+$/, 'title.conversation'],
  [/^\/messages$/, 'title.support'],
  [/^\/profile$/, 'title.profile'],
  [/^\/verify-identity$/, 'title.verifyIdentity'],
  [/^\/favourites$/, 'title.favourites'],
  [/^\/shortlists$/, 'title.shortlists'],
  [/^\/shortlists\/[^/]+$/, 'title.shortlist'],
  [/^\/s\/[^/]+$/, 'title.sharedShortlist'],

  // Host workspace
  [/^\/host\/today$/, 'title.hostToday'],
  [/^\/host\/calendar\/[^/]+$/, 'title.hostPropertyCalendar'],
  [/^\/host\/calendar$/, 'title.hostCalendar'],
  [/^\/host\/listings$/, 'title.hostListings'],
  [/^\/host\/listings\/[^/]+\/preview$/, 'title.hostPreview'],
  [/^\/host\/verification$/, 'title.hostVerification'],
  [/^\/host\/inbox$/, 'title.hostInbox'],
  [/^\/host\/inbox\/[^/]+$/, 'title.hostConversation'],
  [/^\/host\/listings\/new$/, 'title.hostNewListing'],
  [/^\/host\/properties\/new$/, 'title.hostNewListing'],
  [/^\/host\/listings\/[^/]+\/edit$/, 'title.hostEditListing'],
  [/^\/host\/properties\/[^/]+\/edit$/, 'title.hostEditListing'],
  [/^\/host\/earnings$/, 'title.hostEarnings'],
  [/^\/host\/payouts$/, 'title.hostPayouts'],
  [/^\/host\/discounts$/, 'title.hostDiscounts'],
  [/^\/host\/application$/, 'title.hostApplication'],
  [/^\/host\/reservations$/, 'title.hostReservations'],
  [/^\/host\/reservations\/[^/]+$/, 'title.hostReservation'],
  [/^\/host\/settings$/, 'title.hostSettings'],
  [/^\/host\/insights$/, 'title.hostInsights'],

  // Admin
  [/^\/admin$/, 'title.adminOverview'],
  [/^\/admin\/revenue$/, 'title.adminRevenue'],
  [/^\/admin\/listings$/, 'title.adminListingReview'],
  [/^\/admin\/properties$/, 'title.adminListingReview'],
  [/^\/admin\/listings\/[^/]+\/preview$/, 'title.adminListingPreview'],
  [/^\/admin\/properties\/[^/]+\/preview$/, 'title.adminListingPreview'],
  [/^\/admin\/listings\/[^/]+$/, 'title.adminListingReview'],
  [/^\/admin\/properties\/[^/]+$/, 'title.adminListingReview'],
  [/^\/admin\/settings$/, 'title.adminSettings'],
  [/^\/admin\/users$/, 'title.adminUsers'],
  [/^\/admin\/host-applications$/, 'title.adminHostApplications'],
  [/^\/admin\/trust-safety$/, 'title.adminTrustSafety'],
  [/^\/admin\/governance$/, 'title.adminGovernance'],
  [/^\/admin\/addons$/, 'title.adminAddons'],
  [/^\/admin\/bookings$/, 'title.adminReservations'],
  [/^\/admin\/feedback$/, 'title.adminFeedback'],
  [/^\/admin\/messages(?:\/[^/]+)?$/, 'title.adminMessages'],
  [/^\/admin\/guides$/, 'title.adminGuides'],

  // A workspace path that is not listed above still belongs to its app, so name
  // the app rather than letting it fall through to "not found".
  [/^\/host\//, 'title.hostWorkspace'],
  [/^\/admin\//, 'title.adminOverview'],
];

/**
 * The tab title for a pathname. Unknown or unmatched paths get the not-found
 * title, which is also what the not-found page renders.
 */
export function resolveTitle(pathname, t) {
  // Without a translator (a test, or a caller with no language in scope) fall
  // back to English rather than returning a raw key.
  const translate = typeof t === 'function' ? t : (key) => key;
  if (typeof pathname !== 'string' || pathname === '') return translate('title.home');
  // A trailing slash is the same page; the table matches the bare path.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const [pattern, title] of ROUTE_TITLES) {
    if (pattern.test(path)) return translate(title);
  }
  return translate('title.notFound');
}
