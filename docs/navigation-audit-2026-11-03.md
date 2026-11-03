# Navigation audit and verification plan

Date: 2026-11-03. Scope: admin, guest and host navigation; legacy addresses;
login return destinations; notification links; missing or misleading targets.
No application changes were implemented.

## What was verified

Source inspection mapped desktop/mobile menus, account navigation, footer,
page actions and 25 server-generated destination shapes. The main menu URLs
have matching client routes. No `href="#"` or social-link placeholders were
found in the inspected source extraction. This does not certify external
websites or every URL stored in the database.

An isolated headless browser executed the actual `App.jsx`,
`WorkspaceRoutes.jsx`, role guards, login, registration, OAuth callback and
React Router. Synthetic auth fixtures replaced authentication. Main page
bodies, layout and data dependencies were replaced with named page doubles
to identify route selection without a backend. Real MobileBottomNav was
tested separately with a controlled mode fixture. No account was created,
no form submitted, and no production service or data was accessed.

- 344 browser assertions passed: 62 representative route shapes across five
  role fixtures (310 cases), 18 legacy redirects, three login-guard cases,
  six login destination cases, six missing-route cases and one fragment case.
- Ten additional assertions passed: signup/Google return-link handling,
  registration and OAuth destinations, hosting intent and mobile navigation.
- Zero browser page errors occurred in the isolated fixtures.
- Twelve server redirect/classifier probes passed with zero real database
  calls. They used redirect middleware extracted from `server/src/index.ts`
  and the app-only path classifier; they did not test full metadata rendering.
- Existing `server/tests/seo.meta.test.ts`: six tests passed, zero failed,
  using synthetic configuration.

Passing assertions include reproduction of defects below. They mean the
observed behavior was verified, not that every journey works correctly.

## Route and navigation inventory

`src/App.jsx` dispatches public and guest pages. `src/WorkspaceRoutes.jsx`
defines host/admin routes and workspace legacy redirects.

| Area | Canonical destinations and aliases | Main source |
| --- | --- | --- |
| Public discovery | `/`, `/stays`, `/stay/:id`, `/places`, `/restaurants`, `/guides`, `/guides/:slug` | `App.jsx`; `Navbar.jsx:251-276`; `GuestDiscovery.jsx` |
| Public hosting and legal | `/become-a-host`, `/host-earnings-calculator`, `/privacy`, `/terms` | `App.jsx`; footer at `GuestDiscovery.jsx:278` |
| Shared lists and checkout | `/s/:token`, `/booking/:propertyId`, `/payment/callback` | `App.jsx` |
| Authentication | `/login`, `/register`, `/auth/callback` | `App.jsx`; actual auth pages |
| Guest reservations | `/trips`, `/bookings`, `/booking-history`, `/bookings/:id` | `App.jsx`; `MobileBottomNav.jsx:20-67` |
| Guest messaging/account | `/inbox`, `/inbox/:id`, `/messages`, `/profile`, `/verify-identity` | `App.jsx`; `GuestAccountLayout.jsx:26-35`; Navbar account menu |
| Saved stays | `/favourites`, `/shortlists`, `/shortlists/:id` | `App.jsx`; guest menus |
| Host setup | `/host/application` | ProtectedRoute, then HostLayout; distinct from the host guard |
| Host listings | `/host/listings`, `/host/listings/new`, `/host/listings/:id/edit`, `/host/listings/:id/preview`, `/host/listings/:id/arrival-guide` | `WorkspaceRoutes.jsx`; `HostLayout.jsx:38-47` |
| Host operations | `/host/today`, `/host/calendar`, `/host/calendar/:id`, `/host/inbox`, `/host/inbox/:conversationId`, `/host/reservations`, `/host/reservations/:id` | `WorkspaceRoutes.jsx`; HostLayout and HostMobileBottomNav |
| Host money/account | `/host/insights`, `/host/earnings`, `/host/payouts`, `/host/discounts`, `/host/settings`, `/host/verification` | `WorkspaceRoutes.jsx`; `HostLayout.jsx:422-453` |
| Admin overview/people | `/admin`, `/admin/users`, `/admin/host-applications`, `/admin/host-applications/:id`, `/admin/trust-safety` | `WorkspaceRoutes.jsx`; `AdminDashboard.jsx:96-126` |
| Admin platform | `/admin/revenue`, `/admin/bookings`, `/admin/listings`, `/admin/listings/:id`, `/admin/listings/:id/preview`, `/admin/addons`, `/admin/guides`, `/admin/feedback`, `/admin/governance` | Same workspace routes and sidebar |
| Admin messages/account | `/admin/messages`, `/admin/messages/:userId`, `/admin/settings` | Same workspace routes and account menu |

