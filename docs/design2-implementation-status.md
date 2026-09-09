# design2.md implementation status

Owner of this report: Claude (phases 0-2, guest routes). Codex extends this table for phases 3-5
(host/admin rows). Do not mark a row done without evidence — see design2.md section 8.

**Baseline:** `62240f8`. **This session's HEAD:** `ceba88f`.
**Environment:** local dev, Windows 11, Vite dev server (`npm run dev`, port 5173) + Express/tsx
backend (port 3000) + SQLite dev DB with existing seed data (2 published properties). No
production data, payments, or moderation actions were exercised.
**Screenshots:** stored outside the repo at
`C:/Users/Mega-Mind/Documents/ZuriLofts Design Audit/phase0-1-guest/` (not committed).
**Commits this session:** a5bea88, 5a8ae5b, c68a5f0, 7649db1, c02dd41, 8edca49, ceba88f (all on `main`).

## How to read this table

- **Implemented** = changed this session, built/linted clean, and verified with a real
  screenshot and/or a passing test listed in Evidence.
- **Partial** = some acceptance criteria met, concrete gap named.
- **Not verified this session** = a prior session's brain/handoff notes indicate work was done
  here (see Notes), but I did not re-inspect or screenshot it against design2.md's specific
  criteria this session. Not the same as "implemented" — Codex or a follow-up session should
  verify before claiming fidelity.
- **Not started** = no design2.md-specific work done this session.

## Shared foundation (section 2, section 4 guest nav)

| Item | Status | Evidence | Notes |
|---|---|---|---|
| `ui-btn-primary` bronze (was blue) | Implemented | `src/index.css` commit a5bea88; build+lint clean | Added `ui-btn-strong` (navy) for the strong-secondary role. `ui-btn-secondary`/`ui-input`/status colours were already correct (blue reserved for links/selected/focus) — no blanket colour replacement needed. |
| `PropertyCard` — remove Book Now pill, capacity, 44px favourite target | Implemented | `src/components/PropertyCard.jsx` commit 5a8ae5b; `home-desktop-viewport.png`, `properties-desktop-viewport.png` | Favourite button now h-11 w-11 (44px). Bed/bath shown only when known. |
| Guest mobile bottom navigation (Explore/Saved/Trips/Messages/Profile) | Implemented | `src/components/MobileBottomNav.jsx` commit ceba88f; `home-phone-bottomnav.png`, `home-phone-footer-check.png` | Hidden on `/booking/:id`, `/admin*`, `/host*` (verified via a standalone logic check, not a live authenticated checkout screenshot — see Gaps). Body class + CSS reserve bottom padding per-route so it never covers content; verified content/footer render above it, not under it. No unread-count badges yet (Navbar's existing badge-polling logic wasn't duplicated here to avoid a second source of truth under time pressure). |
| Guest desktop nav (Explore/Saved/Trips/Messages/Profile grouping, Saved tabs, Messages tabs) | Not verified this session | — | `Navbar.jsx` already has Explore/Saved/Trips/Messages/profile-menu items and unread badges (pre-existing). I did not audit its Saved (All saved/My lists) or Messages (Inbox/Support) tab grouping against design2 section 4 this session. |
| Checkout hides global nav/bottom tabs, compact logo/back header | Partial | Path-matching logic verified (`/booking/:id` correctly excluded from bottom nav) | Did not verify BookingPage's own header is compact/logo-only — not inspected this session. |

## G1 — Discovery and property details (`/`, `/properties`, `/property/:id`)

| Route | Status | Evidence | Notes |
|---|---|---|---|
| `/` | Implemented | commits c02dd41, a5bea88, 5a8ae5b; `home-desktop-viewport.png`, `home-tablet-viewport.png`, `home-phone-viewport.png`, `home-phone-bottomnav.png` | Removed the auto-scrolling marquee and decorative masonry gallery. Added "Find your place in Nairobi" heading/description, real search bar (see below), functional property-type chips (real `type` filter, not invented categories), Filters/Show map links to `/properties`, stable 3/2/1-column grid with real loading/error/empty states. First card row fits the 1440x1000 initial viewport (screenshot confirms). Trimmed the oversized pre-footer promotional gap. Recently-viewed and local-guide sections (NearbySection) still follow the main grid, unchanged. |
| `/properties` | Implemented | commits c68a5f0, 7649db1; `properties-desktop-viewport.png`, `properties-desktop-dates-selected.png`, interactive Playwright run confirming `?checkIn=...&checkOut=...&guests=...` lands in the URL | Real "When" (date-range) and "Who" (guest count) controls replace the previous **display-only "Add dates"/"Add guests" text** (the literal P0 finding) — desktop popover, full-screen sheet on mobile (previously entirely absent below `sm`). Removed the redundant static Where/Dates/Guests summary strip that duplicated the working search bar. checkIn/checkOut/guests/search/type/beds/price/sort/neighborhood/minRating/available/amenities all persist in the URL (back/forward/reload restore state — pre-existing pattern for most of these, checkIn/checkOut/guests newly added following it). Server-side date-range availability filtering added (see below) — not a text-search guess. |
| `/property/:id` | Not verified this session (layout already appears compliant) | `property-detail-desktop-viewport.png` | `PropertyPage.jsx` already implements the required 2/3–1/3 desktop grid with a sticky booking-summary aside aligned to the gallery top (`lg:grid-cols-3`, `lg:col-span-2` + `lg:col-span-1`, `sticky top-24`) — this matches the design2 G1 requirement and pre-dates this session. I did not audit the full detail page (amenities expansion, reviews, map, policy) against every G1 bullet, and did not re-verify the card's "opens property details, no redundant Book Now" behaviour end-to-end beyond the screenshot. |

