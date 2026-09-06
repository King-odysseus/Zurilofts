-- Server-side refresh-token sessions: rotation, reuse detection, revocation.

-- CreateTable
CREATE TABLE "RefreshSession" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "previousHash" TEXT,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "ip" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RefreshSession_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RefreshSession_tokenHash_key" ON "RefreshSession"("tokenHash");

-- CreateIndex
CREATE INDEX "RefreshSession_userId_idx" ON "RefreshSession"("userId");

-- CreateIndex
CREATE INDEX "RefreshSession_expiresAt_idx" ON "RefreshSession"("expiresAt");

-- AddForeignKey
ALTER TABLE "RefreshSession" ADD CONSTRAINT "RefreshSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Booking hot paths (availability overlap, "my bookings", status lists).
CREATE INDEX "Booking_propertyId_checkIn_idx" ON "Booking"("propertyId", "checkIn");
CREATE INDEX "Booking_userId_createdAt_idx" ON "Booking"("userId", "createdAt");
CREATE INDEX "Booking_status_idx" ON "Booking"("status");

-- Payout lists.
CREATE INDEX "Payout_hostId_idx" ON "Payout"("hostId");
CREATE INDEX "Payout_status_idx" ON "Payout"("status");