Guest mobile tabs link Home, Saved, Trips, Inbox and Profile. Host mobile
tabs link Today, Calendar, Listings, Inbox and Earnings. Admin mobile uses
the same destination collection as its desktop menu.

The 25 server destination shapes include notice/push targets, payment and
OAuth returns, public SEO pages and dynamic stay/guide pages. Each has a
client route counterpart. Runtime administrator broadcast URLs remain
data-dependent and need separate validation.

## Role behavior observed in the route fixtures

| Fixture | Guest protected routes | Host workspace | Admin workspace |
| --- | --- | --- | --- |
| Anonymous | Login with pathname-only returnUrl | Login without return destination | Login without return destination |
| Signed-in USER | Page route selected | Access denied | Access denied |
| USER with SUBMITTED host application | Page route selected | Host page route selected | Access denied |
| HOST | Page route selected | Host page route selected | Access denied |
| ADMIN | Page route selected | Redirect to `/admin` | Admin page route selected |

The separate `/host/application` route admits every authenticated fixture,
including ADMIN. Whether that is intended needs a product/access decision.
The frontend host guard admits pending applicants even on payout page routes;
API eligibility still controls money actions. Page selection is not evidence
of server permission or a working payout.

Suspended accounts, real cookie restoration and real ownership boundaries
were not simulated by these navigation fixtures. Those need live API and
end-to-end tests; the security audit addresses separate API controls.

## Legacy address verification

| Old address | Verified client destination |
| --- | --- |
| `/properties?guests=2` | `/stays?guests=2` |
| `/property/:id?review=true` | `/stay/:id?review=true` |
| `/host/properties` | `/host/listings` |
| `/host/properties/new?step=2` | `/host/listings/new?step=2` |
| `/host/properties/:id/edit?step=2` | `/host/listings/:id/edit?step=2` |
| `/host/properties/:id/preview` | `/host/listings/:id/preview` |
| `/admin/properties?status=PENDING_REVIEW` | `/admin/listings?status=PENDING_REVIEW` |
| `/admin/properties/:id` and `/:id/preview?x=1` | Corresponding listing detail/preview, preserving the supplied query |
| `/admin/properties/new`, `/:id/edit`, `/:id/calendar` | `/admin/listings` |
| `/admin/earnings`, `/admin/payouts`, `/admin/promos` | `/admin` |
| `/admin/identity-verifications`, `/admin/disputes` | `/admin/trust-safety` |
| `/admin/audit` | `/admin/governance` |

These aliases remain useful for bookmarks and sent messages. Broad redirects
to an index are intentional route retirement, not proof that the old action
still exists. Preservation of all fragments and queries is incomplete below.

## Findings and planned acceptance checks

### NAV-01: P2 - Authentication drops the intended task

Browser-confirmed:

- `/profile?tab=bookings#privacy` becomes `/login?returnUrl=%2Fprofile`.
- Host listing edit, including step and fragment, becomes plain `/login`.
- Admin listing review also becomes plain `/login`.
- Login's create-account and Google links do not carry returnUrl.
- Registration and OAuth completion ignore an explicit returnUrl and choose
  their role/hosting-intent destination instead.
