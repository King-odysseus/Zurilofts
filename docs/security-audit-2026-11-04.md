# Security review, 2026-11-04

Second full pass over the API and the SPA. It follows the 2026-11-03 review, which
already closed calendar-feed SSRF, message-attachment privacy, Google sign-in state,
payout replay and upload validation. This pass attacked sessions, per-route
authorization, input handling and abuse controls, and read the real code path behind
every item below. Nothing here is inferred from a route name alone.

Severity:

- P1: an anonymous visitor can read secrets, or take over an account.
- P2: privilege, ownership or money integrity, with at least one precondition.
- P3: abuse, cost, or conditional exposure.
- P4: hardening.

## Summary

| # | Severity | Area | Status |
|---|----------|------|--------|
| 1 | P1 | Public property reads returned the host's private arrival guide and iCal token | Fixed |
| 2 | P1 | `/api/properties/bulk` and discovery surfaces returned unpublished listings | Fixed |
| 3 | P2 | Hosts could set the admin-only `featured` flag and other ops columns on their own listing | Fixed |
| 4 | P3 | Contact form allowed log injection and unbounded log lines | Fixed |
| 5 | P3 | Translation endpoint had no per-string or total length cap | Fixed |
| 6 | P4 | Identity spread before the request body in booking and review controllers | Fixed |
| 7 | P2 | Google sign-in links to an existing account by email with no verification check | Fixed |
| 8 | P3 | Chat read endpoint is unauthenticated; the session id is the only capability | Open |
| 9 | P3 | Request host header drives canonical URLs and the sitemap | Fixed |
| 10 | P3 | Push subscription can be reassigned to another account | Fixed |
| 11 | P4 | Admin "edit any property" branch is unreachable, so `featured` has no admin path | Open |
| 12 | P4 | Legacy bank endpoint lets the body override `payoutMethod` | Fixed |
| 13 | P4 | Hand-rolled HTML sanitiser | Open, accepted |

## Fixed in this pass

### 1. P1: every public property read leaked the arrival guide and the iCal token

The property detail endpoint carried a comment claiming its `select` was the public
boundary. It was an `include`, and the list, bulk, similar and recommendation queries
passed the whole row to `normalizeProperty`, which only reshaped JSON columns. So
`GET /api/properties` (no auth) returned, for every published listing:

- `wifiPassword` and `wifiNetwork`
- `checkInMethod` (for example a lockbox code)
- `houseManual` and `directions` (how to find the property and get in)
- `icalToken`, which grants read access to `/properties/:id/calendar/:token.ics`
- `listingReviewNote`, `listingReviewedBy`, `listingReviewedAt`

Impact: a visitor could collect Wi-Fi passwords and entry instructions for every live
listing without booking or paying, and could poll private availability feeds. This is
a physical-access and revenue problem, not just a data-hygiene one.

Fix: `server/src/utils/propertyPrivacy.ts` defines `PRIVATE_PROPERTY_FIELDS` and
`toPublicProperty()`. `normalizeProperties()` now strips them, so list, bulk, similar
and recommendation paths are covered in one place. `getProperty()` applies the stripper
only when the viewer is not the owner or an admin, so the host editor and the admin
views still read their own arrival guide. The favourites list applies it too.

Regression test: `server/tests/property.privacy.test.ts`.

### 2. P1: unpublished listings were enumerable through `bulk`, `similar` and recommendations

`getPropertiesByIds` had no status filter, so `GET /api/properties/bulk?ids=a,b,c`
returned DRAFT, PENDING_REVIEW, REJECTED and SUSPENDED rows to anyone who knew an id.
`getSimilarProperties` and the recommendation fallback filtered suspended *hosts* but
never listing status, so drafts could appear on a public stay page.

Fix: `status: 'PUBLISHED'` added to the bulk query, the similar-properties candidate
query and both recommendation queries.

### 3. P2: a host could promote their own listing

`propertyCreateSchema` accepted `featured`, and `propertyUpdateSchema` is its
`.partial()`, so `PUT /api/properties/:id` with `{"featured": true}` set the marketing
flag that puts a stay on the homepage. `buildUpdateData` only stripped `status`, so any
future schema drift would also have exposed `hostId`, `icalToken`, the review trail and
the cached `rating`/`reviews` aggregate.

