# ZuriLofts design 2: implementation and audit specification

Date: 9 September 2026. Baseline inspected: `62240f8`.

Status: approved direction for future implementation; this document does not mean the work is implemented. The user approved preserving the current colours and creating this separate specification, followed by implementation by Claude and Codex and a later independent audit.

## 1. Authority and intended result

Make the app match the preview boards' simpler composition, information hierarchy and journeys, using the existing bronze/navy action colours. Improve actual controls and workflows as well as appearance.

- Leave `DESIGN.md` unchanged. For this redesign, use this document for layout, behaviour, delivery and acceptance criteria; preserve the colour policy from `DESIGN.md` as restated below.
- The user's latest instructions take precedence. Earlier brain entries advocating blue primary buttons are superseded by the user's 9 September confirmation to preserve the former colours.
- Visual references: `C:/Users/Mega-Mind/Documents/ZuriLofts Design Preview/START-HERE.html`, the 16 PNG boards beside it, and `PAGE-INDEX.md`. Open the actual images before implementing their pages. These files remain outside the app repository.
- The boards provide composition and hierarchy, not exact product data or exhaustive specifications. Use the explicit requirements here to resolve ambiguous or inconsistent generated labels and navigation.
- Translate blue primary buttons in the boards to bronze. Keep blue links, selected controls and active indicators. Do not translate every blue pixel to bronze.
- Keep the existing ZuriLofts logo asset. The generated wordmarks are not approved replacements. Use real, appropriate property photography; the exact generated photos, names and avatars are not fidelity requirements.
- Preserve routes, authentication, permissions, API contracts and business rules. Cosmetic resemblance must not break live functionality or introduce invented facts.

## 2. Preserved colours and shared presentation

| Role | Required colour | Application |
|---|---|---|
| Primary action | `#C49A6C`, hover `#B8895C`, white text | Search, Continue, Pay, Save, Submit and other principal actions |
| Strong secondary action | `#0B0B45`, hover `#07072e`, white text | Existing strong secondary actions where emphasis is necessary |
| Ordinary secondary action | White, `#E5E7EB` border, `#222222` text | Back, Cancel, Edit, secondary navigation actions |
| Interactive blue | `#2563EB`, hover `#1D4ED8` | Links, active navigation/tabs, selected chips/radios/toggles, focus rings, informational UI |
| Brand accents | Navy `#0B0B45`, bronze `#C49A6C` | Existing logo, avatar accents, brand details and footer |
| Canvas / surface | `#F7F7F5` / `#FFFFFF` | Page canvas / cards, forms, navigation and dialogs |
| Border / text / muted | `#E5E7EB` / `#222222` / `#6b7280` | Dividers / primary content / metadata |
| Success / pending / danger | `#16A34A` / `#D97706` / `#DC2626` | Labelled statuses; existing red unread badges remain distinct |

Fidelity exceptions to the boards are deliberate: bronze primary actions, navy strong secondaries, the existing logo, real content, and behaviour required by existing product rules. These are not audit failures. Do not claim contrast compliance without measuring it; record any existing palette limitation rather than silently changing the approved colours.

Shared geometry and hierarchy:

- Inter with system fallback. Page titles 24px, desktop discovery heading 30-36px, card/section headings 16-20px, body 14-16px, metadata 12px. Form fields use at least 16px text on mobile. Avoid oversized promotional typography in task pages.
- Use a 4px spacing scale. Page gutters: 16px phone, 24px tablet, 32px desktop; guest content maximum width 1280px. Internal card padding 16-24px; normal section gaps 24-32px. Avoid large empty promotional gaps in primary journeys.
- Cards: white, 1px neutral border, 14px radius and subtle shadow. Inputs and regular buttons: 12px radius. Specify the actual radius; Tailwind 3's default `rounded-lg` is 8px, despite the 12px label in the old document.
- Reserve full pills for chips, statuses and avatars. Use restrained shadows, not floating nested search capsules, heavy auth shadows or translucent glass panels.
- Prefer one principal filled action in each decision area, neutral secondary actions and blue text links. Do not turn every secondary action navy.
- Reuse shared buttons, fields, cards, page headers, tabs, status badges, drawers and state components. Update the existing theme and `ui-btn-primary` together so all primary defaults use bronze. Verify component-library defaults rather than applying blanket colour replacement.
- Preserve readable status text: pending is distinct from confirmed. Colour alone is insufficient. Keep private and public information visually and functionally separated.

