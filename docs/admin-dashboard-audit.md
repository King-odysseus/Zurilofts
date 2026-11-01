# Admin dashboard audit

Scope: the admin workspace at `/admin`. Design comparison against the Airbnb-style
reference in `docs/design-system-2026/`, plus a logic and coverage review of every page.

This audit was written first, then implemented. The findings below are kept as the record of
what was wrong; the section after this one says what has since been built.

## Implementation status

Done:

- **Shared kit.** `src/components/admin/` (header, metric card, panel, status badge, empty
  state, confirmation dialog, pagination) and `src/hooks/usePagedResource.js`.
- **Reservations page** at `/admin/bookings`, with confirm, cancel, refund resolution and
  stale-hold cleanup. It is in the sidebar.
- **Reviews moderation.** Hide, unhide and delete, with admin-only notes separated from the
  public comment. The nav item is now "Reviews".
- **Users and hosts.** Real server pagination, honest total, selection cleared on filter
  change, styled dialogs instead of `window.confirm`.
- **Listing approvals.** Server-driven queue, oldest first, with real platform status totals
  and a refetch after every decision.
- **Host applications.** Server-side search and paging.
- **Messages.** Marking a thread read now persists, via a new
  `PATCH /admin/messages/:userId/read` route.
- **Honest failure states.** The dashboard names a failed load instead of drawing a zero, and
  Governance and Trust and Safety disclose when their merged timelines are cut at 100 rows.
- **Route guard.** No hard-coded white flash, and access denied now offers a way back.
- **Landing statistics.** Saving them warns that they publish to the public page and asks first.
- **Revenue.** "Figures as of" timestamp and a CSV export of the recent rows.
- **Colour tokens.** `primary` and the scattered `#2563EB` fills now resolve to the brand navy.
- Design-tool attributes and duplicated page eyebrows removed.

Still open: platform settings, a real server-side audit log, team and access, the payments and
refunds ledger, the notifications composer, per-page exports beyond revenue, and the policy
questions at the end of this document.

## Summary

The admin area is built and functional, but it is drifting in three directions at once:
three different button systems, every page re-drawing its own header and cards, and no
reservations or money screen even though the API for both exists. The largest single
correctness risk is that two lists (users, listing approvals) show only the first page of
results with no way to reach the rest.

## What exists today

Fourteen pages under one shell:

| Page | Route |
| --- | --- |
| Dashboard / Overview | `/admin` |
| Revenue | `/admin/revenue` |
| Listing approvals | `/admin/properties` |
| Listing detail | `/admin/properties/:id` |
| Listing preview | `/admin/properties/:id/preview` |
| Users and Hosts | `/admin/users` |
| Host Applications | `/admin/host-applications` |
| Trust and Safety | `/admin/trust-safety` |
| Messages | `/admin/messages` |
| Governance | `/admin/governance` |
| Add-ons | `/admin/add-ons` |
| Guides | `/admin/guides` |
| Reviews (was Feedback) | `/admin/feedback` |
| Account settings | `/admin/settings` |

Routes that redirect away, so these screens no longer exist: `earnings`, `payouts`,
`promos`, `identity-verifications`, `disputes`, and `audit`, all from
`src/WorkspaceRoutes.jsx`. `bookings` has since been restored as the Reservations page.

The mobile bar carries 3 items plus a More sheet. The desktop rail has 4 groups, and no
item shows a count.

## Design: consistency before polish

### 1. Buttons: one system, verified

Corrected after checking the code. `src/theme/flowbiteTheme.js` already overrides every
Flowbite Button to a navy `#143A80` pill with a `#0B2A5E` hover, and `src/main.jsx` mounts
that theme at the root. The 63 Flowbite buttons in the admin files were therefore never
electric blue; they inherit the brand pill.

What was actually inconsistent, and is now fixed:

- The `primary` colour token resolved to `#2563EB` while its own comment said it should be
  the brand navy. It now resolves to `#143A80`, with `primary-hover` at `#0B2A5E`.
- 33 hard-coded `#2563EB` fills and 21 `#1D4ED8` hovers survived in components, so a CTA
  could still render a brighter blue than a themed one. All replaced with the brand pair.
- The uppercase `ZURILOFTS / ADMIN / SECTION` eyebrow is gone from all 14 pages, and every
  page now uses the shared header component instead of printing its own title block.

