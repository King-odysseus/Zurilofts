# Admin queue pagination and audit history specification

Date: 2026-11-03. Status: specification only. No application code, schema,
stored records or admin permissions have been changed.

## 1. Confirmed current behavior

| Screen | Current behavior and source | Required change |
| --- | --- | --- |
| Trust and Safety | `AdminTrustSafety.jsx:105-115` fetches only the first 100 identities/disputes; `:128-137` filters/counts locally; `:372` renders only four open disputes | Independent server-paged panels; every status and older record reachable |
| Governance | `AdminGovernance.jsx:92-104` fetches four capped lists, then `:175-176` paginates the reconstructed events in groups of eight | Dedicated durable event API plus independent server summaries |
| Listing approvals | `AdminListingReview.jsx:107-143` already uses server status/search/page and separate global counts | Preserve paging; improve deterministic order, URL state, last-page correction and summary retry |
| Users | `AdminUsers.jsx:95-134` already uses server paging/search/role | Preserve full-dataset search; protect against late responses and restore URL state |
| Host applications | `AdminHostApplications.jsx:94-125` already uses server status/search/page; some metrics are page-derived | Protect against late responses and label page/global metrics correctly |
| Feedback | `AdminFeedback.jsx:299,315-336,510` pages on the server but filters search/visibility/rating only within that page | Apply filters before server count and paging |
| Support messages | `AdminMessages.jsx:59,109,162-170` loads all conversations and the full selected thread; search is local | Paged conversation search and bounded thread history |
| Orphaned listings | `OrphanedListingsPanel.jsx:27`, `property.service.ts:863-880` load an unbounded list | Server paging/search/status and explicit selection scope |
| Bookings | `AdminBookings.jsx:295-308` already pages by status; metrics are explicitly page-scoped | Stable ordering, URL state and explicit search/refund filters |

The first priority is Trust and Safety: its current warning discloses the
100-row cap but does not let staff reach omitted records. Resolved/dismissed
disputes have counts without a corresponding actionable list. Keep working
paging on the other screens rather than rebuilding it unnecessarily.

## 2. Operational list API contract

Preserve existing response conventions:

```text
GET existing-admin-list?page=1&limit=20&status=...&search=...&sort=...
{
  success: true,
  data: [...],
  pagination: { page, limit, total, totalPages },
  summary: { ...documented server aggregates... }
}
```

The summary block is optional and its scope must be explicit. List data
remains an array. Apply authorized scope and filters before both count and
paging. Return only list-row fields; fetch private documents, full notes
and long histories through authorized detail/history requests.

### Validation, totals and ordering

- Default page size 20; permit bounded finite integer values up to 100.
  Reject fractional, infinite, negative and malformed pagination consistently.
  Validate supported status, sort and search inputs with existing validation
  tools. Avoid silently ignoring an invalid filter.
- `pagination.total` is the matching record count, not page length.
  `totalPages` is derived from that same count and limit. For zero matches,
  use an empty data array and zero total/totalPages; the UI displays a useful
  empty state with no invalid range.
- Add a unique ID tie-breaker to every sort. Review queues default to oldest
  relevant submitted/opened time, then ID. Listing review's current oldest
  sort uses creation time, which is not always submission time. Use the
  pending submission time for moderation without changing public browse sort.
- Identity/application review queues use submittedAt for pending work;
  historical/status views can use latest update, with explicit labels.
  Disputes use opened/created time. Define null timestamp handling rather
  than allowing inconsistent database defaults.
- Page queries and counts should represent one consistent read where feasible.
  These are live queues, not immutable snapshots: concurrent moderation can
  change membership. Refresh after actions; do not promise a frozen queue
  across requests merely because ordering is deterministic.
- Out-of-range page requests after removals must return enough pagination
  information for one correction to the last valid page. Preserve filters.
- Missing/malformed pagination is an API error on paged lists. Do not silently
  invent total=data.length and totalPages=1, which recreates hidden records.

### Endpoint additions and existing support

