-- Gate HOST activation behind an application. Additive and production-safe:
-- a new nullable table plus a back-relation. No existing rows are touched, and
-- no existing HOST/ADMIN users are demoted or migrated.

-- CreateTable
CREATE TABLE "HostApplication" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "userId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "businessName" TEXT,
    "businessType" TEXT,
    "contactPhone" TEXT,
    "contactEmail" TEXT,
    "city" TEXT,
    "propertyCount" INTEGER,
    "experience" TEXT,
    "reviewNote" TEXT,
    "reviewedBy" TEXT,
    "submittedAt" TIMESTAMP(3),
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "HostApplication_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "HostApplication_userId_key" ON "HostApplication"("userId");

-- CreateIndex
CREATE INDEX "HostApplication_status_idx" ON "HostApplication"("status");

-- AddForeignKey
ALTER TABLE "HostApplication" ADD CONSTRAINT "HostApplication_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
