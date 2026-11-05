# Reliability audit, 5 November 2026

Read-only review of failure behaviour: what breaks quietly, what hangs forever, what reports success after failing. No code was changed.

Scope: `server/src` (Express, TypeScript, Prisma) and `src` (React). Complements `docs/privacy-audit-2026-11-05.md` and `docs/kenya-compliance-actions-2026-11-04.md`, which cover data handling rather than failure handling.

Verification: the full server suite was run (`npx tsx --test tests/*.test.ts`). 516 tests, 506 pass, 10 fail. Every failure is in `paystack.*` and the production `env` tests, and each of those files passes when run alone, so the failures come from the test files sharing one process rather than from a broken assertion. Nothing below was reproduced against a live database or a real payment provider; every claim is read from the code.

Ranked by blast radius: money first, then failures that look like success, then hangs, then diagnostics.

---

## A. Money can move twice

### A1. A transfer timeout is treated as "the transfer never happened"

- Where: `server/src/services/payout.service.ts:294-306`, reference created at `:272`
- Trigger: `initiateTransfer` throws for any reason, including a socket timeout or a lost response after Paystack already accepted the transfer.
- Current behaviour: the `catch` calls `settleFailedTransfer(transferRef, 'FAILED', ...)`, which marks the payout FAILED and puts the full amount back into the host wallet. A thrown error cannot distinguish "Paystack refused" from "Paystack paid but I never heard back". The reference is generated fresh on every attempt (`zrlft-pay-${randomUUID}`) and no `Idempotency-Key` header is sent, so a later run quotes a new reference and pays again.
- Result: the host is paid by Paystack and holds a restored wallet balance. The next sweep pays the same money a second time. Nothing reconciles `PENDING` payouts against the provider, so this is never noticed.
- Expected: treat an unknown outcome as unknown. On a timeout, leave the payout `PENDING` and verify the reference with the provider before deciding; only reverse on a definite refusal.
- Smallest fix: split the catch into "provider returned an error response" (safe to reverse) and "no response" (mark `PENDING`, reconcile later). This needs a reconciliation step, not just a code branch.

### A2. `transfer.failed` after `transfer.success` credits the host a second time

- Where: `server/src/services/payout.service.ts:387-409`, settled set at `server/src/utils/payoutTransitions.ts:16`
- Trigger: Paystack delivers `transfer.success`, then a delayed or replayed `transfer.failed` for the same reference. Transfer notices are at-least-once and are not ordered.
- Current behaviour: `SETTLED_PAYOUT_STATUSES` is `['FAILED', 'REVERSED']`. `SUCCESS` is not settled, so the pre-check at `:391` and the conditional write at `:395` both allow `SUCCESS -> FAILED`, and `:400-406` increments the wallet by the full payout amount.
- Result: the host has the money and the wallet says they do not. Every subsequent payout is inflated by that amount.
- Expected: `SUCCESS` is terminal for the failure direction. A "failed" notice against a payout that already succeeded is a contradiction to record and escalate, not to apply. A reversal of money genuinely returned by the provider is a separate event type (`transfer.reversed`).
- Smallest fix: give `settleFailedTransfer` an explicit allowed-source-state argument, and never let `FAILED` be reachable from `SUCCESS`. `canMarkTransferSucceeded` in `payoutTransitions.ts` already models the transition table; the failure direction needs the mirror of it.
- Why the tests did not catch it: `server/tests/payout.transitions.test.ts:39` applies `status = notice === 'failed' ? 'FAILED' : 'REVERSED'` unconditionally inside its simulator, so the test reimplements the bug instead of asserting around it. No case covers `['success', 'failed']`.

### A3. The `PROCESSING` write can overwrite a webhook that already settled the payout

