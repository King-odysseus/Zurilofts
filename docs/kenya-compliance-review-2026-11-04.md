# Kenya regulatory compliance review - ZuriLofts

Scope: what Kenyan law requires of a short-let booking marketplace operating in Nairobi, and what in this codebase does not yet meet it.
Method: primary research on Kenyan law plus a read of the actual implementation (privacy/terms pages, consent system, pricing, payments, tax code, erasure).
Confidence: the "what the code does" findings are verified against the files named below. The legal points are researched but are not a legal opinion; anything marked CONFIRM needs a Kenyan advocate or tax adviser before you rely on it.

Overall: the foundations are better than typical for a product at this stage. There is a real privacy policy and terms (English and Swahili), a consent record model, data export, account erasure, a dispute flow, encrypted host documents and KRA PIN capture. The exposure is not missing paperwork. It is (1) three published promises that the system does not keep, (2) consent that is assumed rather than obtained, and (3) no tax machinery at all.

---

## Risk summary

| Area | Law | Status | Risk |
|---|---|---|---|
| ODPC registration | Data Protection Act 2019 s.18 | Not evidenced | High |
| Consent: cookies, terms, marketing | DPA 2019 (lawful basis and consent) | Banner built but not shown; implied consent claimed | High |
| Privacy policy accuracy | DPA 2019; Consumer Protection Act 2012 (misleading representation) | 4 inaccurate claims | High |
| Breach notification | DPA 2019 s.43 | No process, no code | High |
| VAT and eTIMS invoices | VAT Act 2013; Tax Procedures Act | Nothing implemented | High (money) |
| Withholding tax | Income Tax Act | Arbitrary 5% default, questionable basis | High (money) |
| Retention schedule | DPA 2019 (storage limitation) | Published windows, no purge job | Medium |
| DPO, DPIA, register of processing | DPA 2019 ss.24, 31 | None | Medium |
| Age 18+ | Terms; contract capacity | Validators exist but optional | Medium |
| Trader identity in terms | CPA 2012; Electronic Transactions Act 2023 | Brand name only, no legal entity | Medium |
| Cross-border transfer claim | DPA 2019 s.48-50 | "Primarily Kenya" is probably untrue | Medium |
| Accommodation licensing | Tourism Act 2011; county rules | Unaddressed | CONFIRM |

---

## A. Data protection (Data Protection Act 2019, ODPC)

### A1. Registration with the ODPC - s.18 (P0)
A controller or processor meeting the criteria in the 2021 Registration Regulations must register. ODPC exemption guidance does not place accommodation/hospitality or property management among the exempt sectors, and you process ID documents and financial data. Treat registration as mandatory.
Nothing in the app or policy shows a registration certificate or number.
Do: register, then publish the registration number on the privacy page and in the site footer.

### A2. Consent is claimed, not captured (P0)
Three separate problems, all verified:

- `src/i18n/domains/legal-privacy.js` s1Consent says: "By using the Platform, you consent to the data practices described in this policy." That is implied consent. Kenyan law (like the GDPR it mirrors) requires consent to be freely given, specific, informed and demonstrable, and the controller must be able to show it. Browsing is not consent.
- The consent banner exists (`src/components/CookieConsent.jsx`, 209 lines, with analytics and marketing toggles) but it is never imported or mounted anywhere. `src/utils/consent.js` does hold a versioned record (POLICY_VERSION '2026-08-08', analytics and marketing default false) and `GuestDiscovery.jsx` can open the manager, so the machinery is built and the door is simply not hung.
- Registration collects a mandatory terms checkbox client-side (`src/pages/RegisterPage.jsx`, links to /terms and /privacy) but the server never records it. `registerSchema` in `server/src/types/index.ts` has no terms field, and there is no policy version stored against the user. Only the host application records `agreedTerms` (`host-application.service.ts`). So for every guest account you cannot prove assent to the version that was live.

