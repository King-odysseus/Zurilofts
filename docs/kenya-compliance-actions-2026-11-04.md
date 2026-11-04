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

## Must be built, in this order

### Before taking another booking

1. **Breach and incident handling.** Nothing exists. Needed: an incident record
   with an "aware at" timestamp, an admin-only way to declare one, a generated
   notice for the Office of the Data Protection Commissioner, and a written
   one-page runbook. The 72-hour clock only starts when someone can declare an
   incident, so this is a build, not just a document.
2. **Guest-facing payment record.** Done. A receipt can now be downloaded from
   the booking history and the booking detail screen, built from the stored
   booking rather than from the browser's copy of it. Still open, and blocked on
   the VAT decision below: whether this must become an eTIMS tax invoice, and the
   VAT line itself. `server/src/config/company.ts` holds the single switch for
   that (`vatMode`), so the change is one constant and one test, not a rebuild.
3. **Age enforcement at booking, and for Google sign-ups.** Registration now
   collects and checks a date of birth, but accounts created through Google have
   none, and booking does not yet refuse an account that is known to be under 18.
   Build: collect a date of birth for Google accounts on first use, and reject
   booking creation when the stored date of birth is under 18.

### Next

4. **Retention job.** The policy now describes retention honestly instead of
   naming windows we cannot enforce. Enforce something concrete: a scheduled job
   that purges or anonymises closed-account data, stale logs, and expired message
   threads, with the periods decided by you and then written back into the policy.
   A published period plus no job is the exact combination that invites complaint.
5. **Marketing consent gate.** One flag must control every marketing email and
   push, and every marketing message needs a working unsubscribe. Transactional
   booking and safety messages stay separate.
6. **Guest register export.** Licensed accommodation carries guest-register
   duties: name, ID type and number, nationality, and stay dates, exportable for
   inspection. Per-booking data mostly exists; the exportable register does not.
7. **Complaints route that works without logging in**, with the Competition
   Authority of Kenya escalation path named.
8. **Cancellation policy shown at checkout**, with its version stored on the
   booking so the terms that applied are provable.
9. **Analytics or nothing.** The consent panel still offers an analytics choice.
   Either add consent-gated analytics or trim that copy. Right now it advertises a
   capability the product does not have.

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