- Where: `server/src/services/payout.service.ts:308-311`
- Trigger: the `transfer.success` webhook arrives between `initiateTransfer` returning (`:296`) and the status write at `:308`.
- Current behaviour: `prisma.payout.update({ where: { id }, data: { status: 'PROCESSING' } })` has no status filter. It forces `PROCESSING` over a `SUCCESS` that the webhook just wrote.
- Result: the payout is now live again. A later `transfer.failed` or `transfer.reversed` passes the guard in A2 and restores the balance, so the host is paid twice. This is every other status write in the file being conditional and this one not.
- Expected: `updateMany({ where: { id, status: 'PENDING' } })` and treat `count === 0` as "a webhook already settled this, leave it alone".
- Note: the booking-link loop at `:314-322` and the wallet write at `:326-332` then also run against a settled payout. Those writes are harmless, but the loop uses one `create` per booking with no compensating step, so a throw halfway leaves the payout recorded with fewer linked bookings than it paid for.

### A4. A double cancel debits the host's earnings twice

- Where: `server/src/services/booking.service.ts:1193-1198` (guards), `:1216-1267` (transaction), write at `:1242`
- Trigger: two cancellations of the same booking in flight at once, which a double-click on the cancel button produces, or a guest and an admin acting together.
- Current behaviour: the state checks read a snapshot before the transaction opens. The write inside the transaction is `tx.booking.update({ where: { id: bookingId } })` with no `status` filter, so both calls pass the guards and both execute the wallet debit at `:1232-1235`.
- Result: `balance` and `totalEarned` are decremented twice for one stay, so the host later receives less than they earned.
- Expected: the second call finds nothing to cancel. `updateMany` with `status: { in: ['PENDING', 'CONFIRMED'] }` in the `where`, and abort the transaction when `count === 0`.
- Related: `wasPaid` at `:1209` and `hostFundsReleasedAt` at `:1222` both come from that same pre-transaction snapshot. If funds are released between the read and the transaction, the reversal is skipped and the host keeps money for a cancelled stay. Reading the row again inside the transaction closes both.

### A5. The stale-booking sweep can cancel a booking that has just been paid

- Where: `server/src/services/booking.service.ts:1525-1528`, candidates read at `:1492-1516`
- Trigger: a `charge.success` webhook confirms the booking after the candidate list is read and after the `PaymentLog` safety rail is checked, but before the update.
- Current behaviour: the read filters on `status: 'PENDING'` and `paidAt: null`; the write filters only on `id: { in: idsToCancel }`.
- Result: a paid booking is flipped to `CANCELLED`. The update sets no `refundStatus`, no `cancelledAt` and no cancelled-by, and the admin refund queue queries `refundStatus = 'REFUND_PENDING'`, so the guest's money is held with nothing in the queue to release it.
- Expected: the write carries the same conditions as the read. `updateMany({ where: { id: { in: idsToCancel }, status: 'PENDING', paidAt: null }, data: { status: 'CANCELLED' } })`, then act on `count`.
- Note: the second safety rail at `:1504-1516` searches for a `charge.success` payment log. `payment.service.ts:425-432` writes that log before the payment is actually verified, so a payment that later fails verification also immunises a booking against this sweep. That fails safe, but it means the rail is not proof of payment.

---

## B. Failures that look like success

### B1. The health check never touches the database

- Where: `server/src/app.ts:141-147`
- Trigger: database down, pool exhausted, uploads directory unwritable, every scheduler throwing.
- Current behaviour: the handler returns `status: 'ok'` with `process.uptime()` and nothing else. It is the only health route in the codebase.
- Result: Railway keeps sending traffic to a server that cannot serve it, and a dead deployment never rolls back. Uptime monitoring reports 100 percent through a total outage.
- Expected: the check answers only when a trivial query succeeds, and reports a `degraded` or `unhealthy` status otherwise.
- Smallest fix: `await prisma.$queryRaw\`SELECT 1\`` with a short timeout, and a non-200 status on failure. A slow dependency should answer 503 so the platform takes it out of rotation rather than piling requests on it.

### B2. Startup validates configuration but never reachability