### 2. Every page repeats the shell's own header

The sticky header already names the section. Then 12 pages print
`ZURILOFTS / ADMIN / <page>` plus an `h1` plus a subtitle, giving 17 `h1` elements in
total. Two titles for one screen. Either keep the page title and delete the uppercase
eyebrow, or drop the title from the shell.

### 3. Cards are copy-pasted rather than shared

The same metric-card recipe is written out four times (Dashboard, Governance, Messages,
Revenue) and hand-rolled again inside Feedback, Listing approvals and Users. That is why
padding, label casing and number size already differ. The same applies to panels, list
rows and empty states.

### 4. The design reference is only half implemented

`docs/design-system-2026/admin-dashboard.html` specifies real badges, counts on nav items,
a mini chart, a sticky side rail, and card-sized empty states. The live dashboard has one
accordion for landing stats, a signups block, no nav counts, and no sticky rail. The mockup
is the specification; the build drifted from it.

### 5. Dark mode is half wired

Colours flip through tokens, but there are 25 one-off `dark:` overrides, 6 hard `bg-white`
surfaces (including the landing-stats accordion title), and the loading and access-denied
screens in the route guard are hard-coded white with a brass spinner. The result is light
bands in an otherwise dark screen and a bright flash on a dark load.

### 6. Tables and filters are inconsistent

Revenue has a styled table with money cells. Users hand-builds its own. The approval queue
and the review list are `div` rows. No page has sortable columns, a sticky header, a
result count footer, or pagination controls. Filters are a search box here and a select
there, with no shared clear or applied-filter behaviour.

### 7. Feedback, empty and error states vary

Most pages show plain "Loading..." text or a centred spinner; only Listing detail uses a
proper status panel. Empty states use two different paddings. Errors surface as an inline
paragraph, a red Flowbite alert, or not at all. There is no toast, so the same "saved"
confirmation appears in a different place on each page.

### 8. Destructive actions are inconsistent

Browser `window.confirm` is used in 4 places (add-on delete, guide delete, bulk suspend,
single suspend) and `alert()` in 1. Users has a good styled, typed-confirmation delete
dialog. One pattern should survive, and it is that one.

### 9. Mobile is thin

Row actions wrap onto their own line. The approval decision modal and the dispute modal
open full-width without a mobile action bar. The Messages inbox switches between list and
thread but keeps desktop spacing.

### 10. Leftovers and accessibility

- `data-openpencil-frame` attributes remain on 12 production files, including `TrustPage`
  outside the admin area. These are design-tool artefacts.
- The header search debounces at 250ms but has no Escape handling, no outside-click close,
  no arrow-key navigation, and declares `role="listbox"` without option roles.
- Access denied is a bare full-page screen with no link back into the product.
- Several icon-only buttons rely on `aria-hidden` icons with no accessible name.

## Logic: things that are actually wrong

### Users and Hosts (most serious)

- The page calls `/admin/users` with no `page` or `limit`. The controller defaults `limit`
  to 20, so the screen shows the first 20 accounts only.
- The response does include `pagination`, but the page discards it and reads only
  `data.data`.
- The headline metric "PEOPLE IN VIEW" reports the loaded array length with the subtitle
  "Matching the current filters", so it reads like a total. An admin with 4,000 accounts
  sees 20.
- There are no pagination controls anywhere on the page.
- Selection is cleared after a bulk action but not when the search or role filter changes,
  so you can suspend accounts that are no longer on screen.
- The edit form writes bank name, account number and bank code with no masking and no
  record of who changed them.
- `PUT /admin/users/:id/password` exists with no UI.
- `GET /admin/users/:id` exists and is unused by this page.

### Listing approvals

- Loads up to 100 listings once, then filters, counts and paginates in the browser. The
  101st listing can never be reviewed.
- The four metric cards count the loaded window, not the platform.
- Queue order is whatever the API returns, not oldest-first.
- Approve needs no note; reject does.
- After a decision the row is patched locally with no refetch, so two admins reviewing at
  once can overwrite each other.
- No bulk approve, no search, and the host name is not shown in the row.

### Listing detail

- The approve/reject flow is duplicated from the queue modal, so the two can drift apart.
- The reviewer cannot see earlier rejection reasons or any review history, only the
  current status.
- The host lookup failure is swallowed on purpose, but the page then shows no "host
  unavailable" hint.

