# Kenya compliance: what needs building, what needs paperwork

Date: 2026-11-04
Companion to: `docs/kenya-compliance-review-2026-11-04.md` (the full legal review)
That document said what is wrong. This one says who does what, and separates the
three kinds of work that were previously mixed together:

- **Code** - something we build in this repository.
- **Paperwork** - a form, a registration, a policy document, or a filing. No code.
- **Advice** - a decision only a Kenyan advocate or accountant can make, which then
  tells us what code (if any) follows.

Nothing here is a legal opinion. The law points were researched, not advised.

---

## Entity details

- Brand: ZuriLofts
- Operating company: BeneAlpha Consulting Limited (registered in Kenya)

The terms and the site footer now name the company as the contracting party.

Still missing, because only you hold these facts. They render as blank until filled:

| Fact | Where it goes | File |
|---|---|---|
| Company registration number (CR12) | Terms section 1a and section 20 | `src/pages/TermsPage.jsx` (`companyRegistrationNumber`) |
| Registered office address | Terms section 1a and section 20 | `src/pages/TermsPage.jsx` (`companyAddress`) |
| Physical phone number | Terms section 20 | `src/pages/TermsPage.jsx` |

Both are deliberate empty constants, not placeholders. A guessed registration
number or address would be a worse misstatement than no line at all, so each line
simply does not render while its constant is empty.

---

## Fixed today, in code

These were the "build issues" that did not need a decision from anyone.

1. **Consent banner is live.** It was fully written and imported nowhere, so no
   visitor ever saw it. It is now mounted app-wide and appears on first visit,
   with the Cookies button in the footer opening the same panel.
2. **Terms acceptance is recorded.** The registration checkbox was required by the
   browser but never sent, so no guest acceptance existed anywhere. The server now
   requires it and writes an append-only record of the exact policy version
   accepted, in the same transaction that creates the account. An account cannot
   exist without that record.
3. **Age gate actually runs.** Date of birth is now required at sign-up and
   validated as 18 or older on the server. It is stored on the user record, not
   only on host applications where it previously lived.
4. **Privacy policy no longer promises things the product does not do.** Four
   statements were corrected in both English and Swahili:
   - "by using the Platform you consent" replaced with the real lawful bases.
   - "issue receipts or invoices" removed (no invoice exists).
   - "analytics providers" removed (no analytics exists anywhere).
   - fixed retention windows for messages and logs removed, because no purge job
     enforces them.
   - "primarily stored and processed in Kenya" corrected, since image delivery
     and hosting are offshore.
5. **Company identity is visible** in the terms and in both footers.

Verified: lint clean, frontend build clean, server type-check clean, both Prisma
schemas valid, local database in sync, and the registration validator accepts an
adult who ticked the box while rejecting a 17-year-old, a missing date of birth,
a missing agreement, and an unticked box. The banner, footer attribution, terms
section 1a and date of birth field were confirmed in a running browser.

---

## Built today: the guest receipt

Item 2 above is now in the product. What it does, and why each choice was made:

- **The figures come from the stored booking, not from the page.** A receipt
  rebuilt in the browser from a list row can disagree with the record on file.
  `GET /bookings/:id/receipt` returns the record, using the same access scope as
  the booking itself, so a receipt can never be pulled for a booking the caller
  could not already read.
- **It is only called a receipt once money was received.** An unpaid booking
  produces a document headed "Booking summary" that states plainly that no
  payment has arrived. A confirmed stay with no payment timestamp still counts as
  paid, because this codebase only confirms a booking after the gateway confirms
  the money; telling a guest who did pay that nothing was received would be the
  worse error.
- **The company, not just the brand, is on the document.** BeneAlpha Consulting
  Limited prints under the ZuriLofts name, with the registration number and
  registered office appearing only once those constants are filled in. A brand is
  not a person a customer, a court or a tax authority can act against.
