# Privacy audit, 5 November 2026

Read-only audit of the whole project: what personal data is collected, where it goes, what is written to logs, and whether the retention, deletion and notice claims match the code.

Scope: `server/src` (all controllers, services, utils, routes), `server/prisma/schema.prisma`, the client's consent and privacy pages, and the third-party configuration in `server/src/config/env.ts`. No data was written, nothing was deleted, no third-party service was called. Every finding below is from reading code and schema, not from observing live traffic.

Legal and technical questions are kept apart: this records what the software does and leaves the policy decision to the reader.

## 1. Data map

Every field below identifies a person in this product, for the reason given.

| Data | Where stored | Why it identifies someone here |
|---|---|---|
| Email address | `User.email` (`server/prisma/schema.prisma:15`), `AdminAuditEvent.actorEmail` (`audit.service.ts:233`), `PasswordResetToken` via user | Account key, and the address the reset link is sent to |
| Name | `User.firstName`/`lastName`, `IdentityVerification.fullName`, `HostApplication`, `Booking.additionalGuestsJson`, `GuestReview` | Names on a booking link a real person to a real stay |
| Phone number | `User.phone`, `User.mpesaPhone` (`schema.prisma:29`) | M-Pesa payout destination, contactable number |
| Date of birth | `User.dateOfBirth` (`schema.prisma:20`), `IdentityVerification.dateOfBirth` (`schema.prisma:463`) | Combined with name and ID number, uniquely identifies |
| National ID or passport number | `IdentityVerification.idNumber` (`schema.prisma:457-476`) | Government identifier |
| ID / passport / selfie images | `IdentityVerificationDocument` (ciphertext, iv, authTag, uploaded name) | Biometric and document images |
| Bank account | `User.bankAccountNo`, `bankName`, `bankCode`, `paystackRecipientCode` | Financial identifier |
| Home and payout address | `User.address`, host property addresses | Locates a person |
| Free text written by guests | `Booking.specialRequests`, `ConversationMessage`, legacy `Message`, `Review`, `Dispute` | Often contains names, phone numbers, children's ages, arrival times |
| Names of people who never signed up | `Booking.additionalGuestsJson` (`schema.prisma:393`) | Third parties with no account and no route to correct or delete |
| IP address and user agent | `RefreshSession.ip`/`userAgent`, `AdminAuditEvent.ipAddress`, `ConsentRecord.ipHash`, morgan access log | Device and location trace |
| Push subscription endpoint and keys | `PushSubscription` | Identifies one installed browser |
| Profile photo | `User.avatar`, stored on Cloudinary or local disk | Face image, served publicly |
| Chat transcript | In-memory `sessions` map (`chat.service.ts:55-79`) and Telegram | Guest's words plus name and optional email |
| Host earnings, payouts, wallet | `HostWallet`, `Payout`, `PayoutBooking`, `PaymentLog` | Links a person to money received |

## 2. Log exposure

Access logging is morgan `combined` in production (`server/src/app.ts:89`). That writes remote address, method, full URL, status, referer and user agent for every request, with no redaction and no retention limit.

| What is logged | Where | Notes |
|---|---|---|
| Name, email, phone and free-text message from the public contact form | `server/src/routes/contact.routes.ts:46-48` | `console.log("[Contact] From: <name> <email> Phone: <phone> - <message>")`. This is the only place the submission goes: it is never persisted and never delivered to staff |
| Live password reset token, and the address it was issued to | `server/src/services/password-reset.service.ts:191`, token built at `:115` | Console transport only, so development. The same token also appears in the URL (see 4.1) |
| Account id, not address, on reset delivery failure | `password-reset.service.ts:196-198` | Deliberate: the comment says the line can end up in a log sink |
| Whole audit row as JSON, including `actorEmail`, `targetLabel`, `ipAddress` | `server/src/services/audit.service.ts:269` | Only when the governance write itself fails, but that is exactly the bad day |
| Whole error object | `server/src/middleware/errorHandler.ts:28` (`console.error('Unexpected error:', err)`) | A Prisma or validation error carries request values in `meta`, so values can land in logs unredacted |
| Guest email | `server/src/services/payment.service.ts:331-332` | On a double-booking conflict, written to the log and to Telegram |
| Upload storage failure detail | `server/src/utils/imageStorage.ts:33-38` | Message only, no path or user id. Fine |
| Telegram API errors, including `data.description` | `server/src/services/chat.service.ts:139,143,172` | No personal values. Fine |
| Full email body including the reset link | `server/src/utils/mailer.ts:307-313` | Console transport. `activeMailTransport()` returns `none` in production (`:66`), so this cannot fire in production. Verified safe |

What is not logged anywhere: passwords, tokens from request bodies, card data, ID numbers, or document bytes. `redactAuditMetadata` (`audit.service.ts:182-202`) redacts keys such as `bankAccountNo` and `passwordHash` before any audit row is stored, and `ConsentRecord` stores only `ipHash`, never the address.

## 3. Third-party sends

