-- Guest/host/admin cancellation + refund tracking on bookings.
-- Additive, nullable columns - no backfill needed.

-- AlterTable
ALTER TABLE "Booking" ADD COLUMN "cancelledAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "cancelledBy" TEXT;
ALTER TABLE "Booking" ADD COLUMN "cancelledById" TEXT;
ALTER TABLE "Booking" ADD COLUMN "refundStatus" TEXT;
ALTER TABLE "Booking" ADD COLUMN "refundedAt" TIMESTAMP(3);
ALTER TABLE "Booking" ADD COLUMN "refundedBy" TEXT;

-- Admin/host queue: bookings awaiting a manual refund decision.
CREATE INDEX "Booking_refundStatus_idx" ON "Booking"("refundStatus");
