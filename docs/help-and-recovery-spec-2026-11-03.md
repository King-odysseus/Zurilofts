# Help Centre and password recovery specification

Date: 2026-11-03. Status: specification only. No screens, endpoints, database
changes, email delivery or application fixes have been implemented.

## Existing features and launch boundaries

| Existing source | Verified behavior | Specification consequence |
| --- | --- | --- |
| `GuestDiscovery.jsx:278`, `AuthShell.jsx:41` | Help links open editorial travel guides | Point them to a real public Help Centre |
| `MessagesPage.jsx:66,93`, `server/src/routes/message.routes.ts:9-12` | Authenticated support thread, send/load/retry behavior | Reuse its API, composer and support pane |
| `MessagesPage.jsx:50-51` | Sidebar fetches guest conversations | A host support screen must retain host navigation instead of importing the whole guest page |
| `message.service.ts:13-22`, `admin.routes.ts:91-96` | Account-scoped support history and staff inbox/replies | Keep one support conversation per account and the existing admin handling workflow |
| `server/src/routes/contact.routes.ts:30-39` | Public contact submission is logged, then acknowledged | Do not promise delivery or reuse it as a support ticket until there is a receiving workflow |
| `LoginPage.jsx:99-101`, auth routes | Forgotten password opens email; no reset endpoints exist | Add a dedicated recovery flow |
| Both Prisma User schemas and auth configuration | Local passwords can be absent; no reset model or mail configuration exists | Recovery needs storage and real delivery prerequisites |
| `user.service.ts:275-313` | Existing password changes delete refresh sessions | Extend credential invalidation to existing access tokens and pending reset links |
| `user.service.ts:35-47` | Email changes currently lack reauthentication/verification | Secure recovery-address changes before launching reset delivery |
| `admin-bootstrap.service.ts:64-86` | Configured administrator password is reapplied at startup | Keep operator admin recovery separate from public reset |

The UI must not imply that help publishing, password delivery or contact
receipt works until its full receiving path is verified.

## 1. Help Centre screens and routes

| Route | Access | Screen and primary actions |
| --- | --- | --- |
| `/help` | Public, including signed-out users | Searchable Help Centre, Guest/Host topic filters, common tasks and Contact support |
| `/help/:slug` | Public | Article with breadcrumb, one title, concise steps, related articles and a contextual app action |
| `/help/contact` | Public article using the same article route | Explain support options and account access; show role-appropriate contact actions |
| `/messages` | Existing authenticated customer route | Guest support thread |
| `/host/support` | Host or hosting-intent applicant | Support pane inside HostLayout, using existing `/api/messages` |
| `/admin/messages` | Existing ADMIN route | Staff handling of guest and host support conversations |

Keep `/guides` for Nairobi travel content. Help pages are public even when
their action buttons eventually need authentication. Suspended or locked-out
people must still be able to read account-access guidance and public contact
options. Help itself never grants access to protected account operations.

The initial Help Centre uses a small repository-reviewed EN/SW catalogue.
Each article has a stable slug, audience, topic, translated title/summary,
ordered steps, related slugs and approved internal action destinations.
Render structured content with the app's normal escaping. Avoid a new CMS,
search service or arbitrary HTML input for the first release.

Existing BlogPost publishing has no help/travel distinction. Public guide
detail currently looks up a slug without checking published status
(`blog.service.ts:22-25`, `blog.controller.ts:25-28`). Any later CMS reuse
first needs draft visibility protection and content separation. The initial
static help catalogue avoids depending on that unresolved boundary.

### Initial article catalogue

| Slug / audience | Required content | Contextual destination |
| --- | --- | --- |
| `finding-a-stay`, guest | Search, dates, guests, listed prices and checkout breakdown | `/stays` |
| `booking-and-payment`, guest | Pending versus confirmed versus conflicted payment; safe provider troubleshooting | `/bookings` or an owned booking detail |
| `arrival-and-host-messages`, guest | Arrival instructions and contacting the host | Owned booking detail; `/inbox` |
| `cancellations-and-refunds`, guest | Explain current policy and refund status without promising a date | Owned booking detail |
| `identity-and-disputes`, guest | Verification steps, review state, raising a booking dispute | `/verify-identity`, including its disputes section |
| `reviews-and-saved-stays`, guest | Eligibility, existing review composer and saved lists | Correct composer after NAV-02/NAV-06 fixes; `/favourites` |
| `host-application`, host/applicant | Draft, submitted, changes requested and approval; workspace versus publication eligibility | `/host/application` |
| `listing-review`, host | Prepare, preview, submit, revise and publish a listing | `/host/listings` |
| `calendar-and-reservations`, host | Blocks, external-feed sync status and reservation management | `/host/calendar`, `/host/reservations` |
| `host-messages-and-arrival`, host | Guest inbox, arrival instructions and platform support distinction | `/host/inbox`; owned listing arrival guide |
| `earnings-and-payouts`, host | Recorded earnings, available balance, payout destination and transfer status | `/host/earnings`, `/host/payouts`, `/host/settings` |
| `account-access`, everyone | Password recovery, Google sign-in, locked accounts and reporting compromise | `/forgot-password`, `/login` |
| `privacy-and-safety`, everyone | Privacy/cookies, account safety and reporting concerns | `/privacy`, `/help/contact` |
| `contact`, everyone | Available channels, information to provide and information never to send | Role-aware actions below |