- Where: `server/src/index.ts:73`, `server/src/config/prisma.ts:3`, `server/src/config/env.ts:10`
- Detail: the Prisma client is a correct singleton created at import, but nothing awaits `$connect`, and the only boot-time database touch is `syncConfiguredAdmin().catch(...)` at `:77`, which is fire-and-forget. `env.ts` validates that `DATABASE_URL` is a non-empty string, not that it works.
- Result: a bad database URL or a stopped database produces a server that boots cleanly, passes its health check, and answers its first real request with a 500.
- Expected: fail at boot with a clear message. One awaited connection attempt before `listen`.

### B3. A push notification failure can terminate the process

- Where: `server/src/index.ts:88-95`, `server/src/services/push.service.ts:78-95`
- Trigger: any rejection from a promise nobody awaited. There are eight call sites that start `sendPushToUser` inside a `try` without awaiting it, for example `booking.service.ts:1273`, `conversation.service.ts:281-288`, `message.service.ts:47-55`, `promo.service.ts:71-80`. Because the call is not awaited, the surrounding `try` cannot catch it.
- Current behaviour: `sendPushToUser` begins with `prisma.pushSubscription.findMany` (`push.service.ts:60`), so a database hiccup inside a push becomes an unhandled rejection, and the handler at `index.ts:88` answers every unhandled rejection with `process.exit(1)`.
- Result: a transient database error while sending a courtesy notification kills the server, including any payout or booking write in flight on another request.
- Expected: notifications are best-effort at the edge and must never be able to take the process down.
- Smallest fix: `void sendPushToUser(...).catch(err => console.error('push failed', err))` at every call site, or make `sendPushToUser` itself never reject. Keep the exit-on-unhandled-rejection policy; it is a good policy, and it is only safe once the unhandled rejections are actually fixed.

### B4. A malformed webhook body returns 500 forever

- Where: `server/src/services/payment.service.ts:422`
- Trigger: a request that passes signature verification but is not valid JSON (`null`, truncated, not an object).
- Current behaviour: `JSON.parse(body)` has no try/catch, and `:428-429` then read `data.data?.reference`, so a `null` body throws. The controller answers 500, which tells Paystack to redeliver.
- Result: the same undeliverable event is retried indefinitely, and each attempt also skips the `PaymentLog` write at `:425`, so no record of the bad delivery is kept.
- Expected: parse inside a try, record the failure once, answer 200 so the provider stops retrying.
- Note: verifying the signature before writing anything (`:417-420`) is correct and should stay.

### B5. "Already settled" is reported when the payout was never found

- Where: `server/src/services/payment.service.ts:464-470` with `server/src/services/payout.service.ts:387-388`
- Trigger: a `transfer.failed` or `transfer.reversed` whose reference matches no payout row.
- Current behaviour: `settleFailedTransfer` returns `false` both when the payout was already settled and when no payout exists. The webhook then reports `handled: true` with "Payout marked FAILED (already settled)".
- Result: a failure notice for a real transfer is acknowledged and dropped. Nothing is restored, nothing is escalated, and the log says the opposite of what happened.
- Expected: three outcomes, not a boolean. Not found is an anomaly that needs an alert, because it means money moved against a record that does not exist.

### B6. A live listing is served as "no longer available"

- Where: `server/src/services/seo.service.ts:248` and `:319`
- Trigger: a transient database error while building listing metadata.
- Current behaviour: `.catch(() => null)` turns the error into "no such property", and the page returns a 404 saying the listing has been withdrawn.
- Result: a live listing disappears from search results and tells visitors it was withdrawn. The real cause is one line in a log.
- Expected: distinguish "not found" from "could not load". A load failure should be a 503, which is retryable and does not tell a crawler to deindex.

### B7. Notifications that fail are recorded as delivered

- Where: `server/src/services/automated-message.service.ts:291-300`, `:361-362`; `server/src/services/nudge.service.ts:145-162`; `server/src/services/push.service.ts:36-43`
- Detail: automated booking confirmations and check-in instructions return `{ sent: false, reason: 'error' }` to callers that discard it, so a guest who never received their arrival instructions leaves no trace beyond a log line. Nudge increments its attempt counter before sending (`:145-152`) and only then calls the push, so a failed push permanently burns one of the host's limited reminders. `unsubscribe` returns `{ ok: true, deleted: false }` when the delete throws, so a user who turns notifications off keeps receiving them.
- Expected: a delivery attempt is recorded after the attempt, and "opted out" is honoured or the failure is reported.

