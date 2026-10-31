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
  [/^\/$/, BASE_TITLE],

  // Guest: discovery and public pages
  [/^\/properties$/, 'Stays in Nairobi | ZuriLofts'],
  [/^\/property\/[^/]+$/, 'Stay | ZuriLofts'],
  [/^\/places$/, 'Places to visit | ZuriLofts'],
  [/^\/restaurants$/, 'Restaurants | ZuriLofts'],
  [/^\/guides$/, 'Travel guides | ZuriLofts'],
  [/^\/guides\/[^/]+$/, 'Travel guide | ZuriLofts'],
  [/^\/become-a-host$/, 'Become a host | ZuriLofts'],
  [/^\/host-earnings-calculator$/, 'Earnings calculator | ZuriLofts'],
  [/^\/privacy$/, 'Privacy policy | ZuriLofts'],
  [/^\/terms$/, 'Terms of service | ZuriLofts'],

  // Guest: account and the booking flow
  [/^\/login$/, 'Sign in | ZuriLofts'],
  [/^\/register$/, 'Create account | ZuriLofts'],
  [/^\/auth\/callback$/, 'Signing in | ZuriLofts'],
  [/^\/booking\/[^/]+$/, 'Checkout | ZuriLofts'],
  [/^\/payment\/callback$/, 'Payment | ZuriLofts'],
  [/^\/trips$/, 'Trips | ZuriLofts'],
  [/^\/(?:booking-history|bookings)$/, 'Booking history | ZuriLofts'],
  [/^\/bookings\/[^/]+$/, 'Booking details | ZuriLofts'],
  [/^\/inbox$/, 'Messages | ZuriLofts'],
  [/^\/inbox\/[^/]+$/, 'Conversation | ZuriLofts'],
  [/^\/messages$/, 'Support | ZuriLofts'],
  [/^\/profile$/, 'My profile | ZuriLofts'],
  [/^\/verify-identity$/, 'Trust and recovery | ZuriLofts'],
  [/^\/favourites$/, 'Favourites | ZuriLofts'],
  [/^\/shortlists$/, 'My Shortlists | ZuriLofts'],
  [/^\/shortlists\/[^/]+$/, 'Shortlist | ZuriLofts'],
  [/^\/s\/[^/]+$/, 'Shared Shortlist | ZuriLofts'],

  // Host workspace
  [/^\/host\/today$/, 'Today | ZuriLofts Host'],
  [/^\/host\/calendar\/[^/]+$/, 'Property calendar | ZuriLofts Host'],
  [/^\/host\/calendar$/, 'Availability calendar | ZuriLofts Host'],
  [/^\/host\/listings$/, 'Your listings | ZuriLofts Host'],
  [/^\/host\/inbox$/, 'Guest messages | ZuriLofts Host'],
  [/^\/host\/inbox\/[^/]+$/, 'Guest conversation | ZuriLofts Host'],
  [/^\/host\/properties\/new$/, 'New listing | ZuriLofts Host'],
  [/^\/host\/properties\/[^/]+\/edit$/, 'Edit listing | ZuriLofts Host'],
  [/^\/host\/earnings$/, 'Earnings | ZuriLofts Host'],
  [/^\/host\/payouts$/, 'Payouts | ZuriLofts Host'],
  [/^\/host\/discounts$/, 'Discounts | ZuriLofts Host'],
  [/^\/host\/application$/, 'Host setup | ZuriLofts Host'],
  [/^\/host\/reservations$/, 'Reservations | ZuriLofts Host'],
  [/^\/host\/reservations\/[^/]+$/, 'Reservation | ZuriLofts Host'],
  [/^\/host\/settings$/, 'Host settings | ZuriLofts Host'],

  // Admin
  [/^\/admin$/, 'Overview | ZuriLofts Admin'],
  [/^\/admin\/revenue$/, 'Revenue | ZuriLofts Admin'],
  [/^\/admin\/properties$/, 'Listing review | ZuriLofts Admin'],
  [/^\/admin\/users$/, 'Users | ZuriLofts Admin'],
  [/^\/admin\/host-applications$/, 'Host applications | ZuriLofts Admin'],
  [/^\/admin\/trust-safety$/, 'Trust and safety | ZuriLofts Admin'],
  [/^\/admin\/governance$/, 'Governance | ZuriLofts Admin'],
  [/^\/admin\/addons$/, 'Add-ons | ZuriLofts Admin'],
  [/^\/admin\/feedback$/, 'Feedback | ZuriLofts Admin'],
  [/^\/admin\/messages(?:\/[^/]+)?$/, 'Support messages | ZuriLofts Admin'],
  [/^\/admin\/guides$/, 'Guides | ZuriLofts Admin'],

  // A workspace path that is not listed above still belongs to its app, so name
  // the app rather than letting it fall through to "not found".
  [/^\/host\//, 'Host workspace | ZuriLofts Host'],
  [/^\/admin\//, 'Overview | ZuriLofts Admin'],
];

/**
 * The tab title for a pathname. Unknown or unmatched paths get the not-found
 * title, which is also what the not-found page renders.
 */
export function resolveTitle(pathname) {
  if (typeof pathname !== 'string' || pathname === '') return BASE_TITLE;
  // A trailing slash is the same page; the table matches the bare path.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  for (const [pattern, title] of ROUTE_TITLES) {
    if (pattern.test(path)) return title;
  }
  return 'Page not found | ZuriLofts';
}
