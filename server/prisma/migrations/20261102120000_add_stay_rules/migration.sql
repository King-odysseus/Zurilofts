-- Minimum-stay rules: a host's multi-night requirement for a date range.
--
-- The platform had no minimum stay, so a one-night booking was always allowed.
-- A rule here tightens that for the nights it covers and nothing else: with no
-- rule a night keeps the default of one night, which is why "remove minimum
-- stay" deletes the rule rather than storing a zero.
-- `end` is the check-out day and is excluded, the same convention PriceRule and
-- CalendarBlock use, so a rule lines up one to one with the nights it came from.
CREATE TABLE "StayRule" (
  "id" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "start" TIMESTAMP(3) NOT NULL,
  "end" TIMESTAMP(3) NOT NULL,
  "minNights" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StayRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "StayRule_propertyId_idx" ON "StayRule"("propertyId");

ALTER TABLE "StayRule" ADD CONSTRAINT "StayRule_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
