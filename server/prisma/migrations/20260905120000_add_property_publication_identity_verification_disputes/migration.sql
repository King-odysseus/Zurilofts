-- Separates listing publication from host account verification, adds
-- guest-facing identity verification, and adds booking-linked disputes.
--
-- Property.status is additive with a DRAFT default (matching new listings
-- created after this deploy), so every row that already exists at migration
-- time is explicitly backfilled to PUBLISHED immediately after the column is
-- added - those listings were already live under the old (statusless) model
-- and must stay visible to guests.

-- AlterTable
ALTER TABLE "Property" ADD COLUMN "status" TEXT NOT NULL DEFAULT 'DRAFT';
ALTER TABLE "Property" ADD COLUMN "listingReviewNote" TEXT;
ALTER TABLE "Property" ADD COLUMN "listingReviewedBy" TEXT;
ALTER TABLE "Property" ADD COLUMN "submittedAt" TIMESTAMP(3);
ALTER TABLE "Property" ADD COLUMN "listingReviewedAt" TIMESTAMP(3);

-- Preserve existing live listings: every property that existed before this
-- migration predates the DRAFT/PENDING_REVIEW/PUBLISHED lifecycle and was
-- already publicly bookable, so it must come back as PUBLISHED, not DRAFT.
UPDATE "Property" SET "status" = 'PUBLISHED';

-- CreateIndex
CREATE INDEX "Property_status_idx" ON "Property"("status");

-- CreateTable
CREATE TABLE "IdentityVerification" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'UNVERIFIED',
    "fullName" TEXT,
    "dateOfBirth" TEXT,
    "idType" TEXT,
    "idNumber" TEXT,
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "IdentityVerification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerification_userId_key" ON "IdentityVerification"("userId");

-- CreateIndex
CREATE INDEX "IdentityVerification_status_idx" ON "IdentityVerification"("status");

-- AddForeignKey
ALTER TABLE "IdentityVerification" ADD CONSTRAINT "IdentityVerification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "IdentityVerificationDocument" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "verificationId" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "authTag" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IdentityVerificationDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IdentityVerificationDocument_verificationId_kind_key" ON "IdentityVerificationDocument"("verificationId", "kind");

-- CreateIndex
CREATE INDEX "IdentityVerificationDocument_verificationId_idx" ON "IdentityVerificationDocument"("verificationId");

-- AddForeignKey
ALTER TABLE "IdentityVerificationDocument" ADD CONSTRAINT "IdentityVerificationDocument_verificationId_fkey" FOREIGN KEY ("verificationId") REFERENCES "IdentityVerification"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "Dispute" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "bookingId" TEXT NOT NULL,
    "raisedById" TEXT NOT NULL,
    "raisedByRole" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "resolution" TEXT,
    "resolvedBy" TEXT,
    "resolvedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Dispute_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Dispute_bookingId_idx" ON "Dispute"("bookingId");

-- CreateIndex
CREATE INDEX "Dispute_status_idx" ON "Dispute"("status");

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_bookingId_fkey" FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Dispute" ADD CONSTRAINT "Dispute_raisedById_fkey" FOREIGN KEY ("raisedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DisputeEvidence" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "disputeId" TEXT NOT NULL,
    "uploadedBy" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "size" INTEGER NOT NULL,
    "ciphertext" BYTEA NOT NULL,
    "iv" BYTEA NOT NULL,
    "authTag" BYTEA NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisputeEvidence_disputeId_idx" ON "DisputeEvidence"("disputeId");

-- AddForeignKey
ALTER TABLE "DisputeEvidence" ADD CONSTRAINT "DisputeEvidence_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DisputeMessage" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "disputeId" TEXT NOT NULL,
    "senderId" TEXT NOT NULL,
    "senderRole" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeMessage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisputeMessage_disputeId_createdAt_idx" ON "DisputeMessage"("disputeId", "createdAt");

-- AddForeignKey
ALTER TABLE "DisputeMessage" ADD CONSTRAINT "DisputeMessage_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DisputeNote" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "disputeId" TEXT NOT NULL,
    "authorId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisputeNote_disputeId_createdAt_idx" ON "DisputeNote"("disputeId", "createdAt");

-- AddForeignKey
ALTER TABLE "DisputeNote" ADD CONSTRAINT "DisputeNote_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- CreateTable
CREATE TABLE "DisputeAudit" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "disputeId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "note" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "DisputeAudit_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "DisputeAudit_disputeId_createdAt_idx" ON "DisputeAudit"("disputeId", "createdAt");

-- AddForeignKey
ALTER TABLE "DisputeAudit" ADD CONSTRAINT "DisputeAudit_disputeId_fkey" FOREIGN KEY ("disputeId") REFERENCES "Dispute"("id") ON DELETE CASCADE ON UPDATE CASCADE;
