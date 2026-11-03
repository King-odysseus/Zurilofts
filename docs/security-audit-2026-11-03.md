# Security audit verification and remediation plan

Date: 2026-11-03. Scope: calendar imports, message files, Google sign-in,
uploads, payment callbacks and transfer webhooks. This is an audit and plan;
no application fixes have been implemented.

## Evidence and limits

Findings below distinguish reproduced local behavior from deployment checks
that remain pending. Tests used synthetic accounts, files and signatures,
mocked database methods and mocked payment-provider responses. No real
database, Google account, payment, private network service or Cloudinary
asset was accessed. Local HTTP fixtures listened only on 127.0.0.1 at
temporary ports and were closed after testing. Synthetic files were written
under an OS temporary directory and removed after testing.

The working tree already contained listing-management edits before this
audit. Results describe the current local source, not a verified deployed
release. Source references are line numbers at audit time.

P1 means resolve before relying on the affected security or money boundary.
P2 means address in the next hardening pass. Priorities are provisional until
deployment configuration and operational exposure are checked.

## Confirmed findings and planned fixes

### SEC-01: P1 - Calendar imports can request internal destinations

Affected screen: host calendar, external calendar source and sync controls.
Files: `server/src/types/index.ts:456-459`,
`server/src/routes/property.routes.ts:36-38`,
`server/src/services/calendar.service.ts:104-106`,
`server/src/services/ical.service.ts:24-29`.

The source validator accepts loopback, private and link-local HTTP URLs.
The actual sync service fetched a synthetic loopback calendar and followed
a redirect to another loopback path. Database calls were replaced with
in-memory stubs. Ownership checks exist, but do not restrict where the
server fetches a host's feed. Installed node-ical forwards to fetch, reads
the whole response and has no application-supplied timeout or size budget.

Risk: a hosting account can make the server contact internal services;
slow or large feeds can also consume resources. Private-service data theft
and cloud metadata access were not attempted or established.

Plan: enforce allowed schemes and public destinations at connection time;
reject private/reserved IPv4 and IPv6 destinations, including normalized
forms. Revalidate each redirect, address DNS changes, and impose fetch,
response-size, parsing and concurrency budgets. Retain ownership checks.

Acceptance: valid public ICS imports still work; controlled loopback,
private, link-local, IPv6, redirect and DNS-change fixtures are rejected.
Slow, oversized and invalid feeds fail predictably without replacing
existing valid calendar blocks. Run DNS and network-policy checks in an
isolated staging environment before closing deployment acceptance.

### SEC-02: P1 - Conversation files have public delivery URLs

Affected screens: guest, host and admin messaging.
Files: `server/src/controllers/upload.controller.ts:71-95`,
`server/src/utils/imageStorage.ts:48-73,96-109`,
`server/src/app.ts:93-99`.

The actual local application returned synthetic message documents with
HTTP 200 both without credentials and with an invalid bearer token.
The upload itself requires authentication, but static download does not
check conversation membership. Cloudinary uses ordinary public uploads
in source; actual Cloudinary delivery was not tested.

Risk: anyone obtaining a document URL can read it outside the conversation.
Random filenames reduce guessing but do not enforce access rights.

Plan: separate private message storage from public listing photos. Bind
stored attachment IDs to owners and conversations. Authorize downloads
against participants and explicitly permitted support users. Use private
delivery or short-lived signed retrieval, with retention and deletion rules.

Acceptance: sender and intended recipient can retrieve a test attachment;
anonymous, unrelated and suspended accounts cannot. Test URL expiry,
forwarded URLs, deleted messages and legacy public assets. Inventory and
migrate existing files rather than protecting new uploads alone.

### SEC-03: P1 - Google sign-in lacks browser-bound transaction verification

Affected screens: login, registration and OAuth callback.
Files: `server/src/config/passport.ts:9-12`,
`server/src/routes/auth.routes.ts:36-48`.

With dummy credentials and application-equivalent options, the installed
Google strategy emitted no state or PKCE challenge. Callbacks with missing
state and arbitrary state both reached a mocked token exchange. Installed
passport-oauth2 selects its accepting NullStore for this configuration.

Risk: the callback is not bound to the browser that started sign-in,
creating a login-CSRF risk. A real cross-browser Google exploit was not run.

Plan: implement random, expiring, one-use state bound to the initiating
browser and safe internal return destination. Add PKCE with S256 as
additional protection. Provide a working transaction store; merely adding
`state: true` without the necessary storage is insufficient.