Do: mount the banner; add `acceptedTerms` plus `policyVersion` to `registerSchema`; write it into the existing append-only `ConsentRecord` model (`server/prisma/schema.prisma:901`) at registration and at checkout; ask for re-acceptance when POLICY_VERSION changes. Rewrite s1Consent to rely on contract performance and legitimate interests rather than consent.

### A3. The privacy policy promises four things that do not exist (P0)
A published policy is a representation. Under DPA and CPA, a false one is worse than a short one. Verified mismatches against `src/i18n/domains/legal-privacy.js`:

1. s6ProvidersText names "analytics providers". There is no analytics in the codebase (no gtag, gtm, pixel, PostHog, Sentry or equivalent anywhere in `src/`). Either add consent-gated analytics or delete the reference.
2. s6/s7 obliquely promise receipts and invoices for payments. There is no invoice or receipt generation anywhere in `server/src` (searched `vat`, `etims`, `taxInvoice`, `invoice`, `receipt`: no hits). No guest can obtain a document that the policy says you issue.
3. s7 Retention publishes hard numbers: account data anonymised or deleted within 30 days of deletion, messages kept 2 years, logs up to 12 months, bookings and payments 7 years. No scheduled purge, anonymisation job or retention config exists (searched `retention`, `purge`, `anonymis`: nothing). The 30-day promise is the one likely to be complained about first, because `/api/me` deletion is user-triggered and the promise is immediate.
4. s8Breach promises notification to affected users and to the supervisory authority within 72 hours. There is no breach handling of any kind in `server/src` (searched `breach`, `incident`, `notifyCommissioner`: nothing).

Separately, s9Body says data is "primarily stored and processed in Kenya". Images go to Cloudinary (`server/src/utils/imageStorage.ts`) and the app is deployed off a platform host, so this is probably inaccurate. Correct it and name the actual countries, then rely on the s.48-50 transfer conditions you already describe (adequacy, SCCs, contract necessity). CONFIRM the host region.

### A4. Breach notification - s.43 (P0)
The legal duty exists whether or not the policy mentions it: notify the ODPC without undue delay and within 72 hours of becoming aware, and tell affected individuals where there is a high risk. You need: an incident register, a documented decision path, and a notification template. Also decide who is "aware" and who can declare it.
Do: add an `Incident` model plus an admin-only endpoint that stamps awareness time and generates the ODPC notification text. Add a one-page runbook in docs/.

### A5. DPO, DPIA and records of processing - ss.24, 31 (P1)
You scan national IDs and passports for host and guest verification and hold financial data. That is high-risk processing. A DPIA is required before continuing, and a DPO must be designated and published where the processing is large-scale or sensitive.
Do: complete a DPIA for identity verification and store it in docs/; name a DPO with a contact address on the privacy page; keep a short register of processing activities.

### A6. Rights of access and erasure are in decent shape (done)
`server/src/routes/me.routes.ts` exposes GET /api/me/export (access and portability) and DELETE /api/me (erasure), and `accountErasure.ts` anonymises while preserving financial records. That is the right shape. Strengthen the response time commitment to the statutory deadline (one month, extendable) and make sure the export includes reviews, messages and consent history.

### A7. Sensitive data handling
`hostDocumentCrypto.ts` encrypts identity documents at rest, which is the correct control for the most dangerous data you hold. Extend the same treatment to any identity-verification files on the guest side and confirm host document keys are never in the repo or the client bundle.

---

## B. Consumer protection and online trading

### B1. Trader identity is missing (P1)
`TermsPage.jsx` sets `companyName = 'ZuriLofts'` and the terms describe "a business operating in Nairobi, Kenya". A brand is not a legal person. Consumers, the Competition Authority of Kenya and a court all need the registered entity to enforce or defend anything.
Do: put the registered company name, registration number, physical address, phone and email in the terms footer and site footer.

### B2. Price transparency is actually fine (verified, no action)
`src/pages/BookingPage.jsx` renders service fee, cleaning fee, late checkout and the Paystack payment fee (`paymentFee`, line 1128 and 1407) inside the price breakdown before payment, with a total. Nothing is added silently at the payment step. Keep it that way: the payment fee must never appear only on the gateway screen.

