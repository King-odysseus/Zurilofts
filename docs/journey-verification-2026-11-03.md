# Guest and host journey verification

Date: 2026-11-03. Scope: guest booking and messaging, host publishing,
calendar, reservations, messaging and payouts, driven in a real browser at
desktop (1440x1000) and mobile (390x900) widths. No application code was
changed for this step.

## Method and boundaries

The application ran locally against a disposable SQLite database created in
the OS temporary directory and deleted afterwards. Payment, media, mail,
search and push providers were left unconfigured, so no external service was
contacted. Outbound browser requests to anything but 127.0.0.1/localhost were
blocked, and the server-side fetch was wrapped the same way. Synthetic
accounts, listings and a confirmed booking were seeded directly; no real
person, stay or money was involved.

Two layers were exercised:

- API-level journey checks (23 assertions) covering booking creation and the
  identity gate, listing draft/submit/approve, calendar block and unblock,
  guest and host conversation posting, earnings and payout eligibility and
  payout failure handling.
- Browser journeys at both widths, asserting visible controls and persisted
  state rather than only HTTP status.

Reproduction assets are local scratch work and are ignored by git:
`server/.tmp-journey-server.mjs` plus `.kai/tmp/*journey*.mjs`,
`.kai/tmp/checkout-audit.mjs`, `.kai/tmp/publish-audit2.mjs` and their JSON
reports and screenshots.

## What passed

| Journey | Desktop | Mobile | Evidence |
| --- | --- | --- | --- |
| Guest sign-in and session restore | Pass | Pass | reached `/` after login; refresh cookie reused across reloads |
| Stay detail, variant and price | Pass | Pass | title and checkout action rendered |
| Checkout stage 1: dates | Pass | Pass | December 2026 fully selectable, past days disabled |
| Checkout stage 2: details | Pass | Pass | guest form filled, duplicate guest removed |
| Booking creation under the identity gate | Pass | Pass | `201`, `requiresIdentityVerification: true`, `paymentUrl: null` |
| Checkout stage 3: add-ons and payment | Pass | Pass | pay button read "Pay KES 14,934" |
| Paying while unverified | Pass | Pass | redirected to `/verify-identity` with the verification form |
| Booking hold visible afterwards | Pass | Pass | stay appeared in `/trips` after the hold |
| Booking detail and invoice | Pass | Pass | PDF download offered and produced a `.pdf` file |
| Message host from a booking | Pass | Pass | conversation opened, message persisted |
| Message send failure | Pass | Pass | `503` kept the typed text and showed a failure notice |
| Support thread | Pass | Pass | message persisted in the thread |
| 16 host surfaces on one session | Pass | Pass | Today, listings, editor, preview, calendar, inbox, reservations, reservation detail, earnings, payouts, discounts, settings, verification, insights, application |
| Host session integrity | Pass | Pass | no redirect to `/login`, no page errors, no horizontal overflow on any host route |
| Reservation to guest conversation | Pass | Pass | opened `/host/inbox/:id`, message sent |
| Payout provider outage | Pass | Pass | retry offered, no internal error text leaked to the host |
| Create a draft listing | Pass | n/a | `201`, draft appeared in the listings grid |
| Submit a complete draft for review | Desktop | n/a | `200`; card moved to "In review" with "Submitted for review. Changes stay private until it is approved." |
| Submit an incomplete draft | Desktop | n/a | `400` with the server's reason surfaced as a toast |
| Edit a listing under review | Desktop | n/a | refused `400` with "This listing is awaiting admin review and cannot be edited until that review completes." |
| Applicant without approval | Desktop | n/a | no submit action offered on `/host/listings` |

No JavaScript page error occurred in any guest or host journey on either
width.

## Confirmed defects

### J-01: P2 - The push-permission prompt covers the message send button

Files: `src/components/PushNotificationPrompt.jsx:36`,
`src/App.jsx:152`, `src/i18n/domains/discovery.js:168`.