| Endpoint | Existing support | Planned additions |
| --- | --- | --- |
| `/api/admin/identity-verifications` | status, name/email search, page/limit; updatedAt descending | Queue order, tie-breaker and server status summaries |
| `/api/admin/disputes` | status, page/limit; createdAt descending | Safe case/booking reference and participant search, tie-breaker and summaries |
| `/api/admin/host-applications` | status, business/contact/user-email search, page/limit | Review order, tie-breaker and explicit metric scope |
| `/api/admin/users` | role/name/email search and page/limit | Stable tie-breaker; supported suspension filter if exposed |
| `/api/admin/properties` | status/search/sort/page/limit | Pending-submission order for review; preserve established public/API names |
| `/api/admin/reviews` | page/limit and a global rating summary | Search, visibility and rating filters applied server-side |
| `/api/admin/bookings` | status/page/limit | Booking/reference/customer/listing search and refund-status filter |
| `/api/admin/messages` | Whole conversation list | Page/search/unread filter with server counts and stable latest-message order |
| `/api/admin/messages/:userId` | Whole thread | Latest bounded batch plus cursor for older messages |
| `/api/admin/properties/orphans` | Whole orphan list | Page/status/search and bounded cleanup selection |
| `/api/admin/operations-summary` | Proposed endpoint | Global role, queue and review counts with scope and generatedAt |

Exact existing source: `identity-verification.service.ts:273-299`,
`dispute.service.ts:194-214`, `host-application.service.ts:644-678`,
`user.controller.ts:95-101`, `user.service.ts:139-178`,
`property.controller.ts:22-46`, `property.service.ts:398-415`,
`review.controller.ts:39-50`, `review.service.ts:232-255`,
`booking.controller.ts:89-99`, `booking.service.ts:561-572`.

Add new filters only when the service/controller actually implements them.
Parameterize database conditions and allowlist sorting. A new query parameter
must not accidentally become arbitrary field access or raw SQL.

## 3. Queue screen behavior

### Trust and Safety

Use separate identity and dispute list states: page, status, search,
loading, error, rows and pagination. Reuse existing table/pagination/state
components and request-order protection. One failed panel must not prevent
the other from loading or being used. Summary failures get their own retry.

Identity filters include In review, Verified, Changes requested and All;
the All view can expose other stored statuses where staff need them.
Disputes include Open, Under review, Resolved, Dismissed and All. Replace
the four-item slice with a normal paged list.

Persist each panel's filters/page separately in the URL, for example
verificationPage/verificationStatus/verificationSearch and
disputePage/disputeStatus/disputeSearch. Back/forward and reload restore
the context. Changing a filter returns that panel to page one only.

Case deep links use a canonical query such as
`/admin/trust-safety?caseType=identity&caseId=:id` or caseType=dispute.
Load details through existing `/identity-verifications/:id` or `/disputes/:id`
APIs even when the record is outside the current page/filter. A missing or
unauthorized case shows an explicit state without opening another record.
Closing the detail preserves queue state and sensible browser history.

### Shared list and mutation requirements

- Display server matching totals. Label local statistics On this page;
  label platform summaries separately. Unavailable counts are unavailable,
  not zero. Show generatedAt/as-of time where freshness matters.
- Reuse the stale-response guard already in `usePagedResource.js:24-69`.
  Custom Users/HostApplications requests need equivalent cancellation or
  request IDs. A slow response cannot overwrite a newer page/filter.
- After an action, refresh both page and relevant summaries. If membership
  changes, remove the row and correct a now-empty last page. Disable repeat
  submissions and handle a second admin's stale-state conflict explicitly.
- Keep selected IDs tied to their stated page/filter context. Select all on
  this page never means every matching record. Clear selections when the
  context changes unless there is an explicit cross-page selection design.
- Orphan cleanup remains per-ID, with eligibility rechecked immediately at
  mutation time and individual deleted/suspended/skipped/failed results.
  Duplicate IDs and batch sizes need bounds. Do not trust a stale list's
  hostless status for destructive action.

### Support list and thread history

`message.service.ts:61-90` currently loads all users with messages and makes
an unread-count query per user. Build the paged conversation projection and
unread counts in bounded database queries; paging after fetching all users
would leave the underlying scaling problem intact.

The first thread request returns its latest bounded messages, ordered for
display; Older messages uses an opaque cursor and preserves scroll position.
Direct `/admin/messages/:userId` opens independently of the visible inbox
page. Handle deleted/empty conversations deliberately.

Bind a send's completion to its original account ID. The current callback
at `AdminMessages.jsx:141-151` appends to current thread state even if staff
switch accounts while sending. Loading older messages must not mark unseen
history or newly arrived messages as read. Bound read acknowledgment to the
messages actually displayed; preserve the existing explicit read endpoint.

## 4. Complete audit history: evidence and honest coverage

The current Governance timeline is not a durable general audit log:

- It reconstructs application/dispute activity only from the first 100 parent
  records and can omit older parents and deleted records.