### B3. Advertising and claims (P1)
"Premium" positioning, star-like ratings and superlatives are representations under the CPA and Competition Act s.55. Two concrete rules: only publish an aggregate rating computed from verified stays, and do not use "best", "guaranteed" or similar without evidence.

### B4. Cancellation, refunds and redress exist (done, tighten)
Terms s6 covers guest cancellation and cancellation by the platform, s17 covers disputes, and a dispute service exists. Add: refund timelines in working days, the consumer's right to escalate to the Competition Authority of Kenya, and a visible "Complaints" link that works without logging in.

### B5. Age (P1)
Terms s1Agreement says users must be at least 18. The validators at `server/src/types/index.ts:329` and `:384` enforce 18, but both are `.optional()`, so a booking can complete without a date of birth on file. Under the CPA and the law of contract, a minor cannot be held to these terms.
Do: make date of birth required at registration, store the 18+ confirmation on the user, and reject booking creation without it.

### B6. Marketing consent (P1)
`src/utils/consent.js` defaults marketing to false, which is right. Make the marketing flag the single gate for every marketing email and push (`notification.service.ts`, `mailer.ts`, `push.service.ts`, `nudge.service.ts`), and ensure every marketing message carries an unsubscribe path. Transactional booking and safety messages are separate.

---

## C. Tax (this is the largest financial exposure)

### C1. No VAT and no tax invoices anywhere (P0)
There are zero references to VAT, eTIMS or tax invoices in `server/src`. The platform's commission and service fee are a supply of services. Once turnover crosses the VAT registration threshold (currently KES 5 million in a twelve-month period - CONFIRM current figure), failure to register, account for 16% and issue compliant invoices means back tax, penalties and interest, and it can be recovered from the directors.
Do: decide registration status now, not later. If registered, add a VAT line to `server/src/utils/pricing.ts` and the booking breakdown, store the amount on the Booking and Payment records, and issue an eTIMS-compliant invoice for the platform's fee.

### C2. Withholding tax is on a number you invented (P0)
`server/src/config/env.ts` sets `WITHHOLDING_TAX_RATE` to **5** and the comment states plainly that 5 "is NOT one of those statutory rates". The same comment asserts that Income Tax Act s.35 withholds 10% of gross rent paid to a resident landlord. That assertion is doubtful: s.35 withholding applies to specified categories, and rent paid to a resident is generally not one of them, while the 7.5% Monthly Rental Income regime is aimed at residential letting rather than nightly accommodation. The deduction base is also inconsistent: `server/src/utils/hostEarnings.ts:85` withholds on accommodation plus extra-guest fee, while the host's gross also includes cleaning and late-checkout fees.

The practical danger: you are deducting money from hosts, telling them it is tax, and there is no evidence it is being remitted, no WHT certificate and no return.
Do: get a written opinion on the correct treatment for nightly short-let rent (most likely no platform withholding; the host declares business income). Until then set the rate explicitly rather than leaving a silent 5% default, and if a rate is charged, produce WHT certificates and a remittance report.

### C3. Receipts and records (P1)
Add a guest-facing receipt for every payment with dates, amounts, platform identity and VAT status, and keep financial records for the statutory period (7 years) - which the privacy policy already promises.

---

## D. Payments
Using Paystack for collection and payouts is the right call; it keeps you out of holding customer funds directly and you never store card numbers or M-Pesa credentials. Two things to confirm with the provider: that your integration model (marketplace split or transfer-after-collection) is the one your contract covers, and that your HostWallet ledger cannot be read as unlicensed deposit-taking. CONFIRM with the provider and, if the model changes, with the Central Bank of Kenya's licensing team.

---

## E. Accommodation and tourism regulation - CONFIRM
There is currently no dedicated national statute regulating short-let platforms that I could verify as in force; this area is moving and must be checked at the time you launch, not assumed from this report. What is certain is that the **hosts** may need to satisfy Tourism Regulatory Authority registration and county (Nairobi) requirements, and that licensed accommodation carries guest-register duties under the Hotels and Restaurants Act (Cap 494).

