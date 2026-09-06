-- Feature: host drop-a-pin address confirmation on listings + per-property
-- automated host messages delivered into the booking conversation.
-- Additive only: one nullable Property column, two new tables.

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "address" TEXT;

-- CreateTable
CREATE TABLE "PropertyMessageTemplate" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "propertyId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "offsetDays" INTEGER,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "PropertyMessageTemplate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AutomatedMessageLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "bookingId" TEXT NOT NULL,
    "trigger" TEXT NOT NULL,
    "messageId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AutomatedMessageLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyMessageTemplate_propertyId_trigger_key" ON "PropertyMessageTemplate"("propertyId", "trigger");

-- CreateIndex
CREATE INDEX "PropertyMessageTemplate_propertyId_idx" ON "PropertyMessageTemplate"("propertyId");

-- CreateIndex
CREATE UNIQUE INDEX "AutomatedMessageLog_bookingId_trigger_key" ON "AutomatedMessageLog"("bookingId", "trigger");

-- CreateIndex
CREATE INDEX "AutomatedMessageLog_bookingId_idx" ON "AutomatedMessageLog"("bookingId");

-- AddForeignKey
ALTER TABLE "PropertyMessageTemplate" ADD CONSTRAINT "PropertyMessageTemplate_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AutomatedMessageLog" ADD CONSTRAINT "AutomatedMessageLog_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;