- Identity activity uses only latest reviewedAt/status
  (`AdminGovernance.jsx:128-136`). Earlier decisions cannot be reconstructed.
- Current ADMIN users are labeled Admin account created at user.createdAt
  (`:150-156`). That does not prove when admin access was granted and misses
  demotions and intervening role changes.
- Role/open-case/review totals at `:178-187` are calculated from capped arrays.

Existing useful records:

| Source | Useful evidence | Limitation |
| --- | --- | --- |
| `HostApplicationAudit`, schema `:173` | Real application actions and host-document release events | Cascades when application is deleted; limited before/after facts |
| `DisputeAudit`, schema `:502` | Real notes/status/message/evidence actions | Cascades with dispute; evidence downloads do not receive an actor |
| `IdentityVerification`, schema `:393` | Latest reviewer/time/status | No independent sequence of prior reviews |
| `AccountErasureLog`, schema `:77` | Actor-attributed erasure fact surviving account removal | Not included in Governance |
| `PaymentLog`, schema `:704` | Truncated webhook receipt payload | Provider receipt is not proof of a staff action or settlement outcome |
| Latest listing reviewer fields / cleanup console | Some current state / transient operational output | No durable listing action history |

Complete history means complete covered instrumentation from a documented
rollout boundary. Unknown past events cannot be invented. Display the start
date, instrumentation coverage version and any legacy gaps.

## 5. Durable event design

Add a focused AuditEvent table and read service using existing database
infrastructure. Keep domain logs for their current timelines; do not replace
the application with an event-sourcing framework or add an event bus.

Proposed fields:

- Opaque immutable event ID and a database-assigned monotonic ingestion key
  suitable for both supported schemas; recordedAt generated by the server.
- occurredAt where known, schemaVersion and action family/action code.
- actorKind USER/SYSTEM/PROVIDER/UNKNOWN, nullable opaque actor ID,
  role at action time when known, and system component where appropriate.
- target type/opaque target ID, minimal related record IDs, outcome and
  safe reason code. Outcomes distinguish succeeded, denied, failed and no change.
- Request/operation correlation ID and an optional unique idempotency/source
  key, allowing retries and per-item batches to be traced without duplicates.
- Small allowlisted before/after facts appropriate to each action: role,
  status, publication flag, changed field names, integer amount and currency.
  Store validated structured text if needed for current SQLite compatibility.
- Provenance LIVE/LEGACY_EVENT/LEGACY_SNAPSHOT, source model/source ID and
  import time. Preserve original occurrence time separately from ingestion.

Actor and target IDs have no cascading relation to mutable/deletable
accounts or listings. Preserve facts when a target is erased; show a deleted
record label and retained opaque reference. IDs remain potentially personal
data, so retention/access policy still applies. Avoid immutable copies of
names, email, addresses and listing descriptions by default.

Exclude passwords/hashes, reset/access tokens, cookies, identity numbers,
document bytes, bank details, raw payment payloads and private message bodies.
Do not dump request objects or full database records into before/after data.
Keep freeform review reasons in their protected domain record; central
events can reference that record or an approved reason code.