---

## C. Calls that can hang forever

None of these is a bug on a healthy network. Each becomes one on a stalled connection, and the consequence is a request that never completes or a scheduled job that never finishes its round.

### C1. The Telegram reply poller has no timeout and no exit

- Where: `server/src/services/chat.service.ts:135-158`, fetch at `:137`
- `while (true)` with a single `fetch` carrying no `AbortSignal` and no socket timeout. Backoff exists but only on a thrown error or an `ok: false` body (`:148`, `:152`), both a flat five seconds with no cap and no jitter. A stalled socket produces neither, so the loop parks on one promise with no error, no log and no retry.
- Result: team replies to website visitors stop arriving and nothing indicates it. A revoked bot token produces one log line every five seconds forever, roughly 17,000 lines a day.

### C2. No Paystack call has a timeout

- Where: `server/src/config/paystack.ts:132` (`paystackGet`) and `:141` (`paystackPost`)
- Every payment, verification, transfer and balance call inherits this. The bound is undici's internal idle guards, which are per phase and measured in minutes, not a total deadline.
- Result: a hung Paystack socket holds an admin's payout request open, and holds the hourly scheduled run, with no error to report.

### C3. Push sends are unbounded in time and in concurrency

- Where: `server/src/services/push.service.ts:85`, fan-out at `:78`, subscription cap at `:60`
- `webpush.sendNotification` is called with no options, so no timeout is armed; `web-push` only sets one when passed a number. One call can fan out to up to 5,000 subscriptions with no concurrency limit.
- Result: a slow push service holds the request handlers that await it (`nudge.service.ts:155`, `referral.service.ts:230`, `review-notice.service.ts:39`, `property.service.ts:773`) and opens thousands of sockets at once.

### C4. The browser never gives up on a stuck request

- Where: `src/api/client.js:3-7`
- `axios.create` sets no `timeout`, so a request the server never answers leaves the page on its spinner indefinitely with no error state.
- Expected: a client-side timeout, and a message the user can act on.

### C5. The calendar import bounds each hop, not each feed

- Where: `server/src/utils/safeFetch.ts:22` (15 s), `:20` (3 redirects), DNS at `:120`
- The 15 seconds is an inactivity timer, re-armed on each of up to four requests, and the DNS lookup has no timer at all. A feed that trickles bytes resets the timer on every byte.
- Result: one slow feed delays the whole sync round. `syncAll` (`ical.service.ts:80-92`) discards the settled results, so a feed that failed is invisible to the scheduler, and the next run starts on a fixed three-hour interval (`index.ts:110`) without waiting for the previous one, so two rounds can overlap and import the same feed twice.
- Good news, verified: the block replacement itself is a single transaction (`ical.service.ts:38-51`), and no outbound HTTP call is made from inside a database transaction anywhere in the codebase.
- Distinct risk worth naming: that same transaction deletes every imported block and recreates them from whatever parsed. A valid response with zero events wipes the calendar and marks the property free, which sells nights already sold elsewhere.

---

## D. Shutdown, resources and diagnostics

### D1. There is no graceful shutdown

- Where: `server/src/index.ts:73` discards the `http.Server` handle; no `SIGTERM` or `SIGINT` handler exists anywhere in `server/src` (zero matches).
- On a Railway redeploy the platform sends SIGTERM and the process dies immediately. Interactive transactions roll back at the database, but work already dispatched to Paystack or Telegram is not undone, and in-flight responses are cut. The five schedulers at `:110`, `:144`, `:161`, `:177`, `:196` keep no handle and cannot be stopped or awaited.

### D2. Timers and memory that outlive their purpose