- **Every charge is itemised, and the lines add up to what was charged.** There is
  a test that asserts the sum of the lines equals the stored total whenever every
  fee is present, because a receipt whose parts do not reach its total is worse
  than no receipt.
- **No VAT statement is made.** `vatMode` is `'none'`, so the document says
  nothing about VAT rather than guessing. When the accountant confirms
  registration, flipping it to `'inclusive'` adds the VAT portion (extracted from
  the VAT-inclusive total, never added on top) and the VAT number.
- **The receipt number is stable, not sequential.** It is derived from the booking
  id and the payment date, so the same booking always prints the same number.
  Sequential numbering is a requirement of a VAT-registered supplier issuing tax
  invoices; it becomes necessary only alongside that registration.
- **It prints in the guest's language.** English and Swahili, including the charge
  labels. Only an add-on keeps its own name, because that text is host-written.

Verified: the sum of the lines matches the stored total on a real booking row in
the local database, 11 unit tests pass, the server type-checks, the frontend
lints and builds, and the PDF was generated in a real browser in both languages
with the company name, receipt number and amounts present.

## Built: the cancellation terms, before the guest pays

The cancellation policy existed only as words in the Terms. Nothing at checkout
mentioned it, and no booking kept a record of which version applied, so the terms
behind a refund or a refusal were whatever the policy happened to say later. Both
halves are now in the product.

- **One place decides the tiers.** `server/src/utils/cancellation.ts` holds the two
  boundaries (14 days and 7 days) and the percentages. Before this they existed
  only as prose, which is why nothing could check them.
- **The checkout prints dates, not policy wording.** The price quote now carries
  the terms with it, so the panel under the total says when the full refund closes
  ("on or before 3 Dec 2026") and, once it has, that only half the nightly rate is
  returned. The browser never computes this itself, so the deadline shown is the
  one that will be applied.
- **Every new booking records the policy version** it was made under. That is the
  point of the change: a guest is entitled to the terms they were shown, and the
  policy will be revised.
- **"Today" is the Nairobi day.** A guest cancelling at one in the morning is
  judged on that day, not on the UTC date, which would have given them an extra
  day of cover and a deadline a day later than the one they were shown.
- **The contract cannot drift from the code.** A test reads the published Terms and
  fails if they stop describing the same two boundaries the code enforces, which is
  the failure mode this kind of change usually has.

What it deliberately does not do: it does not calculate a refund amount. Refunds are
issued by a person, and a number the site invented at checkout that the refund
screen disagreed with would be worse than the policy statement alone.

Verified: 16 unit tests pass (`node --import tsx --test tests/cancellation.test.ts`),
the server type-checks, lint is clean, the frontend builds, and both Prisma schemas
are in sync with a local database that has the new column. The full server suite is
503 passing with the same 10 pre-existing Paystack and public-URL failures as before
this change.

## Must be built, in this order

### Before taking another booking

1. **Breach and incident handling.** Done. The register, the admin-only declare
   and update steps, the generated ODPC notice and the one-page runbook all exist
   (`Admin, Data incidents`, and `docs/data-incident-runbook.md`). The clock counts
   from a recorded "aware at" time, a notification time is recorded once and
   cannot be rewritten, and every declaration lands in the governance log.
2. **Guest-facing payment record.** Done. A receipt can now be downloaded from
   the booking history and the booking detail screen, built from the stored
   booking rather than from the browser's copy of it. Still open, and blocked on
   the VAT decision below: whether this must become an eTIMS tax invoice, and the
   VAT line itself. `server/src/config/company.ts` holds the single switch for
   that (`vatMode`), so the change is one constant and one test, not a rebuild.
3. **Age enforcement at booking, and for Google sign-ups.** Done. Booking creation
   and payment initialisation both refuse an account that is known to be under 18,
   and an account with no date of birth is asked for one at the point of booking,
   which is where Google sign-ups are caught. A date supplied at that point is
   stored only when it is real and adult, so a refused minor leaves nothing behind
   and a date already on file is never overwritten by what a request claims.

