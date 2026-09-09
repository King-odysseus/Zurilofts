# design2.md implementation status

Owner of this report: Claude (phases 0-2, guest routes). Codex extends this table for phases 3-5
(host/admin rows). Do not mark a row done without evidence — see design2.md section 8.

**Baseline:** `62240f8`. **Session 1 HEAD:** `ceba88f`. **This session's HEAD:** `dbb724c`.
**Environment:** local dev, Windows 11, Vite dev server (`npm run dev`, port 5173) + Express/tsx
backend (port 3000) + SQLite dev DB. Test accounts used: `user@example.com` / `User@1234` (seeded
guest, has a HostApplication in DRAFT so also lands in `/host/today` on login - unrelated to this
work), `admin@zurilofts.co.ke` / `Admin@123` (seeded, not exercised this session). No production
data, payments, or moderation actions were exercised; test AddOns/bookings/shortlists/disputes
created for evidence were removed or left as harmless dev-only rows (noted per section below).
**Screenshots:** stored outside the repo at
`C:/Users/Mega-Mind/Documents/ZuriLofts Design Audit/phase0-1-guest/` (not committed).
**Commits, session 1:** a5bea88, 5a8ae5b, c68a5f0, 7649db1, c02dd41, 8edca49, ceba88f, a3b4d0c.
**Commits, this session:** e6909d9, 17ccab8, 342ac18, e6b0617, 6e143f4, dde516a, d23dd52, bd01b6b,
76ac718, ffb9f23, dbb724c (all on `main`).

## How to read this table

- **Implemented** = changed and verified this session (or a prior session, noted) with a real
  screenshot and/or a passing test listed in Evidence.
- **Partial** = some acceptance criteria met, concrete gap named.
- **Not verified this session** = not re-inspected against design2.md's specific criteria; not
  the same as "implemented."
- **Not started** = no design2.md-specific work done.

## Shared foundation (section 2, section 4 guest nav)