## 3. Baseline findings and implementation priorities

The initial audit rendered desktop home/search/login and mobile home. The backend was unavailable; populated protected pages were assessed from source, not visually certified. Recheck the latest checkout before editing; some work may already match.

| Priority | Finding at baseline | Required correction |
|---|---|---|
| P0 | Shared theme/helper primary buttons are blue while many pages and DESIGN.md use bronze | Make shared defaults consistently follow section 2; preserve all approved brand colours |
| P0 | Homepage dates/guests and category labels are display text | Real controls with persisted search state; no decorative controls presented as functional |
| P1 | Home has no discovery heading, uses horizontal rows/marquee and promotional masonry | Compact search-first composition with stable inventory grid and reduced decoration |
| P1 | Search has a stacked summary and separate capsule | One compact destination/date/guest/action composition |
| P1 | Property gallery precedes the booking columns | Gallery and booking summary alongside each other on desktop |
| P1 | Cards emphasise a bronze Book Now pill and omit compact capacity details | Make the card a clear property link with image, title, location, capacity and transparent price |
| P1 | Login/register use centred forms over a full-screen dark photo | Light split image/form layout |
| P1 | Four checkout screens are relabelled as three stages | Actually integrate optional extras inside Details |
| P1 | Preview mobile bottom navigation is absent | Role-aware mobile navigation with checkout exception |
| P2 | Profile and messaging structure differ from boards | Account sections; desktop conversation list beside active conversation |
| P2 | Host/admin include partially aligned structures | Preserve matching pieces; finish forms, calendars, drawers and operational grouping |

Editing only the unused default `Hero` export will not fix the homepage: `HomePage` is in `src/App.jsx` and imports the named `SearchBar` from `Hero.jsx`. Check references before deleting old hero, marquee or gallery code and styles.

## 4. Navigation and responsive shells

### Guest

- Desktop: compact white header with existing logo, Explore, Saved, Trips, Messages and Profile/account access. Public visitors retain discoverable destinations with sign-in prompts where required, rather than losing most navigation inside a hamburger at desktop width.
- Explore links directly to `/properties`. Its page-level navigation exposes Stays, Places, Restaurants and Guides. Avoid a duplicate hierarchy of decorative category controls on home.
- Saved groups `/favourites` and `/shortlists` with All saved / My lists tabs, including consistent active state on detail pages.
- Messages groups reservation inbox and support with Inbox / Support tabs. Keep existing URLs and deep links.
- Below 768px, show bottom navigation: Explore, Saved, Trips, Messages, Profile. Account for safe-area insets and reserve content padding so navigation never covers controls.
- Checkout uses a compact logo/back header and hides global navigation, including bottom tabs. Back retains entered details. Do not duplicate headers when composing shells.

### Host and admin

- Host primary navigation: Today, Calendar, Listings, Messages, Earnings. Payouts remains a direct route but is discoverable within Earnings via Overview / Payouts navigation, not a sixth primary item. This intentionally supersedes earlier notes retaining top-level Payouts.
- Host mobile navigation follows the same five destinations; account and switching remain reachable in a compact header/menu. Only show switches permitted by the real role model; ADMIN is not automatically a host.
- Admin light sidebar groups: Overview, Listings, Bookings, Payments, People, Content. Use expandable submenus and current-route indication. Map properties/calendar under Listings; earnings/payouts under Payments; users/applications/identity under People; disputes under Bookings; promos/add-ons/guides/feedback/messages under Content.
- Keep every existing route accessible. On small screens use a full-height navigation drawer with focus management; do not render the full sidebar beside cramped content.
- Preserve guest, host and admin access boundaries. A guest history page never inherits an admin shell.

## 5. Page family requirements

### G1. Discovery and property details (board 01)

