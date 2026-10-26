-- Host money became withdrawable the moment a booking was paid, so a host could
-- be paid for a stay that had not happened yet and the platform had to claw the
-- money back after a cancellation or a dispute. These columns record when the
-- host's share unlocks (check-in plus a hold) and whether it has been released
-- into the withdrawable balance yet.
--
-- hostCommission and platformRevenue keep the split on the booking itself, so
-- platform revenue can be reported and audited per booking instead of being
-- re-derived from live pricing config later.
ALTER TABLE "Booking"
  ADD COLUMN "hostCommission" INTEGER,
  ADD COLUMN "platformRevenue" INTEGER,
  ADD COLUMN "hostPayableAt" TIMESTAMP(3),
  ADD COLUMN "hostFundsReleasedAt" TIMESTAMP(3);

-- Every booking that existed before this change had its host share credited to
-- the wallet immediately, so mark it released. Without this backfill those
-- bookings would look unreleased and be credited a second time.
UPDATE "Booking"
SET "hostPayableAt" = "checkIn",
    "hostFundsReleasedAt" = COALESCE("paidAt", "createdAt")
WHERE "hostNetAmount" IS NOT NULL
  AND "hostNetAmount" > 0
  AND "hostFundsReleasedAt" IS NULL;

CREATE INDEX "Booking_status_hostPayableAt_idx" ON "Booking"("status", "hostPayableAt");