### Dashboard

- Landing page statistics (star rating, satisfaction) are editable from the Overview page
  inside an accordion. That is a platform setting with no confirmation and no audit trail,
  sitting next to read-only metrics.
- The signups fetch and the landing-stats fetch both swallow errors with `.catch(() => null)`.
  A failed request renders an empty chart, which looks exactly like zero signups.

### Revenue

The strongest page: date range with inverted-range validation, held and unsettled money
called out, per-host and monthly breakdowns. Still missing an "as of" timestamp, a CSV
export, and any drill-through to the underlying bookings or payments.

### Governance

- The "audit trail" is assembled in the browser by merging four lists, each capped at 100
  rows. Anything beyond 100 of a type silently disappears, and paging pages the merged
  subset.
- There is no audit endpoint. `/admin/audit` redirects here, which implies a complete log
  that does not exist.
- It fires four 100-row requests on every visit.

### Trust and Safety, and Host Applications

- Both cap at 100 verifications or applications with no paging, so old cases fall off the
  queue.
- Both are otherwise well built: modals, reason capture, busy guards, document downloads.

### Messages

- Opening a thread zeroes the unread count in local state only (a `setConversations` map).
  There is no route that marks a thread read, so the next 30-second poll restores the
  badge. Reads look like they never happened.
- Polls every 30 seconds instead of using the existing chat channel.
- No unread filter, no conversation context (booking or listing), no internal notes or
  canned replies.

### Feedback

- The page is labelled feedback but lists property reviews, and it is read-only.
- The API already supports moderation: `PATCH /admin/reviews/:id` and
  `DELETE /admin/reviews/:id` both exist with no UI at all.
- No filters by rating, property, or hidden state.

### Add-ons

- Delete uses a browser confirm, then detaches the add-on from all properties and bookings
  with no undo and no record.
- Per-property assignment fires one request per property.

### Guides

- Delete uses a browser confirm. No draft preview, no scheduling, no revision history.

### Account settings

- Only your own profile, password and avatar. There is no platform settings page at all.

## Pages to create, in priority order

1. **Reservations.** The API is complete (list, status change, refund, edit, delete, stale
   hold cleanup) and there is no screen. Largest gap for a booking marketplace.
2. **Reviews and ratings moderation.** Turn Feedback into a real queue: hide, unhide,
   delete, reply, plus a rating distribution.
3. **Payments and refunds ledger.** One place to inspect a payment, its Paystack reference,
   fee, refund and dispute state. Needs a small list endpoint; only aggregates exist today.
4. **Platform settings.** Commission and fees, cancellation and stay rules, payout schedule,
   taxes, landing statistics (moved off the dashboard), message and notification templates.
5. **Team and access.** Who is an admin, invite and remove, role changes (the endpoint
   exists with no dedicated page), 2FA requirement, admin action audit.
6. **Audit log.** A real server-side activity feed with actor, entity, before and after.
   Replaces the synthesized Governance timeline.
7. **Property performance.** `/admin/analytics/properties` already returns data and has no
   view.
8. **Notifications and announcements.** `POST /admin/push/send` exists with no composer.
9. **Reports and exports.** CSV for revenue, users, bookings and payouts.
10. **Content pages.** Terms, privacy, FAQ and help, alongside Guides.
11. **System health.** Webhook deliveries, failed payments, failed payouts, stale holds.
    Optional at current scale.

## Components to build once and reuse

- `AdminPageHeader`: title, description, one primary action. Removes the eyebrow.
- `MetricCard`, `Panel`, `PanelToolbar`, `StatusBadge`, `EmptyState`, `SkeletonRow`.
- `DataTable`: sortable, sticky header, row selection, result count, pagination.
- `FilterBar`: search, one or two selects, clear, applied-filter chips.
- `ConfirmDialog` and a single `Toast` provider; retire `window.confirm` and `alert`.
- `usePagedResource` hook so every list shares loading, error, refetch and paging behaviour.
- `MoneyCell`, `RelativeTime`, `ExportButton`.
- `AdminSearch` with keyboard handling and correct listbox semantics.

## Not covered yet

These are policy decisions, not code findings, and they should be settled before the
settings and audit pages are designed:

- Refund authority and approval limits.
- Which roles may suspend or erase accounts.
- Retention rules for verification documents and identity files.
- How an admin is told when a Paystack webhook fails.