Acceptance: reject missing, changed, expired, replayed and cross-browser
state. Verify challenge/verifier matching and substituted-code rejection.
Real Google login and host-intent return paths must still work in staging.

### SEC-04: P2 - Access token is carried in the callback URL

Files: `server/src/controllers/auth.controller.ts:140-142`,
`src/pages/OAuthCallback.jsx:18-37`, `server/src/app.ts:87`.

Source confirms bearer-token query delivery. The frontend removes it only
after asynchronous authentication. Request logging records URLs, creating
an exposure path when the token-bearing callback is requested from the
same server. Actual production logs were not inspected.

Plan: use a short-lived, single-use exchange code or cookie-based completion.
Remove sensitive callback parameters immediately, including failure paths.

Acceptance: browser URLs/history, application logs and error reports contain
no bearer token. Reused/expired exchange codes fail, while login succeeds.
Check infrastructure logs and third-party page integrations in staging.

### SEC-05: P2 - PDF content validation and upload abuse controls are incomplete

Files: `server/src/routes/upload.routes.ts:9-14,47-54,90-94`,
`server/src/controllers/upload.controller.ts:71-93`,
`server/src/utils/imageStorage.ts:81-108`.

A synthetic authenticated multipart upload labelled `application/pdf` but
named `synthetic.html` was accepted with HTTP 201. The actual local app
then returned those harmless HTML bytes anonymously as `text/html`.
No script payload was used. A content security policy was present;
production script execution is not established.

Corrections to the initial risk description: uploads are authenticated and
capped at 10 x 10 MiB listing images or 5 x 15 MiB message files. A malformed
JPEG was rejected with HTTP 400 because Sharp decodes and reencodes images.
The remaining resource concern is concurrent in-memory processing and
missing account quotas, total multipart budgets and explicit field/part caps.

Plan: validate PDF contents, force safe stored extensions and delivery
headers, and combine this with private message storage. Set request,
concurrency and account budgets; assess malware scanning and orphan cleanup.

Acceptance: forged PDF bytes/extensions are rejected or safely normalized;
valid PDFs and images still work. Verify attachment disposition, content
type and Cloudinary behavior. Test limits and bounded concurrent requests
in an isolated environment, without production stress testing.

### SEC-06: P2 - Attachment references accept arbitrary web domains

File: `server/src/utils/messageAttachments.ts:35-43`.

The actual normalizer accepted a synthetic HTTPS URL on an unrelated
domain. It does not verify that the file was uploaded by the sender.
The probe did not request the external URL. Existing scheme restrictions
reject javascript/data/file URLs, but that does not establish file ownership.

Plan: accept server-issued attachment IDs, verify ownership and bind them
to the conversation. Preserve appropriate rendering protections.

Acceptance: arbitrary remote URLs, another user's attachment IDs and
unbound uploads cannot be attached. Intended recipients can still open
authorized files. Test old messages during any data migration.

### SEC-07: P1 - Out-of-order payout events can restore money twice

Files: `server/src/services/payment.service.ts:399-407`,
`server/src/services/payout.service.ts:348-386`.

Mocked signed-event processing reproduced this sequence:

1. `transfer.reversed` restores the wallet once.
2. Its immediate duplicate is ignored, as intended.
3. A later `transfer.success` unconditionally resets the payout to SUCCESS.
4. Another reversal restores the same payout amount again.

Risk: duplicate or out-of-order valid provider notifications can over-credit
a host wallet. This does not mean an unsigned request can move money.

Plan: define monotonic payout transitions and durable settlement identity.
Success events must not reopen already refunded failures/reversals. Make
the transition and accounting effect atomic, preserving legitimate
success-then-reversal behavior.

Acceptance: reversed-success-reversed and failed-success-failed restore
funds at most once; repeated success has no extra accounting effect.
Test replay, parallel delivery and rollback against PostgreSQL as well as
unit stubs. Reconcile historical affected transfers before rollout.

Status: fixed in code. Payout states now move through one rule set
(`server/src/utils/payoutTransitions.ts`): FAILED and REVERSED are terminal,
and `markTransferSucceeded` refuses to reopen either, which is the step that
had let a repeat reversal restore the balance a second time. The webhook
reports an ignored success notice instead of silently applying it.
`server/tests/payout.transitions.test.ts` replays the accepted sequences and
credits at most once. Still outstanding: parallel delivery against a real
PostgreSQL instance, and reconciling transfers already affected in production.