### Next

4. **Retention job.** The policy now describes retention honestly instead of
   naming windows we cannot enforce. Enforce something concrete: a scheduled job
   that purges or anonymises closed-account data, stale logs, and expired message
   threads, with the periods decided by you and then written back into the policy.
   A published period plus no job is the exact combination that invites complaint.
5. **Marketing consent gate.** Done for everything that sends today. Push and the
   promo announcement only reach accounts whose most recent recorded choice allows
   marketing, so withdrawing works by superseding the earlier record. There are no
   marketing emails at all, so no unsubscribe link is owed yet; if one is ever
   added, it must check the same function before sending.
6. **Guest register export.** Licensed accommodation carries guest-register
   duties: name, ID type and number, nationality, and stay dates, exportable for
   inspection. Per-booking data mostly exists; the exportable register does not.
7. **Complaints route that works without logging in**, with the Competition
   Authority of Kenya escalation path named.
8. **Cancellation policy shown at checkout**, with its version stored on the
   booking so the terms that applied are provable. Done, see the section below.
9. **Analytics or nothing.** Done, by choosing nothing. The consent panel no longer
   offers an analytics choice, and the stored value is written as false, so the
   product no longer advertises a capability it does not have. Adding analytics
   later means restoring the choice and gating the script on it first.

### Hardening

10. Secret and dependency scanning in CI.
11. Self-host the fonts so no third-party request is made before consent.
12. Verified-stay-only reviews, labelled as such.
13. Re-verify a host's payout destination whenever it changes. This is the classic
    fraud path in this business and is also a defence under the cybercrime law.

---

## Paperwork and advice, no code

These cannot be fixed by writing software, and should not wait for the build.

| Item | Type | Why it matters |
|---|---|---|
| Register with the ODPC and publish the number | Paperwork | Required of controllers processing this kind of data. Nothing in the app shows registration. |
| Name a Data Protection Officer and publish contact | Paperwork | Required for this scale of sensitive processing (ID documents, financial data). |
| Complete a DPIA for identity verification | Paperwork | High-risk processing must be assessed before it continues. |
| Register of processing activities | Paperwork | A regulator will ask for it. |
| Written information security policy | Paperwork | Asked for in any investigation. |
| Breach runbook (alongside item 1 above) | Paperwork | Says who may declare an incident and who notifies. |

| Decision | Who | What it changes in code |
|---|---|---|
| VAT registration status and eTIMS | Kenyan accountant | Whether VAT is added in pricing and whether invoices must be eTIMS-compliant |
| Correct withholding treatment for nightly short-let rent | Kenyan accountant | Whether the 5% host deduction stays. The current 5% is arbitrary and the config comment admits it is not a statutory rate. If any rate is kept, certificates and a remittance report must be built. |
| Whether the platform needs a Tourism Regulatory Authority licence | Kenyan advocate | Whether host licensing status becomes a required field |
| Enforceability of the terms and the consent model | Kenyan advocate | Wording, and whether the recorded acceptance is sufficient |

The two opinions are cheap relative to the penalties, and both are things a
regulator will ask to see. Do not build the VAT line or change the withholding
deduction until the accountant answers, because guessing either way is the
expensive mistake.

---

## Not a concern, leave alone

Checked and already correct. Do not let anyone "improve" these:

- Price breakdown shows every fee, including the payment fee, before payment.
- Data export and account deletion both exist and work.
- Host identity documents are encrypted at rest.
- Disputes, cancellation and refund flows exist.
- Payment cards and M-Pesa credentials are never stored.
- KRA PIN is captured for hosts.

---

## Note on the local database

The development database was pushed to match the new schema (two added columns, no
data removed). Production has not been touched. Production schema is changed by
the usual deploy, which applies the PostgreSQL schema before generating the client.