- Homepage order: compact header; Find your place in Nairobi heading and short description; destination/dates/guests/Search; functional property-type chips and Filters/Show map access; stable three-column desktop property grid. Two columns on tablet and one on narrow phones. With available inventory at 1440x1000, the entire first card row should fit in the initial viewport when no consent overlay is open.
- Remove automatic property movement and the decorative masonry section from this primary discovery flow. Recently viewed and local exploration may follow the main inventory; avoid duplicating the same properties as filler. Keep the footer concise.
- Search opens working date and guest controls on desktop and accessible full-screen sheets on mobile. Categories must change results; expose only categories supported by real inventory. No display-only Add dates/Add guests controls.
- Persist destination, dates, guest count, filters and sort in the URL where appropriate; back/forward and reload must restore valid state. Preserve existing debounce, cancellation and keyboard behaviour for suggestions. Filter availability and capacity using supported data/API behaviour; do not pretend a text search validates availability.
- Use one shared search model on home and results. Map/list toggle retains criteria. Where a small API extension is required for real filtering or authoritative pricing, implement and test it without changing existing contracts; never simulate it with misleading labels.
- Cards use consistent photo crops, save action, title/location, guest/bed capacity where known, and compact price grouping. The card opens property details; remove the redundant Book Now pill. Favourite control is a separate accessible action with a 44px target. Unknown capacity, rating or fees must not be fabricated.
- Before dates: nightly rate. With dates: complete stay total only when an authoritative quote is available; otherwise clearly identify estimates or unavailable totals. Include duration and fee disclosure. Carry criteria into details and checkout. Never hardcode the board's example fees or claim all fees included without evidence.
- Desktop details: main gallery/content roughly two-thirds width; booking summary roughly one-third, aligned to gallery top and sticky below the header. Gallery: large primary image with supporting thumbnails and all-photos/lightbox access. Beneath it, concise identity, capacity, description, key amenities and expandable full amenities; keep reviews, map, trust information and policy accessible lower down.
- Mobile: gallery then title/details; compact price/action affordance opens booking controls without covering content. Dates, guests and total are reachable. Preserve cancellation policy and actual fee breakdown.

### G2. Booking, trips and history (boards 02 and 07)

- Exactly three user-facing stages: Stay (dates/guests/arrival), Details (guest information with optional extras accordion), Payment (method/verification/price review). Optional extras must not require a separate Continue screen.
- Desktop has main form and persistent property/date/guest/total summary. Mobile has a compact summary and reachable total/action with appropriate safe-area spacing. Avoid showing two full duplicate summaries.
- Preserve details across stage changes, auth/identity detours and payment recovery. Do not store sensitive identity documents or payment credentials in browser persistence. Reject unavailable dates with a clear recovery path.
- Preserve M-Pesa/card provider behaviour, server quote validation, cancellation/refund rules and verification gates. Confirmation comes from verified server state. Pending payment never offers another charge.
- Trips prioritises the next stay: image, status, dates, View check-in details, Message host, directions and receipt. Upcoming/Past tabs; history has Upcoming/Past/Cancelled with clear list rows. Keep review, cancellation and receipt actions tied to real eligibility.

### G3. Saved and local exploration (boards 04 and 05)

- Saved: shared section header/tabs, consistent image cards; shortlist collections use available-image collages with title/count. Empty collections have a deliberate placeholder, not a broken collage.
- Owned shortlist: editable title/description, concise property rows, notes, remove control and share panel with copy-link feedback. Public share: owner attribution allowed by the API, count, compact stays, clear sign-in CTA. Preserve token privacy and owner-only editing.
- Places/restaurants: compact page title, useful search/area/category controls, image-led cards and maps/directions. Guides: featured article plus smaller cards. Article: readable column, desktop contents navigation and related stays; collapse contents on mobile.
- Use supported datasets. Do not introduce mock restaurant ratings, fake recommendations or nonworking map controls.

### G4. Account and identity (boards 06 and 16)