### SEC-08: P1 - Webhook processing failures are acknowledged as received

Files: `server/src/controllers/payment.controller.ts:85-89`,
`server/src/services/payment.service.ts:362-446`.

Mocked database and gateway outages both resulted in HTTP 200 with
`error: true`. This path has no durable queue that guarantees retry after
acknowledgment. A raw event log is not a retry queue by itself.

Plan: durably persist authenticated events for retry before acknowledging,
or return a retryable failure when processing cannot complete. Separate
permanent invalid-input rejection from transient outages.

Acceptance: a valid event interrupted by storage/provider failure is
eventually processed once after recovery. Verify real provider retry
behavior and reconciliation in sandbox/staging; preserve duplicate safety.

### SEC-09: P2 - Conflicted booking is reported as confirmed at payment return

Files: `server/src/services/payment.service.ts:97,191-196`,
`src/pages/PaymentCallback.jsx:63-76`.

A mocked owned CONFLICT booking returned `confirmed: true` and
`Already confirmed` without another gateway verification. Avoiding another
payment is sensible, but the callback treats this result as success.

Plan: separate settled payment from confirmed accommodation. Return an
explicit conflict/resolution state and explain the next step to the guest.

Acceptance: a paid but conflicted booking never presents itself as a
confirmed stay. Normal confirmed re-verification stays idempotent; no
second payment is requested while staff resolve the conflict.

### SEC-10: P2 - Invalid signatures create persistent database log entries

Files: `server/src/services/payment.service.ts:366-375`,
`server/src/routes/payment.routes.ts:19`.

A synthetic invalid signature produced a payment-log write before rejection.
There is no application-level webhook limiter in the inspected path.
Production gateway or infrastructure limits were not inspected.

Plan: reject unauthenticated events before payment-table writes. Use bounded
security logging and appropriate edge controls without suppressing valid
provider deliveries. Avoid retaining attacker-controlled sensitive payloads.

Acceptance: invalid signatures produce no payment records or financial
effects. Repeated invalid requests have bounded operational cost. Valid
signatures and legitimate provider bursts continue to work.

## Checks completed

- Nine isolated local checks passed: calendar URL validation; direct and
  redirected loopback fetching; arbitrary attachment URL acceptance;
  anonymous and invalid-token file downloads; unauthenticated upload
  rejection; forged PDF/HTML acceptance; malformed-image rejection.
- OAuth no-network probes confirmed absent state/challenge and callbacks
  reaching a mocked exchange with missing and arbitrary state.
- Seven mocked payment probes passed: signed database/gateway outages;
  invalid-signature log write; CONFLICT return; unrelated-user denial;
  consecutive duplicate reversal; out-of-order reversal/success replay.
- Existing payment regression command, run from `server/` with synthetic
  test configuration: `node --import tsx --test tests/payment.verify.test.ts
  tests/paystack.boundary.test.ts tests/paystack.money.test.ts`.
  Result: 30 passed, zero failed. These tests cover money/signature checks,
  not the full replay lifecycle or real database concurrency.

Temporary probe programs were local audit scratch work and removed. To
reproduce: run source modules with `node --import tsx`, set synthetic test
configuration before importing them, replace all Prisma operations used
by each scenario, and restrict outbound traffic to disposable localhost
fixtures. Never run these probes with production credentials or a live
database. Future fixes need committed behavioral regression tests for the
specific acceptance criteria above.

## Remaining deployment verification and implementation order

The source and isolated-verification portion of the security audit is
complete. Deployment acceptance remains open: private storage behavior,
Google browser flow, proxy logging, controlled network/DNS fixtures,
bounded upload load, PostgreSQL concurrency and provider sandbox retries.
These checks are prerequisites to closing future fixes, not claims of a
completed penetration test.

Implement only after authorization, in focused changes:

1. Payout replay accounting and reliable webhook receipt/retry.
2. Calendar destination restrictions and private attachment access.
3. Browser-bound OAuth transaction and token-free callback delivery.
4. PDF validation, upload budgets and attachment-ID ownership.
5. Conflict return messaging and bounded invalid-signature logging.

Every change needs its listed regression checks and existing lint/build
checks. No dependencies, schema changes, application code or styles were
changed for this audit.