Fix:

- `featured` removed from the host-facing property schema.
- `server/src/utils/propertyPrivacy.ts` now exports `UNWRITABLE_PROPERTY_FIELDS`
  (`status`, `hostId`, `featured`, `icalToken`, the review trail, `submittedAt`,
  `rating`, `reviews`) and `buildUpdateData` deletes every one of them.

Note for ops: there is no admin endpoint that sets `featured` today, so the flag is
now effectively seed-only. That is the secure default; item 11 covers adding an admin
control.

### 4. P3: contact form log injection and log flooding

`POST /api/contact` is unauthenticated, had no rate limiter and no length caps, and
passed name, email, phone and message straight into `console.log`. A newline in any
field forged additional log lines, and a large body wrote an arbitrarily long line.

Fix: `contactLimiter` (5 per 15 minutes per IP) in `middleware/rateLimiter.ts`, field
caps (120/200/4000/40), control-character stripping, and a type check before reading
`phone`.

### 5. P3: translation endpoint was an underpriced relay to a paid API

`POST /api/translate` is unauthenticated. The schema capped the array at 40 strings but
put no limit on each string, so a request could carry close to the 1 MB body limit, and
the provider bills per character.

Fix: 2000 characters per string and 12000 characters per request, on top of the
existing 60 requests per minute limiter.

### 6. P4: request body could override the authenticated identity

`booking.controller.create` and `review.controller.create` built their input as
`{ userId: req.user!.sub, ...req.body }`, so a body field named `userId` would have won.
This is safe today only because Zod strips unknown keys; reordering means a future
schema change cannot silently turn into an impersonation bug. Both now spread the body
first and set the identity last.

## Open findings

### 7. P2: Google sign-in can be linked to an account the attacker pre-registered

`auth.service.googleAuth` looks up by `googleId`, then by `email`, and links the Google
identity to whatever row it finds. It never checks that Google marked the address as
verified, and registration itself sends no verification email.

Attack: create an account with `victim@example.com` and a password you choose. When the
real owner later signs in with Google, that login is attached to the account you
already control, and your password still works.

Recommended fix: auto-link only when the local account was created through Google, or
send a confirmation email and require the click before linking. Also require email
verification at registration, or at least mark the account unverified and gate
password reset on it.

Acceptance: a Google sign-in for an email that already has a password account creates
no session until the link is confirmed, and a regression test covers both paths.

### 8. P3: unauthenticated chat read

`GET /api/chat/messages?sessionId=` returns the visitor's own messages and the team's
replies for that id, with no authentication. The id is `chat_` plus a UUIDv4, about 122
bits, so it is not guessable and there is no practical takeover here. The session map
is capped at 500 sessions and 100 messages, so the memory concern is already handled.

Recommended fix: treat the session as a capability and sign it (HMAC over id plus
issue time), or move it into an HttpOnly cookie. Return only agent messages to the
browser.

### 9. P3: request host drives canonical URLs, Open Graph tags, JSON-LD and the sitemap

`requestOrigin()` takes the first value of `X-Forwarded-Host` and `seo.service` builds
canonical links, `og:url`, organisation JSON-LD and sitemap entries from it. If the
edge ever forwards a client-supplied value instead of overwriting it, a crawler or a
path-keyed cache can be fed links to an attacker host. The same helper is used for the
login redirect when `CLIENT_URL` is local, which is the open-redirect condition the
2026-11-03 review noted.

Recommended fix: build outbound and crawler URLs from `CLIENT_URL` whenever it is a
real public URL, and treat the request host as display-only. If the header must be
used, take the last value, not the first, and validate it against an allowlist.

### 10. P3: push subscription reassignment

`push.service.subscribe` upserts on `endpoint` and overwrites `userId`, and
`unsubscribe` deletes by `endpoint` without an ownership check. Exploitation needs the
endpoint secret, which is never exposed through the API, so practical risk is low.

Recommended fix: if an endpoint already belongs to another user, delete the old row and
create a new one, or refuse the subscribe. Never silently move a live subscription.

### 11. P4: `featured` has no admin path