- Login/register desktop: white header, photo panel beside a light form panel. Mobile prioritises the form and omits or reduces the photo. Preserve password visibility, Google auth, role/intent selection, validation, consent and redirect handling.
- Profile: account sidebar with Personal details, Security, Verification, Privacy and Preferences as applicable; mobile uses a compact section selector. Existing booking/favourite history remains reachable through Trips/Saved and compatible old profile links.
- Personal details form is concise; password change, data export, cookie preferences and account deletion have distinct sections and feedback. Payout preferences remain host-only. Keep existing server functionality, required fields and confirmations.
- Verification groups Details / Documents / Review while preserving every mandatory field and supported document requirement. Distinguish draft, submitted, under review, needs changes and verified according to real states; show return-to-booking context when applicable. No invented upload limits or review timelines.

### G5. Messages and issue resolution (boards 02 and 08)

- Desktop: list on the left, selected conversation on the right, property/booking context at the top, composer anchored within the conversation. `/inbox` and `/inbox/:conversationId` share the shell; mobile shows list or conversation with explicit back navigation.
- Inbox / Support tabs preserve `/inbox` and `/messages`. Keep host messaging in the host shell. Unread indicators, timestamps, loading, failed sends and retry feedback are clear; do not invent attachments/read receipts if unsupported.
- Issue creation: compact booking summary, category, description and existing supported evidence upload. Detail: labelled status, conversation/details navigation, evidence and a timeline based on real events. Preserve participant permissions and visibility.

### H1. Host overview, application and listings (boards 03 and 09)

- Today shows date, arrivals/departures/unread counts, compact arrival rows and one prioritised next-step card. Keep existing matching components; move secondary operational detail below the primary tasks. Images in decorative next-step cards are optional; never invent operational counts.
- Application: understandable Identity / Business / Documents / Review grouping, saved draft feedback and real review status; preserve all current validation and submission requirements.
- Listings: image rows with title/location/capacity, Published/Draft/In review status tabs and context-sensitive actions. Draft save, submit for review, approval, publication and suspension remain distinct.
- Listing editor: navigable Basics / Photos / Location / Amenities / Pricing / Review sections with draft save, inline errors and preview of entered content. Sections must actually navigate or reveal content; a progress decoration above an unchanged long form is insufficient.
- Photos clearly identify cover image and use existing supported upload/reorder actions. Host sees only owned resources and permitted publication controls. Draft preparation during review must obey server rules; no frontend-only bypass.

### H2. Calendar and money (board 10)

- Multi-property calendar: compact weekly rows, date navigation, property filter, readable reservation/blocked spans and legend. Single-property month view: selectable dates with an adjacent reservation/availability panel. Mobile uses a usable property/day view or explicit horizontal scrolling.
- Reserved dates are read-only in availability editing; link to the booking flow for reservation changes. Save changes only to unreserved dates with feedback.
- Earnings: three concise role-appropriate metrics, period selector, Overview / Properties / Insights / Breakdown / Reports. Keep existing useful charts/report functionality inside these tabs.
- Payouts: available and processing amounts, masked destination, request action and history. Never equate net earnings with available payout balance. Preserve M-Pesa/bank settings and lifecycle rules.

### A1. Admin operations (boards 03 and 11-14)

- Overview prioritises real work needing attention: approval, payment issue and dispute counts with a filterable operational queue. A booking-only table renamed Review queue does not satisfy a combined queue. Use existing authorised endpoints; any small necessary aggregation must preserve permissions and count semantics.
- Listings: status tabs, search/filter, compact table and detail/review drawer. Create/edit uses real navigable sections and preserves admin-specific moderation and host assignment. Calendar follows H2 with admin permissions.
- Bookings: search/status controls, compact rows, booking detail drawer and explicit cancellation review. Payouts: pending/processing/paid/failed views, destination/reference details and real lifecycle actions. Users: searchable list and edit drawer with separately confirmed destructive actions.
- Host and identity reviews: list/detail layout with documents, review notes and actual review transitions. Disputes: evidence, conversation and resolution panel. Feedback: visibly separate public comment/reply and internal feedback; prevent private content leakage.
- Promos, add-ons and guides: compact tables with create/edit drawers; retain current fields and validation. Support inbox uses conversation layout with relevant booking context. Do not expose speculative functions merely because they appear in generated text.
- All tables preserve meaningful fields through labelled mobile cards or intentional scrolling. No clipped actions, decorative filters, invented totals or status-only cosmetic rewrites.

