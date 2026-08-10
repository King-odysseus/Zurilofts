ALTER TABLE "HostApplication"
  ADD COLUMN "legalName" TEXT,
  ADD COLUMN "dateOfBirth" TEXT,
  ADD COLUMN "nationality" TEXT,
  ADD COLUMN "identityType" TEXT,
  ADD COLUMN "kraPin" TEXT,
  ADD COLUMN "companyRegistrationNo" TEXT,
  ADD COLUMN "propertyRelationship" TEXT,
  ADD COLUMN "propertyTypesJson" TEXT,
  ADD COLUMN "propertyLocations" TEXT,
  ADD COLUMN "yearsHosting" INTEGER,
  ADD COLUMN "preferredPayoutMethod" TEXT,
  ADD COLUMN "agreedTerms" BOOLEAN NOT NULL DEFAULT false;

CREATE TABLE "HostApplicationDocument" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "kind" TEXT NOT NULL,
  "originalName" TEXT NOT NULL,
  "mimeType" TEXT NOT NULL,
  "size" INTEGER NOT NULL,
  "ciphertext" BYTEA NOT NULL,
  "iv" BYTEA NOT NULL,
  "authTag" BYTEA NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "HostApplicationDocument_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HostApplicationDocument_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "HostApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX "HostApplicationDocument_applicationId_kind_key" ON "HostApplicationDocument"("applicationId", "kind");
CREATE INDEX "HostApplicationDocument_applicationId_idx" ON "HostApplicationDocument"("applicationId");

CREATE TABLE "HostApplicationAudit" (
  "id" TEXT NOT NULL,
  "applicationId" TEXT NOT NULL,
  "actorId" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "note" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "HostApplicationAudit_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "HostApplicationAudit_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "HostApplication"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE INDEX "HostApplicationAudit_applicationId_createdAt_idx" ON "HostApplicationAudit"("applicationId", "createdAt");