`property.controller.update` branches on `req.user!.role === 'ADMIN'`, but the route is
guarded by `requireHostWorkspace`, which deliberately rejects ADMIN. So the admin
branch is dead code, and no endpoint can set `featured` now that hosts cannot.

Recommended fix: add `featured` to the admin review or admin property payload and set it
in the admin service, with an audit entry. Keep it out of every host-facing schema.

### 12. P4: legacy bank endpoint can switch payout method

`user.controller.updateBankDetails` builds `{ payoutMethod: 'bank', ...req.body }`, so
the body wins. It only changes the caller's own destination, so there is no privilege
issue; it just defeats the endpoint's intent.

Recommended fix: spread the body first and set `payoutMethod` last.

### 13. P4: hand-rolled HTML sanitiser (accepted)

`server/src/utils/sanitizeHtml.ts` is an allow-list sanitiser with quote-aware tag
scanning, entity decoding and URL scheme checks. I looked for the usual bypasses
(`<svg/onload>`, unclosed tags, `javascript:` with entities, whitespace and control
characters, `xlink:href`, comments) and did not find one. It is still a hand-written
parser, and the only input it handles today is admin-authored blog and guide HTML.

Recommended: replace it with a maintained sanitiser if blog HTML ever accepts host or
third-party input. Until then, leaving it is reasonable.

## Verified strong, no action

- Refresh-token rotation with hashed storage, reuse detection (`previousHash`) and a
  60 second grace window; refresh cookie is HttpOnly, scoped to the auth path, and
  SameSite=Lax.
- Login and registration anti-enumeration; `loginSchema` restricts roles to USER and
  HOST, so registration cannot ask for ADMIN.
- Password reset: 32 byte token, hashed at rest, single use, expiry, new password
  invalidates existing sessions.
- OAuth state cookie checked on callback; no tokens in the callback URL.
- Paystack webhook signature verified over the raw body; payment initialisation is
  ownership-checked and re-initialised with the chosen channel; prices are always
  computed server-side.
- Booking creation checks overlap inside a transaction with a status filter, and the
  double-booking race is handled by a re-check plus conflict error.
- Payouts run in transactions; balance is derived, not trusted from the client.
- ID documents and selfies are encrypted at rest in the database, served only through
  admin routes, content-sniffed and never written into the publicly served uploads
  folder. Static serving blocks the `msg-` attachment prefix.
- Uploads: multer caps, magic-byte verification, sharp re-encode, server-generated
  filenames, so path traversal and polyglot images are not reachable.
- Helmet with a CSP that has no `unsafe-inline` scripts; HSTS; `trust proxy` set to 1
  so `X-Forwarded-For` cannot be spoofed to dodge a limiter.
- Secrets are validated at boot with minimum lengths and refused in production when
  missing; the error handler never returns a stack in production.
- Admin routes are guarded once at the router level (`authenticate`, `requireAdmin`);
  every `/api/admin` mount goes through that router.

## Still open

Items 7, 9, 10 and 12 were closed in the follow-up commits of this pass. What
remains:

- Chat session id (item 8). The id is `chat_` plus a browser-generated v4 UUID, so
  guessing is not practical; the exposure is that it travels in a query string and
  acts as the only capability. Server-issued, signed ids are the clean fix and keep
  the anonymous widget working.
- Admin control for `featured` plus an audit entry (item 11). Hosts can no longer
  set it, and no admin screen can either, so the flag is effectively seed-only.
- Hand-rolled sanitiser (item 13), accepted for now; revisit before any non-admin
  input reaches blog HTML.

See also `docs/security-audit-round2-2026-11-03.md`, written in parallel: it covers
private conversation files, booking payloads, promo code races, blog drafts, the
sign-in email, upload and checkout rate limits, and a live probe of the attachment
guard.

## How to verify this pass

From `server/`:

```
node --import tsx --test tests/property.privacy.test.ts
PAYSTACK_SECRET_KEY=sk_test_dummy node --import tsx --test tests/*.ts
npx tsc --noEmit
```

The full suite gives 444 pass and 2 fail. Both failures are the `public-url` tests that
need `NODE_ENV=production`; they fail identically before this pass and are unrelated to
it. From the repository root, `npm run lint` and `npm run build` both pass.
