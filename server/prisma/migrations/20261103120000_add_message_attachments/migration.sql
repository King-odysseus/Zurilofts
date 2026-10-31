-- File attachments on chat messages.
--
-- Stored as a JSON array of { url, name, mimeType, size } in one TEXT column
-- rather than a join table: a message carries at most five files and they are
-- always read together with it, so a relation would add a join to every thread
-- query and buy nothing.
--
-- Nullable, because every message sent before this migration has no attachments
-- and the column must not need a backfill. Writers also store NULL rather than
-- an empty array when nothing is attached (see utils/messageAttachments.ts), so
-- "no attachments" has exactly one representation and an older reader that only
-- looks at the text column keeps working.

ALTER TABLE "Message" ADD COLUMN "attachments" TEXT;

ALTER TABLE "ConversationMessage" ADD COLUMN "attachments" TEXT;