### Backend change (G1)

`GET /properties` now accepts `checkIn`/`checkOut` and excludes listings that fail the same
`isRangeAvailable` check the real booking flow validates against (calendar blocks + non-cancelled
bookings) — not a heuristic. Pagination is recomputed over the filtered set. A lone `checkIn` or
`checkOut` is ignored (`parseAvailabilityDateRange`, unit tested, 5/5 passing:
`server/tests/property.availability-filter.test.ts`). Pre-existing `property.transitions.test.ts`
(8/8) still passes. `npx tsc --noEmit` clean. This is the "small API extension" design2.md
permits for real filtering — no existing contract changed for callers that omit the new params.

## G2 — Booking, trips and history

| Route | Status | Notes |
|---|---|---|
| `/booking/:id` | **Confirmed gap, not fixed this session** | Read `BookingPage.jsx`: internal flow is still 4 screens (`step` 1-4); the visual "Stages" header groups steps 2 and 3 under a "Details" label, but add-ons remain **a separate screen the user must Continue through**, not an accordion inside Details. This is exactly the P1 finding in design2.md section 3 ("Four checkout screens are relabelled as three stages... Optional extras must not require a separate Continue screen") and it is **still open**. I deliberately did not attempt this refactor this session: it touches a live M-Pesa/card payment flow end-to-end (quote validation, add-on pricing, payment initiation) and a rushed change carries real risk of breaking checkout. Flagging precisely rather than attempting a shallow fix. |
| `/trips` | Not verified this session | Brain/handoff notes from a prior session claim a board 02-style redesign was applied to `TripHubPage.jsx` (438 lines, substantial existing content). Not re-inspected or screenshotted against design2 G2 criteria this session. |
| `/bookings` | Not verified this session | Same caveat — prior-session notes claim `BookingHistoryPage.jsx` was redesigned; not re-verified here. |

## G3 — Saved and local exploration

| Route | Status | Notes |
|---|---|---|
| `/favourites`, `/shortlists`, `/shortlists/:id`, `/s/:token` | Not verified this session | Prior-session brain notes claim `ShortlistsPage.jsx` received "modern list-page design tokens." Files exist with substantial content (216-317 lines each). Not re-inspected against design2 G3 acceptance criteria (All saved/My lists tabs, collage placeholders, share-panel copy-link feedback, owner-only editing) this session. |
| `/places`, `/restaurants` | Not started | Both files are 34 lines — thin wrappers, likely delegating to shared `NearbySection`/data. Not audited against G3's "compact page title, useful search/area/category controls, image-led cards and maps/directions" this session. |
| `/guides`, `/guides/:slug` | Not started | Not audited this session. |

## G4 — Account and identity

| Route | Status | Evidence | Notes |
|---|---|---|---|
| `/login` | Implemented | commit 8edca49; `login-desktop-viewport.png`, `login-phone-viewport.png` | Replaced the centred-form-over-full-screen-dark-photo pattern with a compact white header + light split layout (photo panel desktop-only, form-only on mobile). All existing behaviour untouched: password visibility toggle, Google OAuth link, validation, error display, returnUrl redirect. |
| `/register` | Implemented | commit 8edca49 | Same split-layout treatment applied, preserving the traveler/host mode toggle, avatar upload, consent, the host "why host with us" selling-points panel and its Airbnb cost-comparison table, and all existing validation/submission logic (only the outer wrapper markup changed — no logic touched). Not screenshotted in guest/traveler mode this session (only `?role=HOST` was captured); traveler mode uses the identical shell so risk is low, but it is unverified. |
| `/profile` | Not started | `ProfilePage.jsx` is 1108 lines — not audited against the G4 account-sidebar/section requirements this session. |
| `/verify-identity` | Not started | `IdentityVerificationPage.jsx` is only 81 lines (likely delegates to a panel component seen earlier, `IdentityVerificationPanel`); not audited against the Details/Documents/Review grouping requirement this session. |