- Ordinary login does preserve an explicitly supplied returnUrl containing
  a query and fragment. Guest/HOST/ADMIN default login destinations are
  correctly `/`, `/host/today`, `/admin`.

Files: `ProtectedRoute.jsx:23`, `HostRoute.jsx:31`, `AdminRoute.jsx:32`,
`LoginPage.jsx:30,110-113`, `RegisterPage.jsx:47-50`, `OAuthCallback.jsx:23-34`.

Plan: preserve pathname, search and hash through sign-in, signup and OAuth,
using one validated internal destination. Retain role eligibility and host
intent; reject external, malformed and unauthorized destinations.

Acceptance: logged-out deep links return to the same authorized task after
each auth method. Test query/fragment retention, cancelled sign-in, expiry,
cross-role destinations, malicious return values and restored sessions.

### NAV-02: P2 - Review actions miss the available composer

Source-confirmed mismatch: Trips sends eligible past stays to
`/stay/:id?review=true`, but PropertyPage reads only `variant`. Stay-page
Write review links go to `/bookings`, whose history screen has no composer.
An existing review composer lives in Profile's bookings tab.

Files: `TripHubPage.jsx:134`, `PropertyPage.jsx:30-31`,
`ReviewSection.jsx:73,101`, `ProfilePage.jsx:842` onward.

Plan: choose a booking-specific review destination and make every review
action open that composer. Avoid introducing a duplicate review feature.
Acceptance: an eligible completed booking opens its own form; already
reviewed, cancelled, ineligible and unknown bookings show appropriate states.
Composer behavior needs a real-data/browser check.

### NAV-03: P2 - Help and recovery destinations are incomplete

Help Centre links open editorial guides, including the footer and auth
shell. Forgotten password opens email support rather than a reset screen.
The isolated router confirms `/help`, `/forgot-password` and
`/reset-password` reach Not Found. These are feature gaps; the current
mailto recovery link is not a broken internal route.

Files: `GuestDiscovery.jsx:278`, `AuthShell.jsx:41`, `LoginPage.jsx:101`,
`App.jsx`. Specify help and recovery screens in the next dedicated plan step.
Acceptance: promised support/recovery actions reach their named experience,
including signed-out users and failed/expired recovery requests.

### NAV-04: P2 - Guest mobile navigation depends on remembered host mode

The actual MobileBottomNav rendered five guest links for `/stays` under
travelling mode and no links for that same route under hosting mode.
Files: `MobileBottomNav.jsx:82-84`, `HostLayout.jsx:132-133`.

Plan: derive the visible navigation from the current surface, with account
mode used only where needed. Acceptance: after entering the host workspace,
opening a shared stay, `/stays` or `/trips` still offers appropriate guest
navigation. Confirm the complete provider/layout interaction on mobile.

### NAV-05: P2 - Host message notifications use the guest inbox

Source-confirmed: `conversation.service.ts:283` sends both recipient types
to `/inbox/:conversationId`, although `/host/inbox/:conversationId` exists.
The guest route resolves, so this is a workspace-context mismatch rather
than a missing route.

Plan: choose the notification target by recipient context. Acceptance:
guest-to-host messages open the host thread, and host-to-guest messages open
the guest thread, including clicks after session expiry/restoration.

### NAV-06: P2 - Some fragment targets are unavailable or stale

Source findings needing full-component browser confirmation:

- IdentityVerificationPanel always renders a documents step link, but its
  `#verification-documents` section exists only for editable states. It is
  absent for SUBMITTED and APPROVED (`:120,254-258,315`).
- Profile reads the hash only when initializing activeTab (`:76-79`).
  Changing `/profile#info` to `#bookings` while mounted may not switch tabs.
  `#privacy` does exist (`:592`) but sits inside the Info tab.

Plan: render only meaningful step links and respond to location changes.
Acceptance: same-page navigation opens the correct panel before scrolling;
submitted/approved identity screens contain no links to absent sections.