### G6. Recovery and legal pages (boards 15 and 16)

- Payment/auth callbacks use focused status cards with one clear next action, saved context and distinct checking/success/pending/failure states. Display only the current state, not every board example together.
- 404 uses a concise explanation and recovery actions with optional existing local imagery. It must work for unmatched paths and respect authentication context.
- Privacy/terms use a readable article column and contents navigation; preserve reviewed policy text. Cookie/account controls retain genuine consent behaviour. Restyle consent overlays to the same geometry, keep all choices reachable on phones, and capture their open state separately during visual review.

## 6. Complete route coverage and ownership

The 54 routes below are the baseline coverage floor. Include any newly discovered registered routes in the delivery checklist. Preserve path parameters, aliases and nested index routes. Shared occurrences of `/booking/:id` and `/profile` refer to one route each.

| Board | Routes | Owner |
|---|---|---|
| 01 | `/`, `/properties`, `/property/:id` | Claude |
| 02 | `/booking/:id`, `/trips`, `/inbox/:conversationId` | Claude |
| 03 | `/host/today`, `/admin` | Codex |
| 04 | `/favourites`, `/shortlists`, `/shortlists/:id`, `/s/:token` | Claude |
| 05 | `/places`, `/restaurants`, `/guides`, `/guides/:slug` | Claude |
| 06 | `/login`, `/register`, `/profile`, `/verify-identity` | Claude |
| 07 | `/booking/:id`, `/bookings` | Claude |
| 08 | `/inbox`, `/messages`, `/disputes/new`, `/disputes/:id` | Claude |
| 09 | `/host/application`, `/host/listings`, `/host/properties/new`, `/host/properties/:id/edit` | Codex |
| 10 | `/host/calendar`, `/host/calendar/:id`, `/host/earnings`, `/host/payouts` | Codex |
| 11 | `/admin/properties`, `/admin/properties/new`, `/admin/properties/:id/edit`, `/admin/properties/:id/calendar` | Codex |
| 12 | `/admin/bookings`, `/admin/earnings`, `/admin/payouts`, `/admin/users` | Codex |
| 13 | `/admin/host-applications`, `/admin/identity-verifications`, `/admin/disputes`, `/admin/feedback` | Codex |
| 14 | `/admin/promos`, `/admin/addons`, `/admin/guides`, `/admin/messages` | Codex |
| 15 | `/payment/callback`, `/auth/callback`, `*` | Claude |
| 16 | `/privacy`, `/terms`, `/profile` | Claude |

## 7. Delivery order and edit boundaries

Run the two assignments sequentially: Claude completes and hands off first; Codex starts from that committed result. Do not run both prompts against the same working tree at the same time. Agent names identify assignments only; app code and components remain vendor-neutral.

| Phase | Owner | Work and completion gate |
|---|---|---|
| 0 | Claude | Recheck baseline, capture before screenshots, standardise section 2 primitives and shells; confirm preserved colours in rendered controls |
| 1 | Claude | G1 discovery/detail including real search state; demonstrate search -> property -> booking context |
| 2 | Claude | G2-G6 guest routes and responsive states; finish guest evidence and handoff |
| 3 | Codex | H1-H2 host routes and role-specific integration, preserving Claude's guest work |
| 4 | Codex | A1 admin routes and any required authorised data integration |
| 5 | Codex | Full-app regression and fidelity review; fix integration defects and produce consolidated audit evidence |

