# ZuriLofts - Airbnb-Inspired Implementation Plan

A concrete, phased roadmap for building a premium short-let experience informed
by the usability principles of leading travel products, expressed exclusively
through ZuriLofts' own visual language and tailored to the Kenyan market.

---

## Zuri Design Language

### Core Palette

| Role               | Token        | Hex       | Usage |
|--------------------|--------------|-----------|-------|
| Authority/Depth    | Dark Navy    | `#0B0B45` | Headings, navbar, admin sidebar, footer, hero overlays, icon strokes |
| Action/Warmth      | Warm Bronze  | `#C49A6C` | CTAs, icons, highlights, active nav states, star ratings, focus rings |
| Surface Structure  | Silver Grey  | `#D9D9D9` | Borders, dividers, disabled states, card strokes |
| Body Text          | Charcoal     | `#1f2937` | Paragraphs, list items, body copy |
| Muted/Secondary    | Cool Grey    | `#6b7280` | Labels, captions, secondary info, empty states |
| Canvas             | White/Cream  | `#ffffff`, `#fafaf9` | Page backgrounds, card surfaces |

### Component Patterns We Own

- **Neumorphic cards** (`.neu-card`, `.neu-card-hover`) - soft raised surfaces with
  layered `box-shadow` on white backgrounds. Not flat Material Design; not heavy
  drop-shadow elevation. Subtle inner highlight + outer shadow creates depth.
- **Pill CTAs** - `rounded-full` bronze-on-navy (`bg-[#C49A6C] text-white`) for
  primary actions; navy-on-white for secondary. Never square-cornered buttons.
- **Bronze as the sole action colour** - never used as a large background fill.
  Reserved for interactive elements: buttons, icons, rating stars, active states,
  focus rings, hover underlines.
- **Navy as the authority colour** - headings, navigation, footer backgrounds,
  hero image overlays. Always paired with white or cream text for readability.
- **Group-hover coordinated reveals** - image zoom + overlay fade + floating
  action button on `PropertyCard`. Established pattern; extend consistently.
- **IntersectionObserver counters** - scroll-triggered, eased number animations
  on the landing page stats section.
- **Staggered responsive grids** - `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
  with `gap-6`. Cards breathe; never crammed.
- **Admin full-bleed layout** - no `max-w-7xl` wrapper; sidebar + content area
  fills viewport. Client pages use standard `max-w-7xl` centred container.

### Typography & Spacing

- Font: Inter, `system-ui` fallback
- Headings: `font-bold`, navy, `text-2xl`→`text-4xl`, `leading-tight`
- Body: `text-base` (16px), charcoal, `leading-relaxed`
- Section vertical rhythm: `py-10` mobile, `py-16` desktop
- Card padding: `p-5` mobile, `p-6` desktop
- Border radius: cards `rounded-2xl`, inputs/thumbnails `rounded-xl`, pills `rounded-full`

### Patterns We Explicitly Avoid

These are deliberate anti-copying decisions - not gaps, but identity choices:

| Airbnb Pattern              | ZuriLofts Alternative |
|-----------------------------|-----------------------|
| Red/coral accent (`#FF5A5F`) | Warm bronze (`#C49A6C`) - premium, African-inspired, calm |
| "Superhost" badge           | No invented verification tiers. Display only `rating` + `reviewCount` from real guest data. "New" for unrated properties. |
| Horizontal icon-scroll category bar | No icon strip of property types. Filters live in a sidebar or top-bar dropdown using the existing `Dropdown` component. |
| "AirCover" / invented guarantees | No invented protections. Show only factual "Secure booking via Paystack" with the shield icon. |
| Split-stay / multi-destination | Not planned. Single-property booking keeps the flow simple and the data model clean. |
| "Experiences" UGC marketplace | Phase 6 "Local Add-ons" is concierge-curated only - no user-generated listings, no host-submitted experiences. |
| Social wishlist features | Phase 4 shortlists are named, link-shareable collections. No following, liking, commenting, or social graph. |
| Dynamic pricing / "Smart Pricing" | Not planned. Hosts set fixed prices + optional bed-variant pricing (price1Bed, price2Bed). |
| Identity verification badges | No government-ID verification system. Trust is built through reviews and Paystack's payment security. |
| Map-centric search UI | Search is list+filter-first. Map view is a future stretch goal, not a Phase 1 priority. |

---

## Current Capabilities (Reusable)

These are implemented, tested, and ready to compose into new phases without refactoring:

| Capability                      | Location                                  | How to Reuse |
|---------------------------------|-------------------------------------------|--------------|
| Property list + pagination      | `GET /api/properties`                     | Add `location`, `type`, `ratingMin`, `sort` query params; no schema change |
| Property detail                 | `GET /api/properties/:id`                 | Rich fieldset: title, location, rating, reviews, bedrooms, bathrooms, area, type, description, images[], amenities[], nearby[], price, price1Bed, price2Bed, bathrooms1Bed, bathrooms2Bed |
| Bed-variant routing             | `?variant=1bed\|2bed` on `/property/:id` | Fully functional; `PropertyPage` computes displayPrice/displayBedrooms/displayBathrooms from variant |
| Image upload + sharp optimise   | `POST /api/upload` (multer + sharp)       | Reuse for host photo management, add-on images |
| Auth stack (JWT + Google OAuth) | `server/src/middleware/auth.ts`           | `authenticate`, `requireHost`, `requireAdmin` middleware chain |
| Booking flow + Paystack         | `server/src/controllers/booking.controller.ts` | Create, confirm, webhook, cancel - extend for add-ons line items |
| Favourites                      | `server/src/routes/favorite.routes.ts`    | Pattern to follow for shortlists; same user-scoped CRUD shape |
| Admin dashboard shell           | `src/pages/AdminDashboard.jsx`            | Collapsible sidebar, Outlet-based routing, role-gated - reuse for host workspace |
| Neumorphic CSS                  | `src/index.css` (`.neu-card` etc.)        | No changes needed; all new components use existing classes |
| Dropdown component              | `src/components/Dropdown.jsx`             | All filter/sort controls use this instead of native `<select>` |
| Spinner + loading states        | `src/components/Spinner.jsx`              | Consistent loading UX across all async pages |
| NearbySection component         | `src/components/NearbySection.jsx`        | Reuse on property page, trip hub, and booking confirmation |