This follows the actor/action/target/outcome and sensitive-data principles
in the [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
The table shape and coverage decisions are project-specific proposals.

### Write and access semantics

1. Derive trusted actor context in authenticated controllers, schedulers or
   verified provider handlers. Never accept actor identity/role from JSON.
2. Commit a sensitive database mutation and its success event in the same
   transaction. Audit insert failure rolls back the mutation. Capture actual
   prior state inside the transaction and use conditional transitions.
3. An idempotent retry cannot invent another successful transition. Record
   no change when useful, correlated to the original operation.
4. Batch cleanup records a batch correlation ID and per-item outcomes,
   including skipped cases and changed eligibility.
5. External transfers/messages/broadcasts need separate requested and
   confirmed/failed outcomes. A submitted request is not completed delivery
   or payment. Use existing idempotency/reconciliation infrastructure and
   durable intent where necessary; do not claim atomic external rollback.
6. Failed/denied attempts cannot be saved inside a transaction that is rolled
   back. Use a bounded security-event path with safe metadata and alert on
   logging outages. Unauthenticated attack traffic must not create unbounded
   financial/audit rows, consistent with SEC-10.
7. No ordinary edit/delete API for audit rows. Corrections append an event.
   Use restricted production insert/read permissions where supported;
   controlled retention/migration credentials are separate. SQLite relies
   on application/filesystem protection. This is not proof against a database
   administrator rewriting data; stronger tamper evidence is separate scope.

### Required action coverage

| Family | Events to record, preserving current permission rules |
| --- | --- |
| Accounts | Approved profile-field changes, allowed role changes, suspend/restore, staff password replacement, credential/session revocation and erasure/anonymization |
| Bootstrap | Actual configured admin creation/promotion/restoration, credential change and other-admin demotion; no repeated event for an unchanged startup |
| Trust | Application/identity approve/reject/request changes/investigation/status changes; dispute notes/messages/status/resolution/dismissal |
| Sensitive reads | Host/identity document release, dispute evidence release, user/WHT/audit exports and relevant access failures, without private contents |
| Listings | Approve/reject/suspend/restore/delete, blocked deletion, orphan cleanup and each result |
| Bookings/money | Status/date/guest/price edits, cancellation/deletion/stale cleanup, staff refund decisions and payout request/results |
| Content/config | Review hide/restore/delete, add-on catalogue/assignment changes, guide create/edit/publish/unpublish/delete, landing-stat changes |
| Communications | Support reply sent and broadcast request/results; reference/counts only, no message body |
| Audit | Sensitive detail/export access where required; avoid recursively creating events for every ordinary history-list render |

Do not introduce a new ability to grant ADMIN or bypass host/payment rules
while instrumenting existing actions. Record SYSTEM/PROVIDER work as such,
not as an arbitrary administrator. Staff marking an off-platform refund as
paid must not be labeled as the system executing a refund.

Host-document access already writes DOCUMENT_VIEWED at
`host-application.service.ts:607-624`. It proves server release, not human
viewing. Identity/dispute downloads at `identity-verification.service.ts:309`
and `dispute.service.ts:262` need trusted actor context and equivalent release
events before sending sensitive bytes. Distinguish authorized/released,
response-finished and aborted outcomes where observable.

## 6. Audit API and Governance screen

Proposed ADMIN-only APIs:

- `GET /api/admin/audit-events`
- `GET /api/admin/audit-events/:id`

Protect both with authenticate/requireAdmin and no-store responses. List
filters: UTC recorded-date range, action/family, actor ID/kind, target type/ID,
outcome and provenance. Date labels explicitly distinguish recorded time
from original occurrence time on imported records. Validate every filter;
search only approved identifiers, not arbitrary JSON or sensitive contents.

Use cursor paging for this append-only feed, default 50 and maximum 100.
Return data plus pageInfo containing nextCursor, hasMore, limit and asOf,
alongside coverage/provenance metadata. This intentionally differs from
the page-number contract for mutable operational queues; keep frontend
state explicit rather than fabricating totalPages for the event feed.

An opaque validated/signed cursor binds the last ingestion key, first-page
upper bound, filter set and expiry. Index ingestion order and target/actor/
action plus ingestion key. Test actual migration/index compatibility in
SQLite and PostgreSQL before adopting the field representation.

A high-water traversal is not a perfect cross-request database snapshot:
late commits can appear behind an earlier boundary. Refresh starts a new
traversal; document that behavior and test concurrent/late commits. Any
reproducible export needs a bounded consistent database snapshot with its
actual filters/cutoff/count recorded, not a concatenation of live pages.

Governance should show actual server events, server-filtered history,
provenance badges and an event detail panel. Link application/listing/user
events to canonical details; identity/dispute events use the Trust case query.
Deleted targets keep a history/tombstone view instead of a dead Open link.
An event deep link such as `/admin/governance?eventId=:id` loads by event ID
independently of current filters. Current queue/account summaries are a
separate server-backed section, not historical counts reconstructed from
the visible event page.

## 7. Older records and migration honesty

1. Import real HostApplicationAudit, DisputeAudit and AccountErasureLog rows
   using unique source-model/source-ID keys. Rerunning imports is safe.
   Preserve domain records until their consumers are deliberately migrated.
2. Treat latest identity/listing reviewer fields as LEGACY_SNAPSHOT, not a
   reconstructed sequence of approvals and rejections. State that earlier
   decisions are unavailable.
3. Current ADMIN role plus account creation time cannot establish privilege
   grant time. Import only an observed-role snapshot at migration time, with
   actor/role-at-action unknown unless authoritative evidence exists.
4. Provider PaymentLog imports need an explicit mapping/redaction review;
   a webhook receipt must not be converted into a successful staff action.
5. Distinguish occurredAt, recordedAt and import time. Do not backdate a
   synthetic assertion or infer historical actor role from today's role.
6. Start new live writes transactionally at a documented cutoff; import
   existing rows in bounded batches, reconcile counts and source keys, and
   prevent duplicate central feed entries during dual writing/backfill.
7. Surface incomplete coverage until the action matrix is instrumented and
   verified. Out-of-band database/infrastructure edits are outside this app
   event trail unless a separate database audit mechanism captures them.

Retention duration, permitted sensitive read metadata and anonymization
rules need an owner-approved policy before rollout. Do not invent a legal
retention period. Disposal is a controlled maintenance operation, not a
moderator clearing inconvenient history.

## 8. Files and implementation sequence

| Work | Affected files / proposed additions |
| --- | --- |
| Trust queues | AdminTrustSafety; identity/dispute controllers/services; existing admin routes |
| Shared list state | usePagedResource, AdminPagination, relevant Users/Applications/Feedback/Bookings/ListingReview screens and translations |
| Support paging | AdminMessages; message controller/service; existing read acknowledgment route |
| Orphan queue | OrphanedListingsPanel; property controller/service/admin-property routes |
| Aggregates | Proposed operations-summary controller/service and admin route; Governance/dashboard consumers |
| Event storage/read | Both Prisma schemas and migration; focused audit writer/read service/controller and validated schemas |
| Event instrumentation | User, host application, identity, dispute, property, booking/payment/payout, review, add-on, blog, settings, messaging, bootstrap and erasure handlers |
| Governance | AdminGovernance, case/event query navigation, pagination/detail components and translations |
| Verification | Queue fixtures, audit transaction/privacy/import/cursor tests; existing schema/lifecycle tests |

Sequence after authorization:

1. Fix Trust queue visibility using existing paged endpoints; add missing
   server filters, stable sorts and correct totals. Keep independent errors.
2. Address feedback/support/orphan paging and list/action race behavior;
   preserve existing functioning queues and per-item cleanup safeguards.
3. Add event storage and trusted actor/write boundary, then instrument the
   sensitive-action matrix in focused commits with transaction tests.
4. Import authoritative legacy facts with explicit provenance and gaps.
5. Replace reconstructed Governance history and page-derived global counts
   with event/aggregate APIs. Verify old records and deleted targets.

Styles stay in `src/styles.css` and current Tailwind/Flowbite conventions.
No additional dependencies or stylesheets are needed for this specification.

## 9. Acceptance fixtures and checks

| Fixture / failure | Required result |
| --- | --- |
| At least 237 records per queue, including cases beyond row 100 | All statuses/older cases reachable and searchable across pages |
| Equal timestamps at boundaries, unchanged committed dataset | Deterministic ordering; no duplicate/missing IDs |
| Zero/one/exact-multiple/partial last page | Honest counts, ranges and enabled controls |
| Fractional/infinite/invalid page/limit/filter/sort | Consistent validation; no unbounded query |
| Slow request A, then newer fast B | B remains visible; old counts/rows cannot overwrite it |
| Independent panel or summary outage | Healthy tables remain usable; unavailable data is not zero |
| Last item removed from last page | Valid corrected page and refreshed matching/global totals |
| Two admins act on one case | Conditional transition and accurate conflict/no-change feedback |
| Deep link outside current filters or to a deleted case | Correct ID-based detail or explicit unavailable state |
| Support send finishes after thread switch | Reply stays under its original account; draft/retry semantics remain correct |
| Thread pagination/read acknowledgment | Scroll retained; unseen messages not marked read by history loading |
| Orphan reassignment/duplicate selection before cleanup | Current eligibility wins; one explicit per-ID outcome |
| Audit insert fails during business mutation | Full rollback; no successful unaudited change |
| Retried/concurrent sensitive action | Correct state and correlated event idempotency |
| Identity re-review and role change/demotion | Independent accurate historical events, not today's inferred state |
| Delete user/listing/application/booking | Central history survives without copying prohibited personal data |
| Document/export release and abort | Trusted actor/outcome recorded; no private bytes in audit |
| Legacy import run twice | No duplicates, invented actors or fabricated grant dates |
| Cursor filter change, equal times, new/late commits | Defined traversal behavior and honest refresh/export semantics |
| Guest/HOST/suspended/ADMIN requests | Audit APIs restricted; field redaction and record authorization enforced |
| SQLite/PostgreSQL migration and transaction checks | Equivalent schema behavior and valid indexes |

After implementation run `npm run lint`, `npm run build`, server type/schema
checks, relevant existing lifecycle tests and the focused integrations above.
This step verified source contracts and stored-history limitations only;
no application changes or functional tests were run for this specification.
