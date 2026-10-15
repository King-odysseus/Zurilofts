-- Host-owned discount codes. Existing rows keep hostId NULL, which means
-- "platform-wide, created by the admin" - so no live code changes behaviour.
ALTER TABLE "PromoCode" ADD COLUMN "hostId" TEXT;
ALTER TABLE "PromoCode" ADD COLUMN "propertyId" TEXT;

CREATE INDEX "PromoCode_hostId_idx" ON "PromoCode"("hostId");