The prompt is a fixed overlay that appears on every signed-in surface. Its
card fully covers the 36x36 send button of the message composer at both
tested widths, so a guest cannot send a message until the prompt is
dismissed. Clicking the send button timed out in six separate attempts
before the prompt was closed and succeeded immediately afterwards, which
isolates the cause to the overlay rather than the composer.

The same prompt also greets guests with host-only wording: "Get a
notification when a booking is confirmed, when a guest messages you, or when
we reach a decision on one of your listings." A guest never has listings, and
the copy repeats on mobile where it covers the whole composer.

Proposed fix: keep the prompt clear of page controls (reserve space or anchor
it above the composer and the mobile tab bar), and select the audience copy
from the account's role or workspace. Acceptance: the send button is
clickable while the prompt is showing at 390 and 1440; guest, host and admin
accounts each read wording that matches their own account.

### J-02: P2 - The bank list returns a server error when the provider is unavailable

Files: `server/src/controllers/payment.controller.ts:58-66`,
`server/src/config/paystack.ts`; consumed by `src/pages/HostApplicationPage.jsx:194`,
`src/pages/HostSettingsPage.jsx:108`, `src/pages/ProfilePage.jsx:235`.

With the payment provider unreachable, `GET /api/payments/banks` answered
`500` on the host application page (twice per load) and, by the same code
path, on host settings and the guest profile payout form. A provider outage
is expected operationally, so it should not surface as an unhandled server
error. The screens did keep working, but the payout account form had no bank
options and no explanation.

Proposed fix: return a controlled unavailable state (for example `503` with a
stable code) and have the three consumers show "Bank list temporarily
unavailable, retry" instead of an empty dropdown. Acceptance: with the
provider blocked, the form explains the state and offers retry; with the
provider available, banks populate as today.

### J-03: P3 - Host calendar browser title still says "Property calendar"

Files: `src/utils/titles.js:41` (`title.hostPropertyCalendar`).

Verified live: `/host/calendar/:id` returns `Property calendar | ZuriLofts
Host`. The page heading itself already says "Calendar", so the browser tab is
the only place the old word survives on this screen. Covered by the
terminology plan as `Listing calendar`.

### J-04: P3 - A listing under review still offers "Edit listing"

Files: `src/pages/HostListingsPage.jsx:187,191-192`.

Once submitted, the card shows the "In review" pill and "Awaiting review",
but the primary button still reads "Edit listing" and opens the editor. The
first save is then refused with a clear, correct message. The guard works;
only the promise of the button is wrong. Proposed fix: label it "View
listing" while under review, or open a read-only view. Acceptance: no control
on an under-review card implies an edit that cannot be saved.

### J-05: Verification gap - calendar blocking was checked by API, not by mouse

The host calendar day cells expose no date-based accessible name in the
rendered grid, so the browser script could not address a specific night. The
block and unblock operations passed at API level (23 of 23 API assertions),
and the calendar screen loaded with no errors, but the point-and-click path
for a host was not driven this session. This is a test-coverage gap, not a
confirmed defect; the day cells should also carry an accessible name that
includes the date.

## Not verified in this step

- Real Paystack checkout, callback and transfer webhooks (providers
  disabled; covered only by mocked tests in the security audit).
- A public ICS calendar import against a real feed.
- Actual push permission grant, delivery and click-through.
- Email delivery, because no mail provider is configured.
- Real devices, throttled networks and long sessions.
- Performance and load behaviour.

## How to reproduce

1. `cd server && node --import tsx .tmp-journey-server.mjs` (prints the local
   URL and writes `.kai/tmp/journey-environment.json`).
2. Run the journey scripts from the repository root:
   `node .kai/tmp/checkout-audit.mjs`, `node .kai/tmp/host-journey-audit2.mjs`,
   `node .kai/tmp/publish-audit2.mjs`.
3. Send `stop` to the server process to close it and delete the disposable
   database.

Only run these with the providers blank. The scripts abort if the base URL is
not localhost.