- The five interval schedulers above are never cleared, and neither are the five one-shot timeouts at `:109`, `:143`, `:160`, `:176`, `:195`.
- `server/src/services/chat.service.ts:25-26` keeps live conversations in two maps. They are pruned only when a new message arrives, so an idle server holds expired conversations until traffic resumes. Bounded by 500, so this is untidy rather than dangerous.

### D3. Log hygiene

- 84 log call sites in `server/src`. The noisy ones are inside loops or on expected paths:
  - `server/src/services/automated-message.service.ts:416-424` loops every confirmed booking within a 195-day window every 15 minutes; each failure logs one line (`:299`). With delivery broken, this is unbounded per pass.
  - `server/src/services/referral.service.ts:243` logs an error, with the full error object, on the expected duplicate-credit path, so normal operation looks like a fault.
  - `server/src/services/push.service.ts:90` logs once per dead subscription, inside a loop over up to 5,000.
  - `server/src/index.ts:137` logs one warning per host whose payout was skipped, per hourly run, with no summary.
  - `server/src/services/chat.service.ts:151` logs the same Telegram error every five seconds.
- Good patterns already present and worth keeping: `server/src/utils/publicUrl.ts:16-19` warns once per key, `server/src/utils/mailer.ts:66` never prints a mail body in production, and `src/api/client.js:38-48` bounds refresh attempts at three with backoff.

### D4. A render error blanks the whole app

- Where: `src/components/ErrorBoundary.jsx:34-81`, mounted nowhere
- The component exists, is exported, and is referenced only inside its own file. `src/main.jsx:46-64` mounts no boundary, and `src/App.jsx:165` has a `Suspense` that covers lazy chunks, not render errors.
- Result: one null dereference on a partially loaded record unmounts the tree and leaves a blank white page. The same happens on every page after a deploy that replaced a hashed chunk.
- Smallest fix: one `<ErrorBoundary>` around `<App />` in `main.jsx`.

### D5. Failed loads are shown as empty data

- Silent, with no way to tell a fault from "nothing here": `src/components/ReviewSection.jsx:42-47`, `src/components/SimilarProperties.jsx:38-39`, `src/pages/GuidesPage.jsx:27`, `src/pages/FavouritesPage.jsx:62` and `:71`, `src/pages/HostTodayPage.jsx:248` and `:258`.
- The most consequential is `src/pages/HostEarningsPage.jsx:248-253`: a failed load renders the wallet as a zero balance, which reads as "you have earned nothing" rather than "we could not load this".
- `src/pages/GuideDetailPage.jsx:34` sets a not-found flag, so a network failure tells the reader the guide does not exist.

---

## E. What is already right

Listed because it constrains how the fixes above should be made, and because it is easy to undo by accident.

- `charge.success` confirmation is idempotent: `payment.service.ts:387-402` uses a conditional `updateMany` on the booking status and returns `SKIPPED` when it does not flip.
- The balance claim before a payout is correct: `payout.service.ts:261-270` matches on `balance: transferAmount`, so an admin click and the scheduled sweep cannot both transfer the same shillings.
- Host fund release is transactional and guarded by `hostFundsReleasedAt: null` (`payout.service.ts:80-101`), so a booking cannot be credited twice.
- Booking creation and promo redemption commit together in one transaction, with availability re-checked inside it (`booking.service.ts:330-400`).
- Host application approval is the reference implementation for the rest: transaction, re-read inside it, conditional write, notice after commit (`host-application.service.ts:480-560`).
- `markTransferSucceeded` has both a pre-read and a conditional write (`payout.service.ts:359-368`); the failure direction needs the same treatment.
- Webhook signature verification runs before any database write (`payment.service.ts:417-420`).
- `safeFetch` blocks private and loopback addresses before connecting (`safeFetch.ts:120`, `:151`), which is both a security and a reliability property.

---

## F. Ordered fix list