| Destination | What leaves the server | Where |
|---|---|---|
| Paystack | Guest email, amount, reference, channels, callback URL, booking id, property title | `server/src/services/payment.service.ts:67-80` |
| Cloudinary | Profile photos, listing photos, conversation attachments. Random file names, folder `zurilofts` | `server/src/utils/imageStorage.ts:29-45` |
| Google (OAuth) | Only what Google returns; the app stores `googleId` and email | `server/src/config/passport.ts`, `auth.controller.ts:95-115` |
| Telegram | Guest name, optional email, message body (`chat.routes.ts:46-60`); chat transcripts and replies (`chat.service.ts:98-175`); conflict alerts with guest email (`payment.service.ts:332-342`) | Disclosed in privacy policy section 11 |
| SMTP host, or `MAIL_WEBHOOK_URL` | Recipient address, subject, full body, including reset links and receipts | `server/src/utils/mailer.ts`, `password-reset.service.ts`, `receipt.service.ts` |
| Machine translation provider (LibreTranslate, DeepL or similar) | Up to 40 strings, 12000 characters per request, unauthenticated route | `server/src/routes/translation.routes.ts:25-70`, `translation.service.ts:60-75` |
| Browser push service | Push title and body | `server/src/services/push.service.ts:75-85`. Payloads are encrypted end to end for the subscription, so the push service itself cannot read them. Verified safe |
| iCal subscriber URL | Booking dates for a property, not guest identity | `server/src/services/ical.service.ts` |

No analytics, session recording, error tracker, ad pixel or third-party font was found in the client (`index.html`, `src/`, `public/`). `src/components/CookieConsent.jsx:68` states the site runs no analytics and records that choice as false by design.

Private message bodies are only sent for translation when `TRANSLATION_PRIVATE_CONTENT=true` (`translation.service.ts:70-74`), and the route refuses the request otherwise rather than silently answering. That is the right switch.

## 4. Findings

Ordered by how much they matter. Each gives the smallest change that removes the risk.

### 4.1 A password reset token is written to the access log on every reset click

`password-reset.service.ts:115` builds `<client>/reset-password?token=<token>`. The same Express process serves the single-page app (`server/src/index.ts:34-66`), and morgan is mounted before it (`app.ts:89`). So when the user clicks the link in their email, the production access log records the URL, and with it a live single-use credential, next to their IP address. Anyone who can read logs, or a log shipper that forwards them, can take over the account during the 30 minute window.

Smallest mitigation: skip morgan for non-API paths (a `skip` on `req.path` not starting `/api`), or move the token out of the query string. Skipping the SPA routes also stops the log filling with page views.

### 4.2 Identity verification survives account deletion on the anonymised path

Erasure deletes favourites, shortlists, push subscriptions, reviews, messages and the host application (`server/src/services/me.service.ts:195-205`), then anonymises the user row (`:250-274`). `IdentityVerification` is not in that list. Its cascade only fires on a hard delete (`schema.prisma`, `IdentityVerification.user ... onDelete: Cascade`), and the anonymised path keeps the row.

Result: full name, date of birth, national ID number and the encrypted ID document images stay attached to an account the user has been told is deleted. The privacy policy says the opposite (`src/i18n/domains/legal-privacy.js:225`: bookings and payment records are retained and anonymised so they no longer identify you). An ID document is not a payment record.

Smallest mitigation: delete `identityVerification` and its documents inside `erasePersonalRelations`, or null `fullName`, `idNumber`, `dateOfBirth` and delete the document rows while keeping the status for the payment gate.

### 4.3 Date of birth is kept after anonymisation

`me.service.ts:252-273` clears email, name, phone, avatar, Google id, bank and M-Pesa fields, but not `dateOfBirth`. A birth date plus the retained booking history is identifying, and the policy promises anonymisation within 30 days.

Smallest mitigation: add `dateOfBirth: null` to the anonymisation update.

### 4.4 Contact form messages are logged and then lost

`contact.routes.ts:46-48` writes the whole submission to stdout and returns success. Nothing else happens: no database row, no email. Two consequences: personal data sits in the hosting provider's log with no retention limit and outside the erasure path entirely, and the person who filled the form gets a promise of a reply that no one will see.

Smallest mitigation: send the submission through the existing `sendMail` helper to the enquiries mailbox and log only a timestamp and a count.

### 4.5 KYC document access by staff is not recorded

`identity-verification.service.ts:318-324` decrypts and returns an applicant's ID document to an administrator. Nothing is written to the governance trail, while an account erasure does write one (`me.service.ts:299-311`). A passport scan is the most sensitive object in the database and currently has no record of who looked at it, or how often.

Smallest mitigation: write an `AdminAuditEvent` with action `IDENTITY_DOCUMENT_VIEWED` before returning the bytes, using the same helper as erasure.

### 4.6 IP addresses are stored raw in two places and hashed in a third

