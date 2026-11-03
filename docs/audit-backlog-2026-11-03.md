# Audit backlog: ranked fixes and feature proposals

Date: 2026-11-03. Status: planning only. No application code, schema, copy or
style was changed for this step.

This document ranks what the audit found. It consolidates the security audit,
navigation audit, terminology plan, Help and recovery specification, admin
queue and audit-history specification, and the guest/host journey
verification. Finding identifiers from those documents are kept so each item
can be traced back to its evidence.

## How items were ranked

Three questions decided the order:

1. Can this cost money or expose private data? Those come first, ahead of
   anything cosmetic.
2. Does this stop a person completing a task today? Second.
3. Does this mislead, confuse or promise something the app does not do? Third.

Effort is a rough band, not an estimate: small is a contained change in one
or two files, medium spans a workflow, large needs new storage or a new
service. Nothing here is scheduled; each item needs its own approval.

## Tier 0 - Money and private data (fix before the next release)

| # | Item | Affected area | Risk if left | Fix | Acceptance check | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| 0.1 | SEC-07 Out-of-order payout events restore money twice | `server/src/services/payment.service.ts`, `server/src/services/payout.service.ts` | Duplicate or reordered provider notices can credit a host twice | Monotonic payout transitions; refusal to reopen a refunded or reversed payout; atomic accounting | reversed-success-reversed and failed-success-failed credit at most once; replay and parallel delivery tested against PostgreSQL | medium |
| 0.2 | SEC-08 Failed webhook processing is acknowledged as received | `server/src/controllers/payment.controller.ts`, `server/src/services/payment.service.ts` | A provider outage silently loses a payment event with no retry | Durable intake before acknowledging, or a retryable failure response; separate permanent rejection from transient outage | an event interrupted by a database or provider failure is eventually processed exactly once | medium |
| 0.3 | SEC-01 Calendar imports can reach internal addresses | `server/src/services/ical.service.ts`, `server/src/types/index.ts`, `server/src/services/calendar.service.ts` | A host can make the server contact internal services; slow feeds consume resources | Allow only public http(s) destinations at connection time and after each redirect; fetch size, time and concurrency budgets | loopback, private, link-local and redirect-to-private fixtures rejected; valid public feed still imports | medium |
| 0.4 | SEC-02 Message attachments are publicly readable | `server/src/controllers/upload.controller.ts`, `server/src/utils/imageStorage.ts`, `server/src/app.ts` | Anyone with a file link reads another person's documents | Private storage for message files, download authorized against conversation membership, short-lived retrieval | sender and recipient can download; anonymous, unrelated and suspended accounts cannot; existing files migrated | large |
| 0.5 | SEC-03 Google sign-in is not bound to the browser that started it | `server/src/config/passport.ts`, `server/src/routes/auth.routes.ts` | Login CSRF: a callback can be completed without proof it came from this browser | Random, expiring, single-use transaction bound to the initiating browser; PKCE with S256 | missing, changed, expired, replayed and cross-browser state rejected; normal Google sign-in and host-intent return still work | medium |
| 0.6 | SEC-04 Access token travels in the callback URL | `server/src/controllers/auth.controller.ts`, `src/pages/OAuthCallback.jsx` | Bearer tokens reach logs, history and analytics | Single-use short code exchanged for tokens, or cookie-based completion; strip parameters on every path | no token appears in URLs, logs or error reports; expired or reused code fails | medium |

## Tier 1 - Broken promises and blocked tasks