### NAV-07: P2 - Unknown URL prefixes can receive HTTP 200

Isolated server probes confirmed that `/hostile`, `/login-typo`,
`/admin-typo`, `/properties-other` and `/property` satisfy the app-only
classifier. `index.ts:61` then serves a successful shell when metadata is
absent. Files: `seo.service.ts:419-422`, `server/src/index.ts:55-62`.

Risk: HTTP status can hide broken links from crawlers and link checks.
Plan: match supported routes or segment boundaries. Acceptance: typo URLs
return HTTP 404 plus useful Not Found UI; valid protected deep links retain
their expected shell. Verify the full built production server separately.

### NAV-08: P3 - Legacy normalization differs between client and server

Client redirect `/properties?guests=2#results` drops `#results` in the browser.
Server `legacyRedirect` truncates `/property/demo/extra` to `/stay/demo`,
while the client preserves `/extra` in the new path. Files: `App.jsx:64-69`,
`WorkspaceRoutes.jsx:47-52`, `seo.service.ts:487-494`.

Plan: define one rule for valid legacy paths, extra segments, trailing
slashes, queries and fragments. Acceptance: direct requests and client
transitions agree; malformed addresses do not silently select another stay.
HTTP fragments are browser-only and need separate redirect assertions.

### NAV-09: P3 - Some labels promise a more specific destination

Source findings:

- Listing settings gear opens host account settings
  (`ListingEditorTabs.jsx:39-40`). Relabel it or choose listing settings.
- All featured guide cards open the general guides index, despite specific
  article titles (`GuestDiscovery.jsx:28-31,231`). Choose matching published
  slugs or clarify the labels.
- Footer hosting CTA sends ADMIN to host Today, which redirects to admin
  (`GuestDiscovery.jsx:275-278`, `HostRoute.jsx:35`). Use a role-appropriate
  action or omit it.

Acceptance: labels, accessible names and destination content agree.

## Missing routes, dynamic data and external destinations

`/host` itself, `/admin/no-such-page` and `/contact` also selected Not Found
in the isolated browser. No active internal link to bare `/host` or
`/contact` was established. Do not create pages merely to satisfy guessed
URLs; add an entry redirect or page only where the product needs one.

The following still need live record fixtures and full page checks:

- Stay links from historical bookings: deleted/unpublished listings must
  retain a useful reservation view and avoid misleading public-page actions.
- Conversation creation: failed/empty API results must not navigate to
  an undefined ID. Test both guest and host reservation actions.
- Unknown, removed or unauthorized guide, shortlist, booking and thread IDs.
- Profile tab changes, review eligibility and identity fragments above.
- Signed-in/mobile menu visibility and new-tab/back/forward behavior.
- Map, calendar, mailto and any database-supplied external/broadcast URLs.
  No external availability check was performed.

Receipt navigation is not missing: Trips opens booking detail, which has
invoice generation. Existing reviews, trust and privacy-cookie target IDs
also exist; they should not be reported as absent without a state-specific
reproduction.

## Reproduction and handoff

Browser commands were `node .kai/tmp/navigation-audit.mjs` and the same
command with `--extras`. The ignored local harness bundled existing route
modules with esbuild, used the already installed Playwright/Chromium,
blocked non-local requests and closed its temporary HTTP server/browser.
Ignored JSON outputs retain the 354 observed assertions for local review.
The temporary harness source was removed after verification.

Server checks used `node --import tsx --test tests/seo.meta.test.ts` and a
temporary extracted-middleware probe; the latter was removed. Its classifier
negative controls do not model public metadata resolution and must not be
mistaken for production page failures.

The navigation source map and isolated checks are complete. Full live-data
and desktop/mobile journey verification remains in the separate journey
plan step. Implement no fixes until authorized. Future changes need focused
regression tests for these cases and the existing lint/build checks.