1. **A2** and **A3**: make payout settlement monotonic. This is the one that loses real money today. Add the mirror of `canMarkTransferSucceeded` for the failure direction, make `:308` conditional, and add a `['success', 'failed']` case to `tests/payout.transitions.test.ts` before changing the code.
2. **A1**: distinguish "the provider refused" from "the provider did not answer". Needs a reconciliation step for `PENDING` payouts older than a few minutes.
3. **A4** and **A5**: put the read conditions into the write filter. Two one-line changes, no design work.
4. **B3**: stop push notifications from being able to kill the process. Cheap, and it protects every other finding in this report.
5. **B1** and **B2**: make health and boot honest about the database.
6. **B4**: parse the webhook body in a try, answer 200 on a body that can never succeed.
7. **C1** to **C4**: add total deadlines to the Telegram poller, the Paystack client, push sends and the browser client.
8. **D1**: capture the server handle and add a SIGTERM handler that stops the schedulers and drains in-flight work.
9. **D4**: mount the error boundary that already exists.
10. **D2**, **D3**, **D5**, **B5** to **B7**: correctness and noise. Worth doing, none of them urgent.

---

## G. Not verified

- No live Paystack, Telegram, Cloudinary, push or SMTP endpoint was contacted, so provider-side retry and redelivery behaviour is taken from the code's assumptions, not observed.
- The 10 failing tests were attributed to shared process state by running the affected files alone; the isolation itself was not fixed or investigated further.
- Concurrency findings A4 and A5 were read from the code, not reproduced against a real database with two concurrent requests.

---

## Fixes applied

Each finding number above still refers to the original text.