| # | Item | Affected area | Risk if left | Fix | Acceptance check | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| 1.1 | J-01 The push prompt covers the message send button | `src/components/PushNotificationPrompt.jsx`, `src/App.jsx`, `src/i18n/domains/discovery.js` | Guests cannot send a message until they dismiss an unrelated banner; guests are told about "your listings" | Keep the overlay clear of the composer and the mobile tab bar; choose wording by role or workspace | send button clickable while the prompt shows at 390 and 1440; guest, host and admin each see their own wording | small |
| 1.2 | NAV-01 Sign-in loses the page you were on | `src/components/ProtectedRoute.jsx`, `HostRoute.jsx`, `AdminRoute.jsx`, `src/pages/LoginPage.jsx`, `RegisterPage.jsx`, `OAuthCallback.jsx` | Deep links, filters and anchors are lost, and admin or host destinations drop entirely | Carry one validated internal destination (path, query, fragment) through login, signup and OAuth; keep role checks | a signed-out deep link returns to the same authorized screen after each method; external and cross-role destinations rejected | medium |
| 1.3 | Trust and Safety cannot reach older cases | `src/pages/AdminTrustSafety.jsx`, identity and dispute controllers/services | Cases beyond the first 100 are unreachable, and only four open disputes are listed | Independent server-paged panels with status, search and accurate totals; URL-restorable filters | a queue with more than 237 records reaches every case in every status; last-page correction works | medium |
| 1.4 | J-02 Bank list fails with a server error when the provider is down | `server/src/controllers/payment.controller.ts`, `src/pages/HostApplicationPage.jsx`, `HostSettingsPage.jsx`, `ProfilePage.jsx` | Payout setup silently loses its bank list during an outage | Controlled unavailable response with a stable code; each screen explains and offers retry | blocked provider shows an explained state with retry; provider available populates banks as today | small |
| 1.5 | NAV-02 Review actions miss the composer that exists | `src/pages/TripHubPage.jsx`, `PropertyPage.jsx`, `ReviewSection.jsx`, `ProfilePage.jsx` | "Write review" lands on a screen with no form, so the promised action fails | Route every review action to the booking-specific composer and state eligibility there | eligible completed booking opens its form; already-reviewed, cancelled and unknown bookings each show the right state | small |
| 1.6 | NAV-05 Host message notices open the guest inbox | `server/src/services/conversation.service.ts` | Hosts land in guest navigation and lose their workspace context | Choose the notification target from recipient context | guest-to-host opens the host thread; host-to-guest opens the guest thread, including after session restore | small |
| 1.7 | Missing Help Centre and password recovery | `src/App.jsx`, `src/GuestDiscovery.jsx`, `src/components/AuthShell.jsx`, `src/pages/LoginPage.jsx`, auth routes and services | "Help Centre" opens travel guides; "Forgot password" opens an email link; recovery does not exist | Implement the Help Centre and the recovery flow as specified | every promised support and recovery action reaches a working, named experience, including failure and expiry states | large |
| 1.8 | SEC-05 Uploaded files are not validated by content | `server/src/routes/upload.routes.ts`, `server/src/controllers/upload.controller.ts`, `server/src/utils/imageStorage.ts` | A file labelled PDF is accepted and served back as HTML; no account-level quota | Verify file signatures, force safe extensions and delivery headers, add request and concurrency budgets | forged PDF bytes rejected or normalized; valid PDFs and images still work; upload limits bounded | medium |
| 1.9 | SEC-06 Attachments accept any web address | `server/src/utils/messageAttachments.ts` | A message can point at a file the sender never uploaded | Accept only server-issued attachment identifiers bound to the sender and conversation | foreign and arbitrary URLs rejected; intended recipients still open authorized files | small |

## Tier 2 - Trust, clarity and correctness

| # | Item | Affected area | Risk if left | Fix | Acceptance check | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| 2.1 | Complete audit history | `src/pages/AdminGovernance.jsx`, both Prisma schemas, new audit service and route | Decisions cannot be reconstructed; identity history shows only the latest state | Durable append-only events with actor, action, target and outcome, written in the same transaction; honest provenance for imported history | identity re-review and role changes each appear as their own events; deleting a record keeps its history; audit insert failure rolls back the change | large |
| 2.2 | SEC-09 A conflicted booking is presented as confirmed | `server/src/services/payment.service.ts`, `src/pages/PaymentCallback.jsx` | A paid guest is told the stay is confirmed when it is not | Return an explicit conflict state and explain the next step; never re-charge | a paid but conflicted booking never reads as confirmed; staff resolution path is visible | small |
| 2.3 | SEC-10 Invalid signatures create database rows | `server/src/services/payment.service.ts`, `server/src/routes/payment.routes.ts` | Unauthenticated traffic can write payment log entries | Reject before any payment write; bounded security logging | invalid signatures produce no payment records and bounded cost; valid bursts unaffected | small |
| 2.4 | NAV-07 Unknown URL prefixes answer "200" | `server/src/services/seo.service.ts`, `server/src/index.ts` | Broken links look healthy to crawlers and link checks | Match supported routes or segment boundaries | typo addresses return 404 with a useful screen; valid protected deep links keep their shell | small |
| 2.5 | Lists that page locally or not at all | `AdminFeedback.jsx`, `AdminMessages.jsx`, `AdminBookings.jsx`, `OrphanedListingsPanel.jsx`, message service | Filters apply only to the visible page; support history is loaded whole | Server-side filters, counts and paging with stable ordering | filters and totals match the whole dataset; older thread messages load by cursor | medium |
| 2.6 | Terminology: stays for guests, listings for management | translation domains, `src/utils/titles.js`, exports, server error strings | Guests read "property" in checkout and history; hosts read "stay" in management | Apply the four prepared batches, preserving legal terms, API names and stored templates | EN/SW parity kept; guest screens say stay, management says listing; legal and physical-property wording unchanged | medium |
| 2.7 | J-03 Host calendar tab still says "Property calendar" | `src/utils/titles.js` | Old wording survives in the browser tab | Rename to "Listing calendar" | direct load and client navigation both show the new title | small |
| 2.8 | J-04 "Edit listing" offered while under review | `src/pages/HostListingsPage.jsx` | A button promises an edit that cannot be saved | Label it for viewing, or open a read-only view | no under-review control implies a save that will fail | small |
| 2.9 | NAV-09 Labels that promise a different destination | `src/components/ListingEditorTabs.jsx`, `src/GuestDiscovery.jsx`, `HostRoute.jsx` | A settings gear opens account settings; featured guide cards open the index | Relabel or point at the matching destination | label, accessible name and destination agree | small |
| 2.10 | NAV-06 Fragment links that can point nowhere | `src/components/IdentityVerificationPanel.jsx`, `ProfilePage.jsx` | Step links target sections that do not render in submitted states; tab changes ignore the hash | Render only meaningful links; react to location changes | submitted and approved identity screens expose no dead anchors; `#bookings` switches tabs while mounted | small |
| 2.11 | Guest mobile navigation depends on remembered host mode | `src/components/MobileBottomNav.jsx`, `src/components/HostLayout.jsx` | A guest browsing from host mode can lose their mobile tabs | Derive navigation from the current surface | shared stay, `/stays` and `/trips` keep guest navigation after entering the host workspace | medium |
| 2.12 | Calendar day cells lack a date-based accessible name | host calendar components | Screen-reader users cannot identify a night; automated checks cannot target one | Include the date in each cell's accessible name | a specific night can be addressed by name and read correctly by assistive technology | small |

