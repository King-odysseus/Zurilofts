-- Add a nullable guest-facing review field. Additive and production-safe:
-- the column defaults to NULL for existing rows, and the private privateNote
-- data is intentionally NOT copied into it.
-- AlterTable
ALTER TABLE "Review" ADD COLUMN "publicComment" TEXT;