Article instructions must reflect actual app behavior and current policy.
Review existing 24/7 support and 24-hour response claims before repeating
them; do not invent availability, emergency service or refund guarantees.
Payment/identity guidance explains how to reach protected controls rather
than asking for credentials, card details or identity documents in chat.

### Contact and navigation behavior

- Signed-out: read account-access articles without signing in. Contact can
  offer the configured support email and sign-in to the support thread.
  Verify that the mailbox is monitored before publishing it. Recovery cannot
  depend on access to a signed-in support page.
- Guest: Contact support opens `/messages`.
- Host/applicant: Contact platform support opens `/host/support`; Message
  guests remains `/host/inbox`.
- ADMIN: Open support queue goes to `/admin/messages`; avoid creating a
  customer thread for staff by default.
- A booking/listing-specific action uses an owned selected record. Without
  one, open its index/selector; never construct an undefined ID URL.
- Preserve a validated internal return destination through login. This
  depends on NAV-01 in the navigation audit.
- Add Help Centre to footer, auth shell, guest account/navigation and host
  account menu. Link Trust/payment troubleshooting to relevant articles
  without replacing existing transactional controls.

Reuse the account-scoped Message service and composer. Extract only the
support pane if needed, so host support does not inherit the guest sidebar.
Staff notifications should describe a customer/support request accurately
when the sender is a host, rather than always calling the sender a guest.

### Help Centre states and accessibility

| State | Required behavior |
| --- | --- |
| Search has results | Locally filter reviewed article titles, summaries and keywords; announce result count |
| Search has no results | Keep the query, show Clear search, topic browsing and Contact support |
| Unknown/removed article | Useful Not Found state with Help Centre, relevant topics and contact links; HTTP status should agree |
| Article chunk/network fails | Retry with a connection message; distinguish this from an empty catalogue |
| Support thread load fails | Show Retry without inventing an empty thread |
| Support send fails | Preserve typed text and staged files, allow retry, prevent repeated submission |
| Session expires | Ask for sign-in and preserve the safe return destination; avoid saving sensitive support text in public URL/storage |
| Narrow screen / keyboard | Labeled search, clear focus, semantic headings/links, usable controls, no horizontal overflow |

Use one H1 per article, ordered task steps, visible labels and descriptive
actions. Keep search text local by default; do not put private details into
public help URLs, analytics or article data. Review security/payment help
in both languages instead of relying on automatic translation.

## 2. Password recovery screens and routes