## Tier 3 - Features worth building, in value order

| # | Feature | Affected screens/files | Why it helps | Main risk | Acceptance check | Effort |
| --- | --- | --- | --- | --- | --- | --- |
| 3.1 | Help Centre with real articles | new help pages, `App.jsx`, footer and auth shell links, reviewed EN/SW catalogue | Turns three misleading links into a support surface that also serves locked-out people | Content drift from actual behaviour | every article's steps match the shipped app; unknown article and failed load have distinct states | medium |
| 3.2 | Secure password recovery | new recovery pages, auth routes/service, reset storage, delivery outbox, trusted origin | Removes a manual email dependency and a support burden | Account enumeration, token leakage, delivery failures | generic responses for known and unknown addresses; expired, reused and concurrent resets fail safely; old sessions die | large |
| 3.3 | Admin queue operations: ageing, assignment, saved views | Trust and Safety, governance, shared paging components | Cases stop waiting unnoticed | Queue mutation races between admins | ageing is visible per case; assignment survives filter changes; two admins acting at once get a clear conflict | medium |
| 3.4 | Staff MFA and session management | admin auth, `server/src/middleware/auth.ts`, user settings | Admin accounts can approve payouts and release identity documents | Lockout and recovery procedure | MFA enforced for ADMIN; sessions can be reviewed and revoked; recovery path documented | medium |
| 3.5 | Calendar sync health and retry | `server/src/services/ical.service.ts`, host calendar screen | A failed feed silently blocks nights or double-books them | Same network boundary as SEC-01 | last sync time, error reason and manual retry visible; repeated failures do not stack blocks | medium |
| 3.6 | Payout and refund reconciliation view | admin revenue, payouts, payment service | Disputes about missing money get answered from evidence | Reading provider state wrongly | each payout shows provider reference, attempts and outcome; mismatches are listed for staff | medium |
| 3.7 | Saved-search alerts for guests | discovery search, notification service | Repeat demand for the same dates and area | Notification fatigue and mailing reputation | alerts honour saved filters, can be turned off, and link to a working search | medium |
| 3.8 | Account security page for everyone | profile, security service | People can see and end sessions after a suspected compromise | Confusing session data | active sessions listed with device and time; revoking one ends it immediately | medium |

Deliberately not proposed: a CMS for help content, an event-sourcing rewrite of
the domain, and a general error-handling framework. Each is a large commitment
and none is needed to close the findings above.

## Recommended sequence

1. Tier 0 items, money first: payout replay, webhook receipt, then calendar
   and attachment access. These are small enough to land separately and each
   has a regression test that runs without a live provider.
2. Tier 1 items that unblock people: the push prompt, sign-in return
   destinations, and Trust and Safety paging.
3. Help Centre, then password recovery, because recovery depends on the
   session-invalidation prerequisite described in its specification.
4. Complete audit history after the queue work, since both share the admin
   list conventions.
5. Terminology and label polish in one pass, with the shared error-message
   split done first.
6. Features from Tier 3 only once the above is closed.

## Verification standard for every item

Each fix needs, at minimum:

- a behavioural test that fails before the change and passes after, written
  in the existing suite style under `server/tests/` or the browser harness;
- `npm run lint` and `npm run build` clean, plus server type checks;
- a note in the relevant specification document saying what changed, so the
  audit trail stays readable;
- the isolation rules already used here: throwaway database, blank provider
  keys, localhost-only traffic, and no real person's data.

Items that touch a live boundary (payments, payouts, Google sign-in, private
files, mail delivery) additionally need a staging check against the sandbox
account before they are called done. Source-level and mocked verification is
recorded in the security audit as evidence, not as a substitute for that.
