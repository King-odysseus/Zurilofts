-- Three columns reached the schema files but never a migration, so production
-- asked for columns its database does not have. Postgres answers that with
-- P2022 and the whole query fails, which is why Google sign-in returned
-- "Internal server error" while the rest of the site kept working: the failure
-- was the SELECT on User, not the Google exchange itself.
--
-- User.dateOfBirth is how the 18+ condition of the Terms is enforced at sign-up
-- and before a booking is accepted.
--
-- The consent columns sit beside the cookie choices on the same record because
-- Kenyan data protection law requires demonstrable consent: the version of the
-- Terms a person accepted is stored, not only a boolean, so a later revision of
-- the Terms cannot be read back onto an older acceptance.
--
-- dateOfBirth and termsVersion are nullable on purpose. Accounts and consent
-- records created before these columns existed have no honest value for them,
-- and inventing one would be worse than leaving it unknown. termsAccepted keeps
-- its schema default of false, so older rows read as "not recorded" rather than
-- "declined".

ALTER TABLE "User" ADD COLUMN "dateOfBirth" TEXT;

ALTER TABLE "ConsentRecord" ADD COLUMN "termsAccepted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "termsVersion" TEXT;