| Finding | Change |
|---|---|
| A2 | `payoutTransitions.ts` gains `FAILURE_NOTICE_SOURCE_STATUSES` and `canSettleFailedTransfer`. A FAILED notice may only settle a payout still in flight, so a late or replayed failure can no longer refund a transfer the provider already delivered. REVERSED may still follow SUCCESS, because that money genuinely came back from the bank. `settleFailedTransfer` uses the same list in its conditional write. `tests/payout.transitions.test.ts` now models the real rule instead of repeating the bug, covers success-then-failed, and checks that no ordering of contradicting notices credits the host twice. |
| A3 | The PROCESSING write is an `updateMany` on `status: 'PENDING'`. When it does not flip, a webhook settled the payout first and the sweep returns without linking bookings, because a payoutBooking row created after the fact would exclude those bookings from every future payout. |
| A1 | A Paystack timeout is no longer read as a refusal. The payout stays PENDING with the balance still claimed, and `reconcilePendingPayouts` asks Paystack `GET /transfer/verify/:reference` and settles it either way. It runs with the hourly payout sweep. |
| A4 | Cancellation re-reads the booking inside the transaction and claims it with `updateMany` on PENDING or CONFIRMED before any money moves, so a second cancel in flight finds nothing to cancel and cannot debit the host twice. The stale `wasPaid` and `hostFundsReleasedAt` reads now come from that re-read too. |
| A5 | The stale-booking sweep writes the conditions it read: `status: 'PENDING', paidAt: null`. |
| B1 | `/api/health` runs `SELECT 1` behind a 3s deadline and answers 503 `unhealthy` when it fails. |
| B2 | Boot awaits `prisma.$connect()` and exits 1 with a clear line when the database cannot be reached. |
| B3 | `sendPushToUser` never rejects, so a failed notification cannot reach the exit-on-unhandled-rejection handler. Fan-out is capped at 100 at a time, each send with a 10s deadline. |
| B4 | A webhook body that is not a JSON object is answered 200 and recorded once, instead of throwing a 500 that Paystack redelivered indefinitely. The controller answers 200 for a body that is not JSON at all, for the same reason. |
| C1 | The Telegram poller gets a 40s deadline per long poll, exponential backoff to five minutes, and a stop switch used by shutdown. |
| C2 | Every Paystack call carries a 20s total deadline via `AbortSignal.timeout`. |
| C3 | Push sends are bounded in both time and concurrency (see B3). |
| C4 | The browser client times out at 30s, and the token refresh call at 15s. |
| D1 | The server handle is kept. SIGTERM and SIGINT stop the sweeps and the poller, close the server, disconnect Prisma and exit, with a 15s deadline so a hung connection cannot hold a deploy open. |
| D4 | `ErrorBoundary` is mounted in `main.jsx`, inside the providers its fallback screen needs. |
| B5 | `markTransferSucceeded` and `settleFailedTransfer` return `'applied' | 'already' | 'not_found'` instead of a boolean. A notice that matches no payout row now logs `PAYOUT-UNKNOWN` and sends a Telegram alert; the webhook still answers 200, because a redelivery cannot conjure the row. |
| B6 | `PageMeta.status` widens to include 503. A failed listing or guide read returns `unavailableMeta` (503) and logs which page failed, so a momentary database outage no longer tells a crawler that a live listing was retired. `index.ts` answers with that status and sets `Retry-After: 300`. |
| B7 | `runDueAutoMessages` counts failures, stops after 20 in one run, and returns `failed` and `stoppedEarly`; the scheduler logs them. `sendHostApplicationNudges` returns `sent`, `failed` and `unanswered`: a push that no device accepted gives the attempt back instead of recording it as delivered. `push.service.unsubscribe` reports `{ ok: false }` when the delete throws, and the controller passes that on. |
| C5 | `syncAll` is single-flight, and a body without `BEGIN:VCALENDAR` is an error rather than an empty calendar. An empty feed keeps the existing blocks and warns once; the next sync applies it. The rule is the exported pure `shouldReplaceBlocks`, covered by `tests/ical.empty-feed.test.ts`. |
| D2 | `forgetSession` clears the short-id index only while it still points at that conversation, so pruning cannot detach a live one. `getMessagesAfter` prunes an expired session on read, which is the only traffic an idle process gets. |
| D3 | Expected and repeated lines are aggregated: payout skips log one line per run with up to three reasons, automated-message failures log once with the count, expired push subscriptions log one summary, and the referral duplicate path no longer logs a stack trace. `sendTelegramAlert` logs the message rather than the error object, and carries a 10s deadline. |
| D5 | New `LoadFailed` component (square corners, no border, no shadow, `role="alert"`, retry re-runs the screen's own fetch) used by the review, similar-stay, guides, favourites, host-today, host-earnings and guide-detail screens. Guide detail treats only a 404 as "not found". Host earnings no longer prints a zero balance when the payout summary failed, in the page or in either PDF export. |

Verification: `npx tsc --noEmit` clean. `PAYSTACK_SECRET_KEY=sk_test_dummy npx tsx --test tests/*.test.ts` gives 517 of 519 passing, and the two failures are the pre-existing public-url environment tests. `npm run lint` clean, `npm run build` clean. Checked live against the local database: boot plus `/api/health` returns 200, a SIGTERM shutdown stops the sweeps and exits 0 in about a second, and a bad `DATABASE_URL` exits 1 at boot in about a second with "Cannot reach the database at boot".

Not exercised: the 503 branch of the health route, which needs the database to fail mid-run and has no test harness without a new dependency.

Continuation of 5 November, B5 to D5: `npx tsc --noEmit` clean. `PAYSTACK_SECRET_KEY=sk_test_dummy PUBLIC_URL=https://thezurilofts.com npx tsx --test tests/*.test.ts` gives 524 of 526, and the two failures are the same pre-existing public-url environment tests, which fail when run alone as well. `tests/ical.empty-feed.test.ts` passes 7 of 7. `npm run lint` clean, `npm run build` clean.

Checked by running the code, not by reading it: `metaForPath` answers 404 for an unknown listing against the local database, and 503 with the title "Temporarily unavailable" when `DATABASE_URL` points at an unopenable file. That second behaviour is now covered by a test: `tests/seo.meta.test.ts` fails the listing read and the guide read and asserts 503 with the canonical link intact, so B6 cannot regress back to a 404 that retires a live page.

Still open: nothing from the list above. Not fixed, deliberately: the 503 branch of the health route has no automated test (it needs a dependency), backup retention and provider-side copies sit outside this code, and the retry screens cover only the seven named in D5.

