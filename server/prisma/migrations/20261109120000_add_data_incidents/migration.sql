-- Personal-data incident register.
--
-- Kenyan data protection guidance expects a controller to report a breach that
-- risks people's rights to the Office of the Data Protection Commissioner within
-- 72 hours of becoming aware of it. That clock cannot be tracked, or even proven
-- to have been met, unless the moment of awareness is written down. This table
-- holds that record.
--
-- There are deliberately no foreign keys: an incident must outlive the staff
-- account that declared it, and it never stores the personal data of the people
-- affected, only a description and a count.

CREATE TABLE "DataIncident" (
    "id" TEXT NOT NULL,
    "reference" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "summary" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "awareAt" TIMESTAMP(3) NOT NULL,
    "dataCategories" TEXT NOT NULL,
    "affectedCount" INTEGER,
    "consequences" TEXT,
    "measuresTaken" TEXT,
    "regulatorNotifiedAt" TIMESTAMP(3),
    "regulatorReference" TEXT,
    "delayReason" TEXT,
    "usersNotifiedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "closingNote" TEXT,
    "declaredById" TEXT NOT NULL,
    "declaredByEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DataIncident_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "DataIncident_reference_key" ON "DataIncident"("reference");

CREATE INDEX "DataIncident_status_idx" ON "DataIncident"("status");

CREATE INDEX "DataIncident_awareAt_idx" ON "DataIncident"("awareAt");