Do: require hosts to declare their registration/permit status in the host application and store it; keep a per-booking guest register (name, ID type and number, nationality, dates) that can be exported for inspection; get a written opinion on whether the platform itself needs a TRA licence.

---

## F. Security as a legal control
The DPA requires appropriate technical and organisational measures. You already have rate limiting, hashed passwords, an audit log and encrypted identity documents. Add: an incident response runbook (see A4), a dependency and secret scanning step in CI, and a written information security policy - the last is a document an ODPC investigation will ask for.

---

## G. Electronic contracts and cybercrime

### G1. Electronic Transactions Act 2023 (CONFIRM commencement)
Your entire contract is electronic. This Act is what makes a click-accepted agreement, an electronic signature and an electronic record legally effective. Two consequences:
- Those terms and the privacy policy must be reachable, versioned and provable. Right now the guest's acceptance is not stored (see A2), which weakens your ability to prove the contract exists at all, not just the consent.
- Electronic notices you promise in the terms (cancellation, refund, dispute outcomes) are effective when sent in the manner agreed, so the terms must specify the channel and you must actually send to it.

### G2. Computer Misuse and Cybercrimes Act 2018
This is the statute most likely to be used against you after an account takeover, fraud or a data incident:
- Keep logs sufficient to support an investigation: authentication events, payment attempts, admin actions and IP or device metadata. You already audit admin actions; extend that to authentication anomalies.
- Know the reporting route for a cyber incident and preserve evidence before remediating. Your incident runbook (A4) should have a section for this Act, not only for the ODPC.
- Fraud controls that protect users (rate limits, M-Pesa and card abuse detection, host payout verification) are your best defence against being characterised as negligent. Host payout destination changes should require re-verification, since that is the classic fraud path in this business.

---

## Prioritised build list

P0 (do before taking another booking)
1. Register with the ODPC and publish the number.
2. Mount the consent banner; record terms, policy version and consent server-side at registration and checkout; delete the "by using the Platform you consent" sentence.
3. Correct or implement the four policy promises: receipts/invoices, analytics, retention windows, breach notification. Correcting the text is acceptable; leaving it false is not.
4. Add the breach/incident model, 72-hour clock and ODPC notification template, plus a runbook.
5. Decide VAT status; if registered, add VAT to pricing and issue eTIMS invoices.
6. Replace the arbitrary 5% withholding default with a documented, legally grounded decision, and issue certificates if you withhold.

P1 (next)
7. Legal entity details, address and contacts in terms and footer.
8. DPO named and published; DPIA for identity verification; register of processing.
9. Retention job enforcing the published windows.
10. Require date of birth; enforce 18+ at registration and booking.
11. Marketing consent gate and unsubscribe on every marketing message.
12. Cancellation policy displayed at checkout and its version stored on the booking.
13. Complaints link with CAK escalation, usable without login.
14. Correct the international transfer statement to name real countries and lawful mechanism.
15. Host registration/permit declaration plus exportable guest register.

P2 (hardening)
16. Self-host fonts (remove the Google Fonts link) so no third-party request is made before consent.
17. Secret and dependency scanning in CI; written infosec policy.
18. Verified-stay-only reviews, labelled as such.
19. Insurance: public liability and professional indemnity, plus host terms covering damage and conduct.

---

## What to buy, not build
A short written opinion from a Kenyan advocate covering: ODPC registration and DPIA adequacy, whether the platform needs a TRA licence, and consumer terms enforceability. And a tax opinion from a Kenyan accountant covering VAT registration, eTIMS, and the correct withholding position for nightly short-let rent. Both are cheap relative to the penalties, and both are things a regulator will ask to see.

## Verification of this report
- Code findings: each is tied to a file and line, and each "missing" claim was confirmed by a search that returned no hits rather than by assumption.
- Legal findings: sourced from Kenyan statutes and regulator guidance through web research; section numbers should be confirmed against the Act text before any filing.
- Items marked CONFIRM are genuinely unsettled or date-sensitive and must not be treated as settled advice.