`ConsentRecord` stores `ipHash` only (`consent.service.ts:10`), which is the right pattern. `AdminAuditEvent.ipAddress` stores the address in clear (`audit.service.ts:102`), and `RefreshSession.ip` does the same (`auth.service.ts:104,127`). Expired refresh rows are only removed when that exact session is presented again (`auth.service.ts:303-304`), so abandoned sessions keep an address and user agent indefinitely.

Smallest mitigation: hash the IP for audit rows the same way consent does, and add a sweep that deletes `refreshSession` rows past `expiresAt` on the existing scheduler in `index.ts`.

### 4.7 Telegram holds guest conversations with no deletion path

Guest chat text, name and optional email are forwarded to a Telegram chat (`chat.routes.ts:46-60`, `chat.service.ts:155-175`), and the reply poller routes a non-reply message to whichever guest spoke last (`chat.service.ts:113-127`, the comment admits the cross-thread risk). Telegram retains the content under its own policy. The privacy policy discloses Telegram as a processor, so this is transparent, but there is no way to honour an erasure request for those copies.

Smallest mitigation: refuse the `recentSessionId` fallback when more than one session is active, and state a manual deletion step for the Telegram chat in the retention section.

### 4.8 Two statements in the privacy notice do not match the code

- `legal-privacy.js:141` says M-Pesa details are not stored on our servers. `User.mpesaPhone` (`schema.prisma:29`) is stored, and it has to be, because it is the payout destination.
- `legal-privacy.js:137` says reviews are anonymised and kept for the property's rating. `me.service.ts:200` deletes every review the user wrote.

Smallest mitigation: reword both lines. The M-Pesa one should say the number is stored to pay the host out and that card numbers never reach the server. The reviews one should say reviews are deleted with the account.

### 4.9 The translation provider is missing from the processor list

Privacy section 11 lists Cloudinary, Paystack, Google and Telegram (`src/pages/PrivacyPage.jsx:217-239`) but not the machine translation provider, which receives listing copy and any text a visitor submits to `/api/translate`. The mail provider is also absent.

Smallest mitigation: add two rows to that table. Same layout, no code change.

### 4.10 The data export is incomplete

`me.service.ts:14-170` returns profile, bookings, conversations, own messages, favourites, shortlists, push subscriptions and consent records. It omits date of birth (not in the profile select), the identity verification record, the host application, payouts and wallet, disputes, and reviews received. A portability request would be answered with less than the service holds.

Smallest mitigation: add `dateOfBirth` to the profile select and include `identityVerification` with documents described by name and date only (not bytes).

### 4.11 Names of people who never signed up are held indefinitely

`Booking.additionalGuestsJson` (`schema.prisma:393`) stores first and last names of extra guests. Those people have no account, no notice and no way to ask for correction or deletion, and the value survives both erasure paths.

Smallest mitigation: clear it in the anonymisation update, and mention additional guests in the notice so the host is the one who has told them.

### 4.12 Smaller items

- `AdminAuditEvent.actorEmail` and `targetLabel` keep an erased person's address forever (`audit.service.ts:233`). Erasure nulls the label it writes itself (`me.service.ts:302-307`) but not older rows. Storing `actorId` alone would be enough.
- Hard deletion can fail with a foreign key error for a user who raised a dispute or received a guest review: `Dispute.raisedBy` (`schema.prisma:504`) and `GuestReview.host`/`guest` (`schema.prisma:613,615`) have no `onDelete`, so Prisma defaults to Restrict, and `requiresAccountRetention` (`utils/accountErasure.ts:14-21`) does not count either. Most such users have bookings and take the retention path, but the failure mode is a 500 on a deletion request.
- Conversation attachments are correctly gated now: `/uploads` refuses `msg-` names (`app.ts:101-109`) and bytes are served only after the requester is matched to the message (`chatAttachment.service.ts:10-30`). Avatar and listing photos remain public by design.
- The contact and chat forms answer unauthenticated visitors, so their in-memory message store should be named in the retention section.
- No retention sweep exists for logs of any kind, and nothing in the repository describes backup retention, which is where deleted data usually reappears.

## 5. What is already right

Worth recording so it is not undone: refresh tokens are httpOnly cookies (`auth.controller.ts:17,26`); consent stores a hashed IP with a policy version (`consent.service.ts`); audit metadata is redacted by key name before storage (`audit.service.ts:182-202`); private translation is off by default and refused rather than faked; contact and chat routes are rate limited; KYC documents are encrypted at rest with a dedicated key (`utils/hostDocumentCrypto.ts`); push payloads are end-to-end encrypted; there is a breach register (`services/incident.service.ts:372`); and the client runs no analytics, so the cookie banner tells the truth.

## 6. Suggested order of work

1. 4.2 and 4.3: identity record and date of birth after erasure. The notice already promises this.
2. 4.1: reset token in the access log.
3. 4.4: contact form loses enquiries and leaks them to logs.
4. 4.5 and 4.6: governance record for document access, and IP handling made consistent.
5. 4.8 and 4.9: four text edits in the notice.
6. 4.7, 4.10, 4.11, 4.12.