---

## Route-Boundary Bug (Documented, Not Yet Fixed)

### What It Is

The backend has two namespaced route groups with misaligned role guards:

```
/api/properties/*     → requireHost (allows HOST + ADMIN)
/api/admin/*          → requireAdmin (allows ADMIN only)
```

### Three Specific Defects

**1. `GET /api/properties/mine` lacks role guard**

```typescript
// server/src/routes/property.routes.ts (approximate)
router.get('/mine', authenticate, propertyController.listMine);
```

This endpoint is guarded only by `authenticate`. Any logged-in user - even one
with the USER role - can hit it. They receive an empty array (200), not a 403.
The correct behaviour is a 403 Forbidden because non-host users have no
properties to list.

**Fix**: Add `requireHost` middleware to the route.

**2. No admin property CRUD under `/api/admin`**

Admins manage properties by hitting `/api/properties` (host-namespaced routes).
This works because `requireHost` passes ADMIN, but the route prefix implies
host-only scope. An admin looking for property management under `/api/admin`
won't find it.

**Fix**: Add `GET/POST/PATCH/DELETE /api/admin/properties` that delegates to the
same controller logic but lives in the admin namespace.

**3. No cross-host listing filter**

`listMine` scopes to `req.user.sub` (the authenticated user's ID). An admin
who wants to see all properties belonging to a specific host has no `hostId`
query parameter on `/api/properties/mine`.

**Fix**: Add optional `?hostId=` query param, allowed only when the requester
has the ADMIN role.

### Why Not Fix Now

The current behaviour is functionally correct for all real use cases:
- Hosts see only their properties (scoped by `req.user.sub`)
- Admins pass through `requireHost` and can manage any property
- Guests never hit property-management endpoints

Fixing it touches route registration, controller logic, and admin UI wiring -
scope for a dedicated commit block. Tracked here so no phase accidentally
depends on corrected behaviour that doesn't exist yet.

---

## Phase 1: Search, Discovery & Property Detail

Split into two sub-phases: 1A (Search & Discovery) and 1B (Property Detail &
Booking Confidence).

### Phase 1A: Search & Discovery

**Status**: ✅ IMPLEMENTED (2026-08-07)

**Credits**: TripSearchBar component by **Qwen/DeepSeek**. Integration into
`PropertiesPage`, editorial `PropertyCard` redesign, draft-vs-submitted search
state separation, and error/loading/empty state handling by **Claude CLI**.
Historical note: initial Qwen CLI endpoint failure blocked an earlier
AI-assisted pass; Claude CLI completed the fallback implementation the same day.

**User outcome**: A guest arrives on `/properties` and finds a relevant listing
by location, dates, guest count, and property type - with clear, complete
results and no dead ends.

#### Frontend

- [x] TripSearchBar on `/properties`: location text input that submits to
      `GET /properties?search=`. Typing updates a draft; submit commits to URL
      and fires the API call; clear resets both. No date or guest controls -
      backend lacks support (not fabricated).
- [x] Filter controls (using existing `Dropdown` component):
  - Property type: Apartment / Studio / Penthouse / All
  - Bedrooms: 1 / 2 (via bed-variant pills)
  - Price range: KES preset bands (under 5K, 5K–8K, above 8K)
- [x] Sort selector: Default, Price (low→high, high→low), Top Rated, Newest
- [x] Results grid of `PropertyCard` components: image, title, location, price,
      rating badge, bed-variant quick links (1-bed / 2-bed)
- [x] Empty state: friendly illustration + try adjusting filters message
      + "Clear all filters" button
- [x] URL-synced state: all filter/sort/search values in query params so
      searches are shareable and back-button-friendly
- [x] Redesigned `PropertyCard` with flatter editorial navy/gold/cream card and
      subtle motion (lighter than old neumorphic translate-y-2 + scale-110)
- [x] New `TripSearchBar` component - compact mobile-first search bar with
      location text input, submit button ("Find a stay"), and clear control.
      Draft state separated from submitted query so typing does not fire API
      calls. (Qwen/DeepSeek)
- [x] API error state with retry button
- [x] Active filter states (bronze-filled pills for active selection)
- [x] Result count with contextual messaging (e.g. "3 places in "Westlands"")
- [x] Preserved bed-variant expansion (1-bed / 2-bed listing variants)
- [x] Preserved Coming Soon placeholder cards on default unfiltered view

#### Backend

- [ ] Extend `GET /api/properties` query params:
  - `location` (string, case-insensitive LIKE)
  - `type` (enum: apartment | studio | penthouse)
  - `bedrooms` (number, exact match)
  - `ratingMin` (number, >= filter)
  - `priceMin` / `priceMax` (number, range filter)
  - `sort` (enum: price_asc | price_desc | rating | newest)
- [ ] `GET /api/properties/autocomplete?q=` - fuzzy location search returning
      distinct location strings (limit 10). Rate-limited to 30 req/min per IP.
- [ ] All params validated with express-validator or Joi; reject unknown params.

#### Data

- No schema changes. Property table already has `location`, `type`, `bedrooms`,
  `rating`, `price`, `price1Bed`, `price2Bed`, `createdAt`.
- Add database indexes on `location`, `type`, `bedrooms`, `rating` for query
  performance as the listing count grows.

#### Security & Authorization

- **Public endpoint** - no auth required. All search/filter params are
  read-only on published properties.
- **Injection**: Use parameterised queries (Prisma `where` clauses, never raw
  SQL string concatenation). Validate all enum params against allowed values.
- **Rate limiting**: Autocomplete endpoint capped at 30 req/min per IP.
  Full search at 60 req/min per IP.
- **Data exposure**: Only return `status: 'published'` properties. Never leak
  draft/unlisted properties through search.

#### Dependencies

- None. Builds on existing `PropertyCard`, `Dropdown`, `GET /api/properties`.

#### Acceptance Criteria

- [ ] Searching "Westlands" returns only properties whose `location` contains "Westlands"
- [ ] Filtering by type "Apartment" + rating 4.0+ returns correct subset
- [ ] Changing sort reorders results without full page reload
- [ ] URL reflects all current filter/sort/search state (`?location=Westlands&type=apartment&sort=rating`)
- [ ] Empty result set shows the empty state, not a blank page or error
- [ ] Autocomplete returns ≤10 suggestions; typing "Nai" suggests "Nairobi", "Naivasha" etc.
- [ ] `npm run build` passes

#### Verification

- Manual: Search location, apply each filter type, verify result count changes
- Manual: Copy URL with params, open in new tab, verify same results
- Manual: Clear all filters, verify full listing returns
- Automated: API tests for each query param and sort order
- Automated: Autocomplete returns correct distinct values

#### Logical Commits

```
feat: add location, type, bedrooms, ratingMin query params to GET /api/properties
feat: add sort param (price_asc, price_desc, rating, newest) to property list
feat: add location autocomplete endpoint with rate limiting
feat: add search bar, filter controls, and sort dropdown to /properties page
feat: add URL-synced filter/sort/search state on /properties
feat: add empty state for zero-result searches
```

---

### Phase 1B: Property Detail & Booking Confidence

**Status**: ✅ IMPLEMENTED (2026-08-07)

**User outcome**: A guest viewing a property sees a clear, trustworthy,
information-rich page that answers "what is this place like?" and "can I book
with confidence?" using only verified data the API actually supplies.

#### What Was Implemented

**PropertyPage.jsx (rewritten)**
- **Information hierarchy**: Title → location + rating → trust panel → gallery →
  quick facts → description → amenities → nearby → booking card. Each section
  is independently conditional - no rendering of empty `<section>` wrappers.
- **Safe data handling**: `safeArray()` helper guards against `null`/`undefined`
  arrays from the API. Description has a fallback string. Amenities and nearby
  sections only render when the array is non-empty. All-optional fallback:
  "Additional details about this property are being prepared."
- **Gallery**: Prev/next buttons hidden when only 1 image. Thumbnails as
  `<button>` elements with `aria-label`, `aria-current`, `role="listitem"`.
  Keyboard-navigable with `focus-visible:outline-*` rings. Callbacks are stable
  `useCallback` hooks defined above conditional early returns (Rules of Hooks).
- **Quick facts**: Bedrooms, bathrooms, area (sq ft), property type badge.
  Singular/plural labels ("1 Bedroom" vs "3 Bedrooms"). Type label from lookup
  map (apartment→Apartment, studio→Studio, penthouse→Penthouse).
- **Booking card**: Replaced inline markup with `<BookingSummaryCard>` component.
- **Removed unverified claims**: No "Best price guarantee", "Instant confirmation",
  or "24/7 customer support".
- **Accessibility**: Semantic landmarks (`<header>`, `<nav aria-label="Breadcrumb">`,
  `<section aria-labelledby>`, `<aside aria-label="Booking">`), `role="status"`
  on loading, `role="alert"` on error, `aria-label` on all icon-only buttons,
  `focus-visible:outline-*` on all interactive elements.
- **Cancellation safety**: `useEffect` cleanup flag prevents state updates on
  unmounted component.
- **Bed variant behaviour**: Preserved exactly - `?variant=1bed|2bed` controls
  bedrooms, bathrooms, price, and booking link.

**BookingSummaryCard.jsx (new)**
- Factual-only booking sidebar: nightly price (KES), bed-variant chip (when
  applicable), "Book Now" CTA, "You won't be charged yet", rating + review
  count, "Secure booking via Paystack" with shield icon.
- Null-safe `price.toLocaleString()` - guards against `undefined`/`null` price.
- `PropTypes` on all props with sensible `defaultProps`.
- Sticky positioning (`sticky top-24`) so the booking card follows scroll.
- No invented fees, cancellation terms, guarantees, or host response times.

**PropertyTrustPanel.jsx (new)**
- Three trust badges: Guest Rating (stars + review count), Property Type, Location.
- Uses only API fields: `rating`, `reviewCount`, `type`, `location`.
- Handles missing/unrated properties: displays "New · No reviews yet".
- Reusable component - can drop onto any property-facing page.
- `PropTypes` + `defaultProps` for all props.

#### Acceptance Criteria

- [x] Page renders all sections with API data; no crashes on missing arrays
- [x] No "Best price guarantee", "Instant confirmation", or "24/7 support" text
- [x] Gallery prev/next buttons have accessible labels; thumbnails are buttons
- [x] Bed variant (`?variant=1bed|2bed`) adjusts price, bedrooms, bathrooms
- [x] Mobile layout is readable at 375px viewport width
- [x] `npm run build` passes with no errors
- [x] `useCallback` hooks are above conditional returns (Rules of Hooks compliant)

#### Verification

- `npm run build` - ✅ passes
- Manual: visit `/property/:id` with a seeded property; all sections render
- Manual: visit with `?variant=1bed`; price/bedrooms change
- Manual: visit with `?variant=2bed`; 2-bed price/bedrooms/bathrooms shown
- Manual: keyboard-tab through gallery; focus rings visible; prev/next work
- Manual: 375px viewport; layout stacks vertically, no overflow

#### Files Changed

- `src/components/PropertyPage.jsx` - rewritten (Rules of Hooks fix applied)
- `src/components/BookingSummaryCard.jsx` - created (null-safety guard applied)
- `src/components/PropertyTrustPanel.jsx` - created
- `AIRBNB_INSPIRED_IMPLEMENTATION_PLAN.md` - this document

#### Logical Commits (Completed)

```
feat: add BookingSummaryCard - factual booking sidebar, no invented claims
feat: add PropertyTrustPanel - verified-facts confidence strip
refactor: rewrite PropertyPage - hierarchy, safety, a11y, remove unverified claims
fix: move useCallback above early returns in PropertyPage (Rules of Hooks)
fix: add null-safety guard for price.toLocaleString in BookingSummaryCard
docs: add Airbnb-inspired phased implementation plan
```

---

## Phase 2: Trip Hub

**Status**: NOT STARTED

**User outcome**: After booking, a guest has a single dashboard for their
upcoming and past stays - itinerary details, host contact, and rebooking.

### Frontend

- [ ] New `/trips` page with "Upcoming" and "Past" tabs (URL-driven:
      `/trips?tab=upcoming`, `/trips?tab=past`)
- [ ] Upcoming tab: property thumbnail, address, check-in date + countdown
      ("Checking in in 3 days"), booking reference, host name (from
      property.host join), Paystack reference
- [ ] Past tab: same layout + "Book again" CTA and "Leave a review" button
- [ ] Review button disabled with tooltip if guest already reviewed this booking
- [ ] Empty state: "Ready for your first stay?" → link to `/properties`
- [ ] Loading skeleton while bookings fetch

### Backend

- [ ] `GET /api/bookings` already returns user's bookings - reuse directly
- [ ] Add `include: { property: { include: { host: { select: { firstName, lastName, phone } } } } }`
      to the booking query so the frontend can show host contact info
- [ ] Add `GET /api/bookings/:id/review-status` - returns `{ reviewed: boolean }`
      so the UI knows whether the guest has already left a review for this stay
- [ ] Optional: `GET /api/bookings?status=upcoming|past` filter on the existing
      endpoint to avoid client-side filtering

### Data

- No schema changes. Booking already links to Property, Property links to User (host).
- Review existence check: `GET /api/reviews?propertyId=X&userId=Y` - reuse
  existing review endpoint.

### Security & Authorization

- `GET /api/bookings` scoped to `req.user.sub` - guest sees only own bookings.
- Host contact info: expose only `firstName`, `lastName`, `phone` - never email
  or password hash.
- Review status: only return the authenticated user's own review existence.
- Admin can view any user's trip hub via `?userId=` param (future admin feature).

### Dependencies

- Phase 1B (property detail, so "Book again" and "View details" links work).
- Existing booking and review controllers.

### Acceptance Criteria

- [ ] Upcoming bookings show accurate check-in countdown
- [ ] Past bookings show review status correctly
- [ ] Empty state renders for users with no bookings
- [ ] Host name and phone are visible on upcoming/past cards
- [ ] `npm run build` passes

### Verification

- Manual: log in as a user with bookings; verify upcoming/past tabs
- Manual: log in as a new user; verify empty state
- Manual: 375px viewport; verify tab layout and card readability
- Automated: API test for booking list with host include

### Logical Commits

```
feat: add /trips page with upcoming/past tabs and booking cards
feat: add host contact info to booking response
feat: add review-status check for past bookings
feat: add empty state and loading skeleton to trip hub
```

---

## Phase 3: Host "Today" Workspace

**Status**: NOT STARTED

**User outcome**: A host logs in and sees a focused, scannable dashboard for
today's operations - arrivals, departures, in-house guests, and quick actions.

### Frontend

- [ ] New `/host/today` page (sibling to existing host property management views)
- [ ] Three panels in card layout:
  - **Arrivals** (checking in today): guest name, booking ref, bed option,
    special requests, "Message guest" quick action
  - **Departures** (checking out today): guest name, booking ref, check-out time
  - **In-house** (currently staying): guest name, property name, days remaining
- [ ] Each panel: empty state when no matching bookings ("No check-ins today"
      with calm illustration)
- [ ] Quick actions: "View booking details" → booking detail page,
      "Message guest" → messaging thread (Phase 5)
- [ ] Loading skeleton per panel

### Backend

- [ ] `GET /api/bookings/host/today` - returns bookings scoped to the
      authenticated host's properties, filtered to today's date range.
      Uses `requireHost` middleware.
- [ ] Query logic:
  - Arrivals: `checkIn === today`
  - Departures: `checkOut === today`
  - In-house: `checkIn < today AND checkOut > today`
- [ ] Response grouped by category for easy frontend consumption:
      `{ arrivals: [...], departures: [...], inHouse: [...] }`

### Data

- No schema changes. Booking has `checkIn`, `checkOut`, `propertyId`.
- Join through `property.hostId === req.user.sub` for host scoping.

### Security & Authorization

- `requireHost` middleware on the endpoint.
- Host scoping at the query level: `WHERE property.hostId = req.user.sub`.
  Never send another host's bookings.
- Admin can also access (passes `requireHost`). Admin sees all hosts' today data
  if desired (future: `?hostId=` filter for admin).
- Guest PII: expose only `firstName`, `lastName`, `bookingRef`, `specialRequests`.
  Never expose guest email or phone to host (messaging goes through platform).

### Dependencies

- Phase 1B (property detail page for "view details" links).
- Phase 5 (messaging for "Message guest" quick action - can be a no-op link
  until Phase 5).

### Acceptance Criteria

- [ ] Host sees only bookings for their own properties
- [ ] Arrivals, departures, in-house are correctly segmented by date
- [ ] Empty state renders per panel when no activity
- [ ] `npm run build` passes

### Verification

- Manual: seed bookings with today's date; verify correct panel assignment
- Manual: seed bookings on another host's property; verify they don't appear
- Manual: empty database; verify all three empty states render
- Automated: API test with various date scenarios

### Logical Commits

```
feat: add GET /api/bookings/host/today with arrivals/departures/in-house grouping
feat: add /host/today page with three-panel dashboard layout
feat: add empty states and loading skeletons to host today panels
feat: add quick-action buttons (view details, message guest) to today cards
```

---

## Phase 4: Collaborative Shortlists

**Status**: NOT STARTED

**User outcome**: A group planning a trip can save properties to a named
shortlist, share a link, and coordinate choices without a group chat.

### Frontend

- [ ] "Save to shortlist" button on `PropertyCard` and `PropertyPage` (extends
      the existing favourites heart icon with a dropdown to pick which shortlist)
- [ ] `/shortlists` page: grid of user's shortlists with name, property count,
      last modified date. "Create new shortlist" card.
- [ ] `/shortlists/:id` page: property cards in the shortlist, each with a note
      field and remove button. Share button copies a link to clipboard.
- [ ] Shared view at `/s/:token` - read-only view of the shortlist. No auth
      required. Shows property cards with notes.
- [ ] Optional: upvote/downvote per property within a shared shortlist (stored
      in localStorage for anonymous viewers, server-side for authenticated).

### Backend

- [ ] New `Shortlist` model: `id`, `name`, `ownerId` (FK→User), `shareToken`
      (unique, unguessable), `createdAt`, `updatedAt`
- [ ] New `ShortlistItem` model: `id`, `shortlistId` (FK→Shortlist),
      `propertyId` (FK→Property), `addedBy` (FK→User), `note` (text, nullable),
      `createdAt`
- [ ] Routes:
  - `POST /api/shortlists` - create (auth'd)
  - `GET /api/shortlists` - list user's shortlists (auth'd, scoped to owner)
  - `GET /api/shortlists/:id` - get shortlist with items + property details (auth'd)
  - `PATCH /api/shortlists/:id` - rename (owner only)
  - `DELETE /api/shortlists/:id` - delete (owner only)
  - `GET /api/shortlists/shared/:token` - public read-only view
  - `POST /api/shortlists/:id/items` - add property (auth'd shortlist member)
  - `PATCH /api/shortlists/:id/items/:itemId` - update note (auth'd)
  - `DELETE /api/shortlists/:id/items/:itemId` - remove property (auth'd)

### Data

- Two new tables: `Shortlist`, `ShortlistItem`.
- Prisma migration required.
- `shareToken` uses `crypto.randomUUID()` for unguessability.
- Index on `shareToken` for fast shared-view lookups.

### Security & Authorization

- **Owner-only mutations**: Create, rename, delete shortlist restricted to
  `ownerId === req.user.sub`.
- **Shared view**: No auth required. Token is the only access control. Tokens
  must be unguessable (UUID v4).
- **Item additions**: Only the shortlist owner can add/remove items initially.
  Future: invite collaborators via email (out of scope for Phase 4).
- **No data leakage**: `GET /api/shortlists` returns only the authenticated
  user's own shortlists. Never list other users' shortlists.

### Dependencies

- Phase 1B (property detail for "save" button anchor).
- Existing favourites system - can share UI patterns and heart-icon conventions.

### Acceptance Criteria

- [ ] User can create, name, and populate a shortlist
- [ ] Share link shows the shortlist without authentication
- [ ] Owner can remove items; shared-link viewers cannot
- [ ] Shortlists survive page refresh and re-login
- [ ] `npm run build` passes

### Verification

- Manual: create shortlist, add 3 properties, share link, open in incognito
- Manual: verify incognito view is read-only (no add/remove buttons)
- Manual: delete shortlist, verify it's gone from `/shortlists`
- Automated: API tests for CRUD + shared view auth bypass

### Logical Commits

```
feat: add Shortlist and ShortlistItem Prisma models + migration
feat: add POST/GET/DELETE /api/shortlists CRUD endpoints
feat: add GET /api/shortlists/shared/:token public read-only endpoint
feat: add POST/DELETE /api/shortlists/:id/items for property management
feat: add /shortlists page with create, list, and delete
feat: add /shortlists/:id detail page with property cards and notes
feat: add /s/:token shared read-only shortlist view
feat: add "Save to shortlist" button on PropertyCard and PropertyPage
```

---

## Phase 5: Reservation Messaging

**Status**: NOT STARTED

**User outcome**: After booking, guest and host can message each other about
check-in details, special requests, or questions - all within ZuriLofts, no
phone-number sharing required.

### Frontend

- [ ] Inbox page at `/messages`: conversation list with last message preview,
      timestamp, unread badge (bronze dot), sender name
- [ ] Conversation thread at `/messages/:conversationId`: message bubbles
      (sent vs received styling), timestamps, sender label. Auto-scroll to
      bottom on load and on new message.
- [ ] "Message host" button on booking detail, trip hub, and host today panels
- [ ] Navbar notification badge: unread message count (polled every 30s)
- [ ] Polling-based refresh: `setInterval` fetching unread count. WebSocket is
      a future optimisation, not Phase 5.
- [ ] Empty state: "No messages yet" when inbox is empty

### Backend

- [ ] New `Conversation` model: `id`, `bookingId` (FK→Booking, unique - one
      conversation per booking), `createdAt`, `updatedAt`
- [ ] New `ConversationMessage` model: `id`, `conversationId` (FK→Conversation),
      `senderId` (FK→User), `content` (text), `read` (boolean, default false),
      `createdAt`
- [ ] Routes:
  - `POST /api/conversations` - create conversation for a booking (auth'd,
        must be booking guest or booking's property host)
  - `GET /api/conversations` - list user's conversations (auth'd, scoped to
        user as guest or host)
  - `GET /api/conversations/:id/messages` - get thread messages (auth'd,
        must be conversation participant)
  - `POST /api/conversations/:id/messages` - send message (auth'd participant)
  - `PATCH /api/conversations/:id/read` - mark all messages as read (auth'd)
  - `GET /api/conversations/unread-count` - unread count for navbar badge

### Data

- Two new tables: `Conversation`, `ConversationMessage`.
- Prisma migration required.
- One conversation per booking (unique constraint on `bookingId`).
- Index on `(conversationId, createdAt)` for fast thread retrieval.

### Security & Authorization

- **Participant-only access**: Conversation visible only to the booking's guest
  and the property's host. Verified at the query level:
  `WHERE booking.guestId = req.user.sub OR booking.property.hostId = req.user.sub`.
- **Admin override**: Admin can view any conversation for support (existing
  pattern from admin messaging).
- **No cross-booking leakage**: Message queries always join through booking to
  verify participation.
- **Content sanitisation**: Strip HTML tags from message content before storage.

### Dependencies

- Phase 2 (trip hub for "message host" entry point).
- Phase 3 (host today for host-side messaging entry point).
- Existing admin messaging system - reuse admin reply patterns.

### Acceptance Criteria

- [ ] Guest can message the host of a confirmed booking
- [ ] Host can reply; both see the full thread
- [ ] Unread count badge updates in navbar
- [ ] Messages persist and survive page navigation
- [ ] Non-participant cannot access a conversation (403)
- [ ] `npm run build` passes

### Verification

- Manual: book a property as guest; send message; log in as host; verify receipt
- Manual: host replies; log back in as guest; verify thread is complete
- Manual: try accessing another booking's conversation; verify 403
- Automated: API tests for participant scoping and auth rejection

### Logical Commits

```
feat: add Conversation and ConversationMessage Prisma models + migration
feat: add POST /api/conversations - create conversation for a booking
feat: add GET /api/conversations - list user's conversations
feat: add GET/POST /api/conversations/:id/messages - thread read/write
feat: add GET /api/conversations/unread-count - navbar badge endpoint
feat: add /messages inbox page with conversation list
feat: add /messages/:conversationId thread page with message bubbles
feat: add "Message host" buttons on trip hub and host today
feat: add navbar unread-message badge with polling
```

---

## Phase 6: Local Add-ons

**Status**: NOT STARTED

**User outcome**: A guest booking a stay can browse and request local services
(airport pickup, private chef, daily housekeeping) curated by ZuriLofts - all
priced transparently and added as line items to the booking.

### Frontend

- [ ] Add-ons section on `PropertyPage`: "Enhance your stay" heading with 2–4
      curated service cards per property. Each card: icon, name, description,
      price (KES), "Add" checkbox.
- [ ] Add-ons selection during booking flow: list of selected add-ons with
      quantity controls and subtotals
- [ ] Booking confirmation/summary shows selected add-ons as line items with
      individual prices + total
- [ ] Admin add-ons management: CRUD table in `AdminDashboard` for managing the
      add-ons catalogue and assigning add-ons to properties

### Backend

- [ ] New `AddOn` model: `id`, `name`, `description`, `price` (KES, number),
      `image` (URL, optional), `category` (enum: transport | catering |
      housekeeping | concierge), `active` (boolean)
- [ ] New `PropertyAddOn` join model: `id`, `propertyId` (FK→Property),
      `addOnId` (FK→AddOn)
- [ ] New `BookingAddOn` model: `id`, `bookingId` (FK→Booking), `addOnId`
      (FK→AddOn), `quantity` (int), `unitPrice` (snapshot of add-on price at
      booking time)
- [ ] Routes:
  - `GET /api/properties/:id/addons` - public, returns add-ons available for
        this property
  - `GET /api/admin/addons` - admin: list all add-ons
  - `POST /api/admin/addons` - admin: create add-on
  - `PATCH /api/admin/addons/:id` - admin: update add-on
  - `DELETE /api/admin/addons/:id` - admin: delete add-on
  - `POST /api/admin/properties/:id/addons` - admin: assign add-on to property
  - `DELETE /api/admin/properties/:id/addons/:addOnId` - admin: unassign
  - `POST /api/bookings/:id/addons` - guest: add add-ons to a pending booking
  - `PATCH /api/bookings/:id/addons/:addOnId` - guest: update quantity
  - `DELETE /api/bookings/:id/addons/:addOnId` - guest: remove from booking

### Data

- Three new tables: `AddOn`, `PropertyAddOn`, `BookingAddOn`.
- Prisma migration required.
- `BookingAddOn.unitPrice` snapshots the add-on price at booking time so price
  changes don't affect existing bookings.
- Index on `PropertyAddOn(propertyId)` for fast property-add-on lookups.

### Security & Authorization

- **Public read**: Property add-ons are read-only public data.
- **Admin management**: Add-on CRUD and property assignment require
  `requireAdmin` middleware.
- **Guest booking add-ons**: Mutation only during active/pending booking flow.
  Must be the booking's guest (`booking.guestId === req.user.sub`).
- **Price integrity**: Server-side only - the frontend sends `addOnId` +
  `quantity`; the server looks up the current price. Never trust client-side
  price values.
- **No host-submitted add-ons**: Add-ons are curated by ZuriLofts admin only.
  This is not a marketplace - it's a concierge service.

### Dependencies

- Phase 1B (property page for display of add-ons).
- Existing booking controller for line-item extension and total recalculation.
- Existing admin dashboard for add-on management CRUD.

### Acceptance Criteria

- [ ] Property page shows available add-ons for that property
- [ ] Add-ons selected during booking appear on confirmation with correct prices
- [ ] Booking total includes add-on costs
- [ ] Admin can create, edit, deactivate, and assign add-ons
- [ ] Deactivated add-ons don't appear on property pages
- [ ] `npm run build` passes

### Verification

- Manual: view a property; verify its add-ons render under "Enhance your stay"
- Manual: select add-ons during booking; verify confirmation line items
- Manual: admin creates new add-on, assigns to property; verify it appears
- Manual: admin deactivates add-on; verify it disappears from property page
- Automated: API tests for add-on CRUD, assignment, and booking line-item
  calculation

### Logical Commits

```
feat: add AddOn, PropertyAddOn, and BookingAddOn Prisma models + migration
feat: add admin CRUD endpoints for add-ons catalogue
feat: add property-add-on assignment endpoints (admin)
feat: add GET /api/properties/:id/addons public endpoint
feat: add booking add-on endpoints (guest: add, update qty, remove)
feat: add "Enhance your stay" add-ons section to PropertyPage
feat: add add-on selection and line items to booking flow
feat: add add-on management CRUD to admin dashboard
```

---

## Phase 7: Personalization

**Status**: NOT STARTED

**User outcome**: Returning guests see relevant recommendations based on their
booking history and saved properties - making ZuriLofts feel like it knows
their preferences without being invasive.

### Frontend

- [ ] "Because you stayed in [area]" recommendation row on home page
- [ ] "Similar properties" section at the bottom of `PropertyPage`
- [ ] Recently viewed properties (localStorage-based, no auth required) -
      horizontal scroll row on home page
- [ ] Personalised sort option in search: "Recommended for you" (weighted by
      past booking locations and property types)
- [ ] All recommendation rows: horizontally scrollable card strips with the
      same `PropertyCard` component. Max 6 items per row.

### Backend

- [ ] `GET /api/recommendations` - returns properties based on user's past
      bookings: same location (highest weight), similar price range, same type.
      Fallback to popular/highly-rated if user has no history.
- [ ] `GET /api/properties/:id/similar` - returns properties with same type
      and location, excluding the current property. Limit 4.
- [ ] `POST /api/analytics/view` - record property view for server-side
      personalisation (optional; privacy-first alternative is localStorage only).
      If implemented, requires opt-in consent.

### Data

- If server-side view tracking: new `PropertyView` model (`userId`, `propertyId`,
  `viewedAt`). Prisma migration required.
- If client-side only: no schema changes. `localStorage` key:
  `zurilofts_recently_viewed` - array of `{ id, title, image, viewedAt }`,
  max 12 entries, FIFO eviction.

### Security & Authorization

- **Recommendations**: Auth required. Scoped to the authenticated user's own
  booking history. Never leak another user's preferences.
- **View tracking**: Must be opt-in via a consent banner if server-side.
  LocalStorage approach avoids this entirely and is the recommended Phase 7
  implementation.
- **Similar properties**: Public endpoint - no auth needed. Based on property
  attributes only, not user data.

### Dependencies

- Phase 1 (search, for "Recommended for you" sort).
- Phase 2 (trip hub - past bookings data drives recommendations).
- Existing favourites system (can boost favourited property types).

### Acceptance Criteria

- [ ] Returning user sees location-based recommendations on home page
- [ ] "Similar properties" on detail page are contextually relevant
- [ ] Recently viewed persists across browser sessions (localStorage)
- [ ] New user sees popular/highly-rated fallback recommendations
- [ ] `npm run build` passes

### Verification

- Manual: create account, book a property in Westlands; verify Westlands
  properties appear in recommendations
- Manual: view 3 properties; verify recently viewed row on home page
- Manual: clear localStorage; verify fallback recommendations appear
- Automated: API tests for recommendation engine output

### Logical Commits

```
feat: add GET /api/recommendations based on booking history
feat: add GET /api/properties/:id/similar endpoint
feat: add recommendation rows to home page
feat: add "Similar properties" section to PropertyPage
feat: add recently viewed properties via localStorage
feat: add "Recommended for you" sort option to search
```

---

## Verification Strategy (Every Phase)

### Per-Phase Checklist

1. `npm run build` passes with **zero errors and zero warnings**.
2. Manual walkthrough of the happy path on mobile (375px) and desktop (1440px).
3. Manual walkthrough of the empty/null/error state for every async data source.
4. Keyboard navigation check: all interactive elements reachable via Tab, focus
   ring visible (`focus-visible:outline-*`).
5. No new dependencies added to `package.json` unless explicitly scoped and
   approved in the phase plan.
6. No changes to `src/index.css` or `tailwind.config.js` unless explicitly
   scoped in the phase plan.

### Regression Guard

- **Existing pages must render without errors**: Home, Properties, Contact,
  Profile, Favourites, Booking, AdminDashboard, AdminBookings, AdminEarnings,
  AdminCalendar, AdminPromos, AdminPropertyForm, AdminPropertyEdit.
- **Bed-variant routing** (`?variant=1bed|2bed` on `/property/:id`) must
  continue to adjust price, bedrooms, and bathrooms exactly as before.
- **Auth flows** (login, register, Google OAuth, token refresh, logout) must be
  unaffected by any phase.
- **Paystack webhook** must continue to process payments - no changes to the
  webhook handler unless explicitly scoped.

---

## Commit Segmentation (Full Roadmap)

Each commit is one logical, atomic change. Phases are independent where
dependencies allow; no phase's commits block another phase's start.

```
# Phase 1B - IMPLEMENTED ✅
feat: add BookingSummaryCard - factual booking sidebar, no invented claims
feat: add PropertyTrustPanel - verified-facts confidence strip
refactor: rewrite PropertyPage - hierarchy, safety, a11y, remove unverified claims
fix: move useCallback above early returns in PropertyPage (Rules of Hooks)
fix: add null-safety guard for price.toLocaleString in BookingSummaryCard
docs: add Airbnb-inspired phased implementation plan

# Phase 1A - IMPLEMENTED ✅ (2026-08-07)
# TripSearchBar by Qwen/DeepSeek; integration & PropertyCard redesign by Claude CLI
feat: add TripSearchBar - compact mobile-first search bar (Qwen/DeepSeek)
feat: add draft-vs-submitted search state - typing does not fire API calls
feat: add URL-synced filter/sort/search state on /properties
feat: add sort dropdown (default, price_asc, price_desc, rating, newest)
refactor: redesign PropertyCard - flatter editorial navy/gold/cream with subtle motion
feat: add API error state with retry on /properties
feat: add active filter states and contextual result count on /properties

# Phase 2 - Trip Hub
feat: add /trips page with upcoming/past tabs and booking cards
feat: add host contact info to booking response
feat: add review-status check for past bookings
feat: add empty state and loading skeleton to trip hub

# Phase 3 - Host Today Workspace
feat: add GET /api/bookings/host/today with arrivals/departures/in-house grouping
feat: add /host/today page with three-panel dashboard layout
feat: add empty states and loading skeletons to host today panels
feat: add quick-action buttons (view details, message guest) to today cards

# Phase 4 - Collaborative Shortlists
feat: add Shortlist and ShortlistItem Prisma models + migration
feat: add POST/GET/DELETE /api/shortlists CRUD endpoints
feat: add GET /api/shortlists/shared/:token public read-only endpoint
feat: add POST/DELETE /api/shortlists/:id/items for property management
feat: add /shortlists page with create, list, and delete
feat: add /shortlists/:id detail page with property cards and notes
feat: add /s/:token shared read-only shortlist view
feat: add "Save to shortlist" button on PropertyCard and PropertyPage

# Phase 5 - Reservation Messaging
feat: add Conversation and ConversationMessage Prisma models + migration
feat: add POST /api/conversations - create conversation for a booking
feat: add GET /api/conversations - list user's conversations
feat: add GET/POST /api/conversations/:id/messages - thread read/write
feat: add GET /api/conversations/unread-count - navbar badge endpoint
feat: add /messages inbox page with conversation list
feat: add /messages/:conversationId thread page with message bubbles
feat: add "Message host" buttons on trip hub and host today
feat: add navbar unread-message badge with polling

# Phase 6 - Local Add-ons
feat: add AddOn, PropertyAddOn, and BookingAddOn Prisma models + migration
feat: add admin CRUD endpoints for add-ons catalogue
feat: add property-add-on assignment endpoints (admin)
feat: add GET /api/properties/:id/addons public endpoint
feat: add booking add-on endpoints (guest: add, update qty, remove)
feat: add "Enhance your stay" add-ons section to PropertyPage
feat: add add-on selection and line items to booking flow
feat: add add-on management CRUD to admin dashboard

# Phase 7 - Personalization
feat: add GET /api/recommendations based on booking history
feat: add GET /api/properties/:id/similar endpoint
feat: add recommendation rows to home page
feat: add "Similar properties" section to PropertyPage
feat: add recently viewed properties via localStorage
feat: add "Recommended for you" sort option to search
```

---

## Notes

- **No calendar dates in this plan** - effort estimates depend on team capacity
  and availability. Phases are scoped by outcome, not by sprint.
- **Phases are parallelisable**: Phases 2–7 can begin independently once their
  listed dependencies are met. Phase 1A (search) and Phase 1B (detail) are the
  only foundational dependencies.
- **Mobile-first always**: Every phase tests at 375px viewport width first.
  Desktop is enhanced, not primary.
- **No AI-specific APIs**: All features use standard REST endpoints. Any
  developer can implement any phase without AI tooling dependencies.
- **Phase 1A complete**: TripSearchBar by Qwen/DeepSeek; integration, PropertyCard
  redesign, and state management by Claude CLI. Historical note: initial Qwen CLI
  endpoint failure blocked an earlier AI-assisted pass the same day; Claude CLI
  completed the fallback implementation.