The security baseline follows OWASP's recommendations for indistinguishable
request responses, securely stored random expiring tokens, bounded requests,
password confirmation, normal sign-in after reset and session invalidation.
OWASP also warns against building reset links from request Host headers.
See the [OWASP Forgot Password Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
Specific durations, thresholds, fragment delivery and account policies below
are proposed project decisions, not values mandated by that source.

| Route | Contract / screen |
| --- | --- |
| `/forgot-password` | Public email field, recovery explanation, Send instructions, Google sign-in guidance and Help Centre |
| `/reset-password#token=...` | Public new-password and confirmation form; capture token once into memory, immediately remove fragment |
| `POST /api/auth/password-reset/request` | `{email}`; generic 202 after durable intake for every syntactically valid address |
| `POST /api/auth/password-reset/complete` | `{token,newPassword,confirmPassword}`; validate, atomically consume and update credentials |
| `/login` | Destination after success; no automatic login or new session from the reset endpoint |

Suggested request response: If this account is eligible, we will send
password reset instructions. Use the same status/body for known, unknown,
Google-only, suspended, deleted and administrator addresses. Keep timing
within a consistent envelope through asynchronous intake; do not exit early
for unknown accounts in a way that discloses existence.

Never include account IDs, passwords or tokens in returnUrl. Reuse a
minimal variant of existing auth controls and styles, with no third-party
assets, analytics or unrelated prompts on the reset page. A captured token
stays in memory; reopening the original email link is the recovery path if
the cleaned page is reloaded. GETs and mail scanners never consume tokens.

### Proposed security design

1. Generate 32 cryptographically random bytes and encode base64url. Store
   only SHA-256(token) in PasswordResetToken, bound to the user, credential
   version and recovery address. Suggested lifetime: 30 minutes.
2. Store id, userId, unique tokenHash, credentialVersion, address binding,
   createdAt, expiresAt and consumedAt. Index user/expiry and cascade on
   account erasure. Add equivalent SQLite/PostgreSQL schema definitions.
3. Allow a bounded number of unexpired requests, proposed maximum three per
   account. Requesting a new link does not invalidate an earlier usable
   link or lock the account. Successful reset invalidates every other link.
4. Validate token shape and the shared password policy before costly
   hashing. Reuse bcrypt cost 12. Preserve the app's current requirements
   and add a consistent explicit bcrypt byte limit across all password
   entry points so long Unicode input cannot be silently truncated.
5. In one transaction, recheck account eligibility/address/expiry/version,
   conditionally claim an unused token, compare-and-increment the user's
   credential version, write the hash, revoke all refresh sessions and
   invalidate all reset tokens. A failure rolls the entire transaction back.
6. Concurrent completions, including different outstanding tokens, must
   allow only one password change for the captured credential version.
7. Clear the browser's refresh cookie and in-memory access token after
   success; redirect to ordinary login. Send a separate completion notice
   containing no password or reset token.

Do not change credentials or revoke sessions merely because a reset was
requested. Token validation does not authorize role changes, suspension
removal, Google unlinking or payout changes.

### Immediate session invalidation prerequisite

Current refresh-session deletion leaves already issued access JWTs usable
until expiry, default 15 minutes (`config/env.ts:13`). The auth middleware
checks account status and role, but no credential version.

Add User.credentialVersion, include it in access tokens, compare it in the
existing account lookup, and increment it for recovery and other credential
changes. Update every issuance path, including refresh and grace reuse.
Existing tokens without a version require sign-in after rollout. Coordinate
reset with refresh-session creation so a racing refresh cannot leave a
usable post-reset session. Test this against the real database.

Apply reset-token invalidation and version updates consistently to
authenticated password changes, administrator replacement, email changes,
bootstrap credential changes and erasure. Existing role/ownership checks
remain authoritative.

### Account eligibility and address ownership

| Account | Request/completion policy |
| --- | --- |
| Active guest/host with local password | Recover through the established mailbox |
| Google-only | Generic response; no local-password reset token and no implicit creation of a password; explain Google sign-in in public help |
| Google-linked with local password | Reset local password while preserving Google linkage |
| Suspended/deleted | Generic response; no token; completion rechecks state and cannot restore access |
| ADMIN | Excluded from public reset initially; operator rotates configured ADMIN_PASSWORD through documented deployment recovery |
| Unknown address | Same response and suppression behavior; no credential record created |

Before recovery launch, protect email changes with reauthentication and
verification, invalidate stale reset links, and notify the established
mailbox. Do not trust a recently changed address as independent evidence
after suspected account compromise. A successful reset proves control of
the addressed mailbox; it does not by itself resolve a hijacked email
change. Lost-mailbox cases need a documented, independently verified
support procedure. Support must not replace passwords based only on an
email or chat assertion.

### Delivery, token handling and abuse controls

- Select a transactional email provider and verified sender domain, with
  deployment secrets and delivery/bounce monitoring. No mail integration
  currently exists. Obtain approval before adding any package.
- Keep the delivery boundary provider-neutral. Existing fetch can call a
  provider HTTPS API without an SDK dependency.
- Configure an explicit trusted HTTPS recovery origin. Do not derive it
  from Host/forwarded headers or the fallback in clientUrlForRequest.
- Persist a bounded outbox alongside token issuance. Encrypt any temporary
  token-bearing outbox payload with a dedicated purpose-specific key;
  keep the token table hash-only. Remove sensitive payload on delivery or
  expiry. Use bounded retries, timeouts and provider idempotency keys.
- Disable link tracking/rewrite features for recovery emails. Verify that
  supported mail clients preserve fragment links before rollout.
- Acknowledge only durable intake. If intake is globally unavailable,
  return the same generic 503 before an account-dependent decision.
  Per-recipient delivery failures remain operationally monitored and must
  not reveal account existence through the public request response.
- Starting request limits: five per IP per 15 minutes, three deliveries per
  normalized address per hour, 60-second address cooldown. These are tunable
  proposals. Address suppression still returns generic 202 and applies to
  nonexistent addresses too. Use bounded, expiring address-hash keys.
- Use separate completion attempt limits and shared enforcement across
  replicas. Do not lock the user account due to recovery requests.
- Never log tokens, passwords, reset URLs or message bodies. Audit security
  events using bounded metadata and correlation IDs only.
- Set no-store and no-referrer on recovery responses; exclude the reset
  page and recovery data from proxy/PWA caches and indexing. Workbox's
  navigation fallback must not override the recovery cache rule.

### Recovery states and user messages

| State | Required outcome |
| --- | --- |
| Invalid email syntax | Inline correction before request; preserve input |
| Request accepted/suppressed | Same generic confirmation; suggest checking mail and waiting before retry |
| Global delivery/intake unavailable | Generic temporary-unavailability message and retry; no false promise that an email was sent |
| IP request throttled | Clear wait/retry instruction, without account-state disclosure |
| Missing/malformed/expired/used link | One neutral invalid-or-expired message and Request a new link |
| Password weak or confirmation differs | Actionable validation; unexpired token remains usable |
| Network/transaction failure | No partial password change; allow safe retry; never echo token/password |
| Success | Password changed; sign in again; other sessions signed out |
| Unexpected reset/compromised mailbox | Public Help Centre and monitored reporting channel, with a verified recovery procedure |

## 3. Affected files and proposed additions

| Area | Existing files / proposed additions |
| --- | --- |
| Guest/public routing | `src/App.jsx`; new HelpCentrePage, HelpArticlePage, ForgotPasswordPage and ResetPasswordPage |
| Host support | `src/WorkspaceRoutes.jsx`, HostLayout, a small HostSupportPage, reusable support pane from MessagesPage |
| Entry links | GuestDiscovery, AuthShell, Navbar, HostLayout, LoginPage, TrustPage and payment troubleshooting |
| Copy and titles | Existing domain translations, new reviewed help/recovery entries and catalogue, `src/utils/pageTitle.js` |
| Auth API | Existing auth routes/controller/service, types and rateLimiter; focused recovery service |
| Delivery | New provider-neutral mail adapter and bounded outbox worker, environment validation and deployment documentation |
| Credentials | JWT types/issuance, auth middleware, user password/email handlers, admin bootstrap and account erasure |
| Storage | Both Prisma schemas and matching migration for reset tokens, delivery outbox and credential version |
| Production/PWA | SEO route classification, robots, sensitive response headers and `vite.config.js` cache rules |
| Styling | Existing `src/styles.css`, Tailwind and Flowbite only; no additional stylesheet |

The new routes above are proposed, not currently created. Mail provider,
sender domain, recovery origin and supported operator procedure are launch
prerequisites. No provider/dependency choice or external service setup is
performed by this specification.

## 4. Acceptance and implementation order

| Check | Acceptance result |
| --- | --- |
| Help links across anonymous/USER/applicant/HOST/ADMIN | Named destinations and role-appropriate support; no access escalation |
| EN/SW, desktop/mobile and keyboard | Clear search, 0/1/many results, article navigation, focus and readable layout |
| Unknown articles and failed loads | Useful distinct not-found/error states and contact paths |
| Support send/reply | Guest and host requests arrive in admin inbox; replies return to the right account; failed sends preserve drafts |
| Known/unknown/ineligible reset requests | Same response/body and comparable timing; bounded suppression |
| Email and account-state changes during recovery | Stale eligibility/address/version cannot complete |
| Tampered/expired/consumed token | No credential or session changes; neutral rejection |
| Concurrent reset submissions and refresh races | Exactly one reset and no usable old sessions |
| Database failure during completion | Transaction rollback leaves no partial password/session/token change |
| Mail failure/restart/bounce | Durable bounded handling; no expired links or leaked payloads |
| Password validation and successful reset | Existing password policy enforced; old password fails, new password works; no automatic login |
| Old access and refresh tokens | Rejected after reset, including another browser/device |
| Host/forwarded-header manipulation | Email URL remains on configured trusted HTTPS origin |
| GET prefetch/link scanners | No consumption or account mutation |
| Browser history/log/cache inspection | No reset credential in request URLs, analytics, logs, history or cached data |
| SQLite/PostgreSQL | Schema parity and real transaction/concurrency tests |

Suggested implementation sequence, after authorization:

1. Ship public reviewed Help Centre content and correct help entry links.
2. Reuse the support pane inside host navigation and verify staff receipt.
3. Establish delivery, trusted origin, email-change protection and credential
   version/session invalidation prerequisites.
4. Add reset storage/transaction/outbox and endpoints with behavioral tests.
5. Add recovery forms and deep-link/cache handling; test sandbox delivery,
   privacy, abuse, concurrency and desktop/mobile flows.

Run existing lint/build and server checks after implementation, plus
focused integration tests above. No functional tests, provider calls or
email sends were performed for this specification; verification here was
source tracing, contract review and current primary-source guidance.
