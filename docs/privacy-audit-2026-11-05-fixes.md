# Privacy audit fixes, 5 November 2026

What was changed in the code after the read-only audit in `docs/privacy-audit-2026-11-05.md`. Finding numbers refer to that document.

| Finding | Change |
|---|---|
| 4.1 | `app.ts` logs only `/api` requests, and strips any `token` parameter from both the URL and the referer, because the API call the reset page then makes carries the reset link in its referer. Pinned by `server/tests/log-redaction.test.ts`. |
| 4.2 | `me.service.ts` deletes the identity verification, and its documents with it, on the anonymising path as well as the hard one. |
| 4.3 | `dateOfBirth: null` added to the anonymisation update. |
| 4.4 | `contact.routes.ts` sends the enquiry to the support mailbox through the existing mailer, and answers 503 when delivery fails instead of thanking the sender for a message nobody will see. Nothing personal is written to the log. |
| 4.5 | `IDENTITY_DOCUMENT_VIEWED` added to the audit actions. Opening a document writes an entry naming the applicant before the bytes are sent. |
| 4.6 | One hashing rule in `utils/ipHash.ts` now covers consent records, governance rows and refresh sessions. `index.ts` sweeps expired refresh sessions on a schedule. |
| 4.7 | Resolved by removal: the Telegram integration is gone from the app, so guest chat text is no longer forwarded to a third party. The support widget that fed it was already unmounted in the current build. |
| 4.8 | Notice: reviews are deleted with the account, and a host M-Pesa number is stated as stored so that host can be paid. |
| 4.9 | Notice: email delivery and machine translation added to the processor table, in English and Swahili. The consent policy version moves to 2026-11-05 on both sides, so an old acceptance is asked for again. |
| 4.10 | Export now includes date of birth, the identity record with document names and dates, the host application, payouts, wallet, disputes raised and guest reviews received. |
| 4.11 | Extra guest names are cleared from retained bookings when an account is erased. |
| 4.12, first item | Not changed. `AdminAuditEvent.actorEmail` still holds an erased person's address in older rows. Removing it means deciding whether the governance log may be rewritten, which is a policy question rather than a technical one. |

Still open, and not closable in code alone: backup retention for deleted data, and the address column in the audit trail. The copies of support chats previously held by Telegram no longer exist, because that integration was removed.