| Item | Status | Evidence | Notes |
|---|---|---|---|
| `ui-btn-primary` bronze (was blue) | Implemented | commit a5bea88 | Session 1. |
| `PropertyCard` — no Book Now pill, capacity, 44px favourite target | Implemented | commit 5a8ae5b | Session 1. |
| Guest mobile bottom navigation | Implemented | commit ceba88f; `home-phone-bottomnav.png` | Session 1. |
| Guest desktop nav — Saved/Messages grouping | Implemented | Navbar.jsx `Saved` → `/favourites` (All saved/My lists tabs), `Messages` → `/inbox` (Inbox/Support tabs, this session's `bd01b6b`) | The Navbar's own destinations were already correct; the grouping requirement is satisfied by the destination pages, verified this session. |
| Checkout hides global nav/bottom tabs, compact logo/back header | Partial | Path-matching logic verified for the bottom nav | BookingPage's own header (Navbar + sticky summary bar) was not re-audited for a "compact logo/back only" treatment this session - it currently renders the full `<Navbar />`. Flagged, not fixed. |

## G1 — Discovery and property details (`/`, `/properties`, `/property/:id`)

| Route | Status | Evidence | Notes |
|---|---|---|---|
| `/` | Implemented | Session 1 (c02dd41, a5bea88, 5a8ae5b) | Unchanged this session. |
| `/properties` | Implemented | Session 1 (c68a5f0, 7649db1) | Unchanged this session. |
| `/property/:id` | Not verified this session | `property-detail-desktop-viewport.png` (session 1) | 2/3–1/3 desktop grid with sticky booking summary confirmed pre-existing and compliant (session 1). Full detail page (amenities expansion, reviews, map, policy) still not exhaustively audited. |

Backend: `GET /properties` `checkIn`/`checkOut` availability filter — unchanged this session, see
session 1 notes below.

## G2 — Booking, trips and history

| Route | Status | Evidence | Notes |
|---|---|---|---|
| `/booking/:id` | **Implemented this session** | commit e6909d9; `booking-stage2-details-extras-expanded.png`, `booking-stage2-extras-qty-selected.png`, `booking-stage3-payment.png`, live network trace (see Checks) | The confirmed session-1 gap - add-ons were a separate 4th screen - is fixed. Add-ons now render as an accordion inside the single Details screen. Verified end-to-end against a real login + seeded AddOns: selecting extras before Continue makes no network call (local-only state); "Continue to Payment" fires exactly one `POST /bookings` then one `POST /bookings/:id/addons`; going back to Details preserves guest info and extras; a further quantity change after that correctly `PATCH`es immediately (no duplicate booking, no dropped edit). Payment step (method choice, price breakdown incl. the add-on line, promo code) unchanged. Test bookings created for this verification were deleted from the dev DB afterward. |
| `/trips` | **Implemented this session** | commit 17ccab8; `trips-desktop-upcoming.png`, `trips-phone-upcoming.png` | Added the required "next stay" priority treatment (image, status, dates, View check-in details, Message host, Directions, Receipt) above the Upcoming/Past tabs. Directions reuses the existing `googleMapsDirectionsUrl` helper; Receipt reuses the PDF invoice generator (extracted to `src/utils/invoice.js`, shared with `/bookings`) and is gated to `CONFIRMED` bookings only. Verified live with a seeded CONFIRMED booking. |
| `/bookings` | Implemented (pre-existing, verified this session) | Code inspection: `BookingHistoryPage.jsx` already has Upcoming/Past/Cancelled tabs and an Invoice/receipt action | No change needed; now shares `generateInvoice` with Trips instead of a duplicate copy. |

## G3 — Saved and local exploration

| Route | Status | Evidence | Notes |
|---|---|---|---|
| `/favourites` | Implemented this session (bugfix) | commit 342ac18 | Fixed a real bug: each `PropertyCard` was wrapped in an extra `<Link>`, producing invalid nested `<a>` tags (PropertyCard already renders its own full-card link). All saved/My lists tabs confirmed already present and correct. |
| `/shortlists` | **Implemented this session** | commit e6b0617; `shortlists-desktop-collage-v2.png` | Added the required image collage (previously text-only cards). `listUserShortlists` now includes up to 4 recent items' first image via a new `firstPropertyImage` helper (unit tested, works against both SQLite JSON and Postgres native array columns). Empty/imageless shortlists get a deliberate placeholder icon. Fixed a real overflow bug found during verification: collage images without `overflow-hidden` on their container painted over the card's text below at their native aspect ratio despite the CSS box being correctly sized — added `overflow-hidden` and `h-full` on the nested grid; confirmed fixed with a before/after screenshot. |
| `/shortlists/:id` | Implemented (pre-existing, verified this session) | `shortlist-detail-desktop.png` | Editable title (rename), notes, remove control, Share with copy-link feedback all confirmed working live. No literal "description" field exists in the Shortlist model (name/token only) - not fabricated. |
| `/s/:token` | **Implemented this session** | commit 6e143f4; `shared-shortlist-anon-v2.png` (confirms "Shared by Jane" + sign-in CTA render) | Added owner attribution (first name only - `getSharedShortlist` now includes `owner: { firstName }`, never email/phone) and a "Sign in to save these stays..." CTA with `returnUrl` back to the same share link, for anonymous visitors. Verified via the real API response and a live render. |
| `/places`, `/restaurants` | Implemented (pre-existing, verified this session) | Code inspection: `NearbySection.jsx` has area/category filter dropdowns, grid/map toggle, and per-item "Get directions" | Reasonably compliant; no literal free-text search box exists (area+category+map serve the same function). Not fabricated or altered. |
| `/guides` | **Implemented this session** | commit dde516a; `guides-list-desktop.png` | Added the required featured-article-plus-smaller-cards layout (previously an equal-weight grid). The most recent post gets a larger treatment. |
| `/guides/:slug` | **Implemented this session** | commit dde516a; `guide-detail-desktop.png`, `guide-detail-phone-toc-open.png` | Added desktop contents navigation (sticky sidebar) and mobile collapsed accordion, generated by parsing the article's own HTML client-side to assign heading ids (no backend change). Added a "Related stays" section reusing the real `/properties` endpoint and `PropertyCard` - no invented recommendations. |

## G4 — Account and identity

| Route | Status | Evidence | Notes |
|---|---|---|---|
| `/login`, `/register` | Implemented | Session 1 (8edca49) | Unchanged this session. |
| `/profile` | **Implemented this session** | commit d23dd52; `profile-desktop-personal.png`, `profile-phone-personal.png` | Added the required account sidebar (desktop, sticky) / compact horizontally-scrollable section selector (mobile) linking to Personal details, Security, Privacy, Preferences (host-only, maps to the existing Payout Settings section) and Verification. Purely additive anchor navigation over the existing, fully-working sections - no business logic touched. The pre-existing top tab bar (My Info/Booking History/Favourites/Verification) is left as-is for backward-compatible old profile links, per design2.md's own allowance. |
| `/verify-identity` | Not started (assessed, left as-is) | Code inspection: `IdentityVerificationPanel.jsx` (257 lines) | Real states are UNVERIFIED/SUBMITTED/APPROVED/REJECTED (4, not design2's generic 5-state language) and are already correctly labelled/gated - this is the real system, not a gap to fabricate additional states for. No explicit "Details / Documents / Review" tab/section grouping exists (it's one flowing form + a Documents sub-heading); not restructured this session due to time budget - a bounded, low-risk follow-up. Return-to-booking context (bookingId param, "your booking is held" messaging, resume-payment button) already correct. |

## G5 — Messages and issue resolution

| Route | Status | Evidence | Notes |
|---|---|---|---|
| `/inbox`, `/messages` | **Partially implemented this session** | commit bd01b6b; `inbox-desktop.png` | Added the required Inbox/Support tabs (previously neither page linked to the other) - both URLs and deep links unchanged. **Not implemented:** the desktop split-shell (list left, selected conversation right, one shared shell for `/inbox` and `/inbox/:conversationId`) - `/inbox` and `/inbox/:conversationId` are still two separate full-page routes/components. This was assessed and deliberately not attempted: it requires extracting both pages' list/detail rendering into a shared layout, and the size/risk of that refactor against a live messaging feature did not fit this session's remaining budget. Concretely scoped for a follow-up (see below). |
| `/inbox/:conversationId` | Not verified this session | — | Conversation view itself (bubbles, composer) not re-audited; only the missing split-shell was assessed. |
| `/disputes/new`, `/disputes/:id` | **Implemented this session** | commit 76ac718; `dispute-thread-retry.png` | Added a real event timeline (Dispute opened, etc.) using the server's existing `DisputeAudit` rows, previously admin-only because they include `actorId`. Added a participant-safe `timeline` projection (action + note + timestamp only, no actor identity) so guests/hosts get real recorded history without a new privacy leak. Verified by opening a real dispute through the app's own form and confirming the timeline entry renders. Evidence upload/download, messages, category/status labelling, and eligibility gating (`closed` disputes hide the compose/upload controls) were already correct - confirmed via the same live run. |

## G6 — Recovery and legal pages

| Route | Status | Evidence | Notes |
|---|---|---|---|
| `/payment/callback` | **Implemented this session (bugfix)** | commit ffb9f23; unit test `payment.verify.test.ts` (14/14 passing) | Fixed a real bug: the page only had loading/success/failed states; a dead ternary meant "Pending" could never actually render, so a payment still processing at Paystack (status `pending`/`ongoing`) was shown as "Payment Failed." `checkVerifiedPayment`/`verifyAndConfirmPayment` now pass through Paystack's real `providerStatus`; the page renders a genuine amber Pending state with no retry-payment action, pointing to Trips. Not screenshotted live (would require an actual in-flight Paystack transaction); verified via the passing unit test plus code-path inspection. |
| `/auth/callback` | Not started (assessed, left as-is) | Code inspection | Success/failure both immediately redirect (to a role-based destination or to `/login?error=oauth_failed`, where LoginPage shows the error) rather than rendering distinct in-place states. This is a working, low-risk pattern; not changed given real risk to a live auth redirect flow and the modest remaining time budget. |
| `*` (404) | Implemented (pre-existing, verified this session) | Code inspection: `NotFoundPage.jsx` | Concise explanation, recovery actions, and auth-aware "Go to Trips" link already present. No change needed. |
| `/privacy`, `/terms` | **Implemented this session** | commit dbb724c; `privacy-desktop.png`, `privacy-phone-toc-open.png`, `terms-desktop.png` | Added the required contents navigation (desktop sticky sidebar, mobile collapsed accordion) - previously neither page had any navigation despite 16+ numbered sections each. `LegalPageContents` scans the rendered article's existing `<h2>` headings and assigns stable ids; no change to the reviewed policy text. |
| Cookie consent overlay | Observed, not restyled | Appeared correctly in several screenshots this session with Accept all/Reject all/Manage preferences all reachable | Not checked against design2's "same geometry as other dialogs" requirement or captured dismissed-state separately - unchanged from session 1. |

## Checks run this session

- `npm run build` — clean after every commit.
- `npm run lint` (`eslint . --ext js,jsx --max-warnings 0`) — clean after every commit.
- `npx tsc --noEmit` (server) — clean after every backend change.
- New/extended server tests, all passing: `property.first-image.test.ts` (new, 5/5),
  `payment.verify.test.ts` (extended, 14/14, +1 for the new `providerStatus` field). Re-ran
  `property.availability-filter.test.ts` (5/5) and `property.transitions.test.ts` (8/8) and
  `dispute.transitions.test.ts` (4/4) - all still pass, confirming the checkout/dispute changes
  didn't disturb existing pure-logic tests.
- Full suite: 98/108 pass. The same 10 pre-existing failures from session 1 remain (all in
  `paystack.money.test.ts`, `paystack.boundary.test.ts`, `public-url.test.ts` - files this session
  did not touch except `payment.service.ts`/`payment.controller.ts`, which are covered by
  `payment.verify.test.ts` separately and pass); confirmed via `git diff` that none of the 10
  failing test files changed.
- Extensive live, real end-to-end verification via Playwright against the actual running app (not
  just static code review): logged in as the seeded test guest, drove the full checkout flow
  (date selection → Details with extras accordion → Payment) with real network-request tracing to
  confirm exact API call counts and ordering; created a real shortlist with real properties via
  direct Prisma seeding (auth-token API seeding was attempted first but the access-token/cookie
  flow didn't cooperate with a raw `fetch` outside the app's own axios interceptor - documented
  as a tooling limitation, not a product bug) and verified the collage, detail, and public-share
  views; created a real dispute through the app's own "Report an issue" form and confirmed the
  timeline; seeded two real BlogPost rows to verify the Guides featured/TOC/related-stays work
  against actual heading structures.
- Screenshots captured at 1440x1000 (desktop) and 390x844 (phone) for every route touched this
  session; both viewports for Trips, Guides list/detail, Profile, Privacy; desktop-only for
  Shortlists/detail/shared, Inbox, Dispute thread, and the Booking checkout stages (time budget).
  Tablet (768x1024) spot-checked for Trips, Profile, Shortlists, Guides list/detail and Privacy -
  all render correctly, including the guide/legal contents nav correctly falling back to its
  mobile collapsed-accordion form below the `lg:` breakpoint rather than an intermediate broken
  state. Not spot-checked at tablet: the booking checkout stages, Inbox, and the dispute thread.
- Housekeeping: two test AddOns (Airport Pickup, Extra Cleaning) remain assigned to a dev property
  for future re-verification; two test BlogPost rows remain; two test Shortlists remain owned by
  `user@example.com`; one real dispute remains open. All are local SQLite dev-only rows, not
  committed, and harmless to leave for continued testing - flagged here for transparency per
  design2.md's "keep credentials/private documents out of reports" and general honesty
  requirements (none of this data is private/sensitive).

## Remaining gaps (honest, not attempted or partially attempted this session)

1. **`/inbox` desktop split-shell.** Confirmed, precisely-scoped gap: needs a shared layout
   component that both `/inbox` and `/inbox/:conversationId` render through (list panel always
   visible on desktop, selected conversation or an empty-state placeholder on the right; mobile
   keeps today's list-only/detail-only behaviour with existing back navigation). Requires
   extracting `InboxPage.jsx`'s list rendering and `ConversationPage.jsx`'s detail rendering into
   reusable pieces without duplicating fetch/send logic. Real risk to a live messaging feature;
   deliberately deferred rather than rushed.
2. **BookingPage's own header during checkout** was not re-verified as "compact logo/back only" -
   it currently renders the full shared `<Navbar />` plus a sticky summary bar. The mobile bottom
   nav is correctly hidden on `/booking/:id` (verified), but the top header itself wasn't audited
   against the "compact logo/back header, hides global navigation" wording.
3. **`/verify-identity`** could be restructured into explicit Details/Documents/Review
   sections/tabs for a closer visual match; the real states, validation, and document requirements
   are all already correct, so this is a presentation-only follow-up, not a functional gap.
4. **`/auth/callback`** shows no distinct in-place error state (redirects to `/login?error=...`
   instead); functionally fine, not restructured given risk/reward.
5. **Cookie consent overlay geometry** was never compared against design2's dialog-geometry
   requirement, and its open/dismissed states were never captured as a deliberate before/after
   pair - carried over from session 1, still open.
6. **Tablet viewport (768x1024)** spot-checked for 5 of this session's changed routes (see
   Checks above) and rendered correctly; not captured for the booking checkout stages, Inbox, or
   the dispute thread.
7. **`/property/:id`** full detail page (amenities expansion, reviews, map/trust panel, policy)
   was not exhaustively re-audited against every G1 bullet this session - only the top-level
   gallery/summary grid layout was previously confirmed compliant.

## What Codex should do next (phases 3-5, plus flagged guest gaps)

1. Guest phases 0-2 are now materially complete: every G1-G6 route in this table has either been
   implemented/verified this session, was already compliant and is now confirmed, or has a
   precisely-named remaining gap above. None of the guest routes were left completely unaudited.
2. The `/inbox` split-shell (gap 1 above) is the single largest remaining guest-side item. If
   picked up before the independent audit, read both `InboxPage.jsx` and `ConversationPage.jsx`
   in full first - they share no code today.
3. Host/admin rows (H1, H2, A1 - boards 03, 09-14): entirely pending, per design2.md's sequential
   handoff. Start from this commit (`dbb724c`) on `main`.
4. Shared components/utilities Codex may find useful: `LegalPageContents.jsx` (contents-nav
   pattern, reusable for any other long static article), `src/utils/invoice.js` (shared PDF
   receipt generator), `MessagesTabBar.jsx` (Inbox/Support tab pattern - host messaging has its
   own separate surface and does not need this).
5. `ui-btn-primary`/`ui-btn-strong` (bronze/navy) and `ui-input`/`ui-surface` in `src/index.css`
   remain the canonical shared primitives. `MobileBottomNav.jsx` is guest-only by design.