- Claude owns shared primitives, global CSS/theme, guest Navbar/mobile shell, home/router guest integration and all Claude route rows. Shared components must remain compatible with host/admin consumers. Set up extension points for role-specific navigation; do not redesign host/admin pages during this assignment.
- Codex owns host/admin route rows and shared host/admin page implementations (`AdminProperties`, `AdminPropertyForm`, `AdminCalendar`, `AdminEarnings`, `AdminDashboard`/`AdminLayout`, `HostLayout`). A file starting with Admin can also power a host route: verify both roles after changes.
- During the later assignment, Codex may update shared shells/router and guest components for demonstrated integration defects. Preserve guest layout contracts and recapture affected pages. Do not overwrite Claude's completed work with a competing interpretation.
- Either implementer may make narrowly necessary backend changes for their assigned working controls, with relevant tests. Do not add dependencies without asking, perform a platform rewrite, change payment providers or loosen permissions to reproduce a board.
- Read current files and git status before edits; preserve unrelated work. Follow project session/commit rules. Do not modify this specification or `DESIGN.md` to make an incomplete implementation appear compliant.
- If a missing API, credential, supported feature or asset prevents a criterion, record the precise blocker and continue independent work. A missing capability is not permission to show a fake success state or call the whole assignment complete.

## 8. Acceptance gates and evidence for the later audit

Use local/test accounts and data for guest, eligible host, pending host and admin. Never run real charges, payouts, account deletion or moderation changes against production merely to create screenshots. Keep credentials and private documents out of reports.

Create `docs/design2-implementation-status.md` during implementation. Claude creates it for the guest handoff; Codex extends it into the final report. Include one row per registered route with owner, board/requirement, implemented/partial/blocked status, tested role, tested states, screenshot paths, behavioural checks and remaining gaps. Do not pre-mark rows complete.

Required checks:

- Capture desktop 1440x1000, tablet 768x1024 and phone 390x844 for each distinct page template and each route's meaningful differences. Spot-check 360px and 1920px widths. All routes need an explicit visual-review entry, even when sharing a template; create/edit and host/admin variants need evidence of their different controls.
- Compare actual rendered app content against the relevant board panel, not the entire contact sheet or the preview gallery page. Use comparable viewport, scroll position and realistic content. Capture full pages as well as the initial viewport for long screens.
- Review composition, navigation, spacing, image crops, typography, card/field/button geometry, information hierarchy and action placement. Apply the intentional palette/logo/data exceptions in sections 1-2. Do not claim an invented percentage match to generated artwork.
- Capture populated screens. A loading spinner, login redirect or failed API screen cannot establish fidelity of a protected or populated page. Record environmental limitations honestly.
- Include empty, loading, error/retry, validation, disabled/submitting, selected and relevant success/pending states for each reusable pattern. Exercise drawers/accordions and mobile keyboard interactions. Capture consent open and dismissed separately without removing the consent feature.
- Verify no page-level horizontal overflow, obscured actions or duplicate shells. Intended calendar/table scrolling stays inside its container. All actions have 44px targets; focus is visible and returns after drawer closure; Escape and keyboard navigation work; respect reduced motion.
- Check home search dates/guests/category -> results -> details -> checkout, reload/back restoration, extras inside Details, auth/identity return, verified/pending payment recovery, trip actions, favourite/shortlist sharing, inbox/support and role-specific navigation.
- Check host draft/review/publication boundaries, reserved calendar dates, earnings versus available payouts, admin private/public feedback and data scope. Retain existing backend checks for payment, identity, disputes, privacy and role transitions; add targeted tests when these behaviours change.
- Run `npm run build` and appropriate lint checks; report pre-existing failures separately and introduce none. Run relevant server build/tests when backend contracts or business flows are touched. Build success alone is not visual acceptance.
- Store screenshot artifacts outside the repository by default, e.g. `C:/Users/Mega-Mind/Documents/ZuriLofts Design Audit/<phase>/`; link exact files in the report and give reproducible commands or manual steps. Record commit, environment, viewport and sample-data context. Never commit secrets or agent folders.

Completion means every assigned route has implemented requirements and evidence, or is explicitly marked partial/blocked with a concrete explanation. A delivery with blockers is a partial delivery. The later independent audit will use this specification, the original boards with intentional colour substitutions, the working app and the evidence report.

## 9. Ready-to-use assignments

1. Run [Claude's assignment](docs/design2-claude-prompt.md) first.
2. After its committed guest implementation and handoff, run [Codex's assignment](docs/design2-codex-prompt.md).
3. Ask for an independent audit against this document and the original boards. Implementation self-checks do not replace that audit.
