# Security audit, round two: what was attacked and what was fixed

Date: 2026-11-03. Follows `docs/security-audit-2026-11-03.md`, which recorded the
first pass. This pass assumed every earlier finding was closed and attacked the
areas that pass had not covered: authorization on every route, authentication and
session handling, input handling, money integrity and abuse controls.

Each finding below was confirmed by reading the decisive lines, and where a
runtime check was possible it was run before and after the fix. Claims that could
not be confirmed were dropped rather than listed.

## Findings and fixes

### 1. Private conversation attachments were readable without a session (high)

The guard in front of the public `/uploads` directory compared the raw request
path against the `msg-` prefix, while `express.static` decodes the path before it
touches the disk. One encoded character was enough to get past the guard and
still reach the file.

Reproduced with a live server before the fix:

```
404 /uploads/msg-123-secret.pdf          (guard works)
200 /uploads/%6dsg-123-secret.pdf        (guard bypassed, file served)
```

Fixed in `server/src/utils/chatAttachment.ts` (decode every segment, refuse
malformed encoding) and `server/src/app.ts` (pass the whole path, not its last
segment). After the fix the same probe returns 404 for every encoded form while a
listing photo still returns 200. Pinned by new cases in
`server/tests/chat-attachment.test.ts`.

### 2. A booking handed back the door codes before it was paid for (high)

Booking responses include the whole property row. Anyone signed in could create
a PENDING booking on any published listing, read the response, and receive the
check-in method, directions, house manual, Wi-Fi password and the host's iCal
token. Cancelling the booking returned the same row again.

Reproduced by inspection of `createBooking`, `getBooking`, `listUserBookings` and
`cancelBooking`. Fixed by `propertyForBookingViewer` in
`server/src/utils/propertyPrivacy.ts`: the arrival guide and the calendar token
are shown only to the host who owns the listing, to an admin, or to the guest
once the booking is CONFIRMED. Pinned by three new cases in
`server/tests/property.privacy.test.ts`.

### 3. Paying again on a conflicted booking (medium)

`POST /api/bookings/:id/payment` refused CONFIRMED and CANCELLED bookings but not
CONFLICT, which is the state for money that arrived after the nights were taken.
Re-initialising replaced the Paystack reference that reconciliation and the
refund depend on, and charged the guest a second time. Now answered with a 409
that tells the guest the payment is with the team and they will not be charged
again.

### 4. A limited promo code could be used more times than allowed (low)

The usage limit was checked before the booking transaction and the counter was
incremented inside it, so two checkouts racing for the last use both passed the
check. The increment is now a conditional update inside the transaction; a zero
match means the last use went to somebody else and the booking is refused rather
than keeping a discount the code never had room for.

### 5. Unpublished blog drafts were readable at their public address (medium)

The public slug lookup did not filter on `published`, so a draft was readable by
anyone with the link. The public controller now asks for a published post only,
and the admin path is unchanged.

### 6. Changing the sign-in email from an open session (medium)

The profile update accepted a new email with no password and no verification,
which turns a borrowed or stolen session into a permanent takeover: change the
address, request a reset, own the account. The address is now fixed on that
endpoint and the profile screen shows it read-only with a note to contact
support. A genuine change is a support task until email verification exists.

### 7. Any signed-in account could silence another person's notifications (low)

Unsubscribing deleted by push endpoint alone. It is now scoped to the caller, so
the row must belong to the account making the request. Subscribing on the same
endpoint now removes the previous owner's row instead of reassigning it, so a
shared browser carries nothing from the account before it.

### 8. Google sign-in could take over a password account (high)

Registration never proves the person owns the mailbox, so an attacker could
register a stranger's address with a password and wait. The next Google sign-in
by the real owner found the account by email and attached the Google id to it,
leaving the attacker holding a working password. `googleLinkDecision` now refuses
that link (and refuses to re-point an address already linked to another Google
account), while a passwordless account is still linked. A Google address Google
has not verified is refused outright. Pinned by `server/tests/google-link.test.ts`.

### 9. The Host header could rewrite the site's canonical address (medium)

`robots.txt`, `sitemap.xml` and the canonical and Open Graph tags were built from
whatever Host header the request carried, so one request could declare the site
lives somewhere else and poison a shared cache. `publicOriginForCrawlers` now
uses the configured `CLIENT_URL` whenever it is a real public address and falls
back to the request only when it is local or missing.

### 10. Expensive or money-moving endpoints had no rate limit (low)

Checkout writes (create, payment, cancel), image and attachment uploads, and
message sends on the support inbox, booking conversations and disputes were
unlimited. Added `bookingWriteLimiter` (20 per 15 minutes) and `uploadLimiter`
(60 per hour), and reused the existing chat limiter for the message routes.

## Verification

- `npx tsc --noEmit` in `server/`: clean.
- Server suite run the way CI runs it (production mode plus fixture secrets; the
  command is in `.github/workflows/ci.yml`): 455 of 455 pass, 14 of them new.
- The same suite with no environment overrides reports 2 failures, both in
  `public-url`. Those cases describe the production host fallback, and the env
  validator refuses to boot in production without real-shaped secrets, so that
  branch is only reachable with the CI environment. They fail the same way on the
  commit before this pass; with no overrides the count is 453 passing.
- `npm run lint`: clean.
- `npm run build`: succeeds.
- Live probe of the upload guard before and after the fix, described above.

## Not changed, worth knowing

- Accounts with no password (Google sign-up) still cannot change their address
  through support unless they first set a password; there is no email reset
  delivery configured yet, so verification of a new address is manual.
- The site-wide focus-ring reset noted in the first audit still applies.
- Message attachments remain stored as public Cloudinary objects; only the
  serving route is private, so a direct object URL would still work if one were
  known. Moving them to private storage needs the Cloudinary account owner.