## G5 — Messages and issue resolution

| Route | Status | Notes |
|---|---|---|
| `/inbox`, `/inbox/:conversationId`, `/messages`, `/disputes/new`, `/disputes/:id` | Not started | None of `InboxPage.jsx`, `ConversationPage.jsx`, `MessagesPage.jsx`, `DisputeThreadPage.jsx` were opened or audited against the G5 desktop list/conversation split, Inbox/Support tabs, or dispute evidence/timeline requirements this session. |

## G6 — Recovery and legal pages

| Route | Status | Notes |
|---|---|---|
| `/payment/callback`, `/auth/callback` | Not started | Not audited against the "focused status card, one clear next action, distinct checking/success/pending/failure states" requirement this session. |
| `*` (404) | Not started | `NotFoundPage.jsx` (47 lines) not audited. |
| `/privacy`, `/terms` | Not started | Not audited against the readable-column/contents-navigation requirement (both files are substantial: 364 and 530 lines, so likely already have real policy text — not re-verified). |
| Cookie consent overlay | Observed, not restyled | Appeared correctly in several screenshots (`properties-desktop-dates-selected.png`) with Accept all/Reject all/Manage preferences all reachable. Not checked against design2's "same geometry as other dialogs" requirement or captured dismissed-state separately. |

## Checks run this session

- `npm run build` — clean, no new warnings, after every commit in this session.
- `npm run lint` (`eslint . --ext js,jsx --max-warnings 0`) — clean after every commit.
- `npx tsc --noEmit` (server) — clean.
- Server tests: `property.availability-filter.test.ts` (new, 5/5), `property.transitions.test.ts`
  (pre-existing, 8/8) both pass. Full suite run: 92/102 pass; the 10 failures are in
  `paystack.money.test.ts`, `paystack.boundary.test.ts`, `public-url.test.ts` — files untouched
  this session (confirmed via `git log` on those paths) and unrelated to properties/search/auth
  layout; almost certainly pre-existing/environment-dependent failures, not introduced here.
  **Not independently confirmed against a pre-session baseline run** — flagging rather than
  asserting.
- Real Playwright-driven screenshots (desktop 1440x1000, tablet 768x1024, phone 390x844) for `/`
  and `/properties`; desktop+phone for `/login`, `/register?role=HOST`, `/property/:id`. An
  interactive script also drove the new date-range calendar and guest stepper end-to-end and
  confirmed the resulting URL (`?checkIn=2026-09-11&checkOut=2026-09-14&guests=3`), console-error
  logged (only pre-existing 401s for anonymous favourites checks and a pre-existing
  `defaultProps` deprecation warning — neither introduced this session).
- Backend and frontend dev servers were both exercised live (not just built) for every screenshot.

## What Codex should do next (phases 3-5, plus flagged guest gaps)

1. **Confirmed, precisely-located gap in my own scope:** `/booking/:id`'s add-ons step is still a
   separate screen, not an accordion inside "Details" (see G2 above). This is explicitly a Claude
   route; if picked up before the independent audit, it needs care around the live payment flow
   (M-Pesa/card quote validation, add-on pricing) — read the full `BookingPage.jsx` state machine
   first.
2. **Unverified guest routes** (G2 trips/history, G3 saved/exploration, G4 profile/verification,
   G5 messages/disputes, G6 legal/recovery) were not touched or re-audited this session. Prior-
   session brain notes claim some received earlier redesign passes — don't assume design2.md
   compliance from that; verify against this document's criteria with real screenshots before
   building on them.
3. **Host/admin rows** (H1, H2, A1 — boards 03, 09-14): entirely pending, per design2.md's
   sequential handoff. Start from this commit (`ceba88f`) on `main`.
4. Shared components Codex may need: `ui-btn-primary`/`ui-btn-strong` (bronze/navy) and
   `ui-input`/`ui-surface` in `src/index.css` are the canonical primitives; `MobileBottomNav.jsx`
   is guest-only by design (hidden under `/host*`/`/admin*`) — host/admin need their own
   equivalent per design2.md section 4, not a shared component.
5. Desktop guest nav (Navbar.jsx Saved/Messages tab grouping) was not audited — worth a pass
   before the independent audit if time allows, since section 4 calls it out explicitly.
