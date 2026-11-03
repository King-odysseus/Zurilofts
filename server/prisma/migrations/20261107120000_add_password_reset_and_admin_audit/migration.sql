-- Password recovery and the durable administrator audit trail.
--
-- Both objects exist in the schema and in the application code, but no migration
-- carried them. Production runs `prisma migrate deploy`, which applies this
-- folder and nothing else, so the deploy would have brought up code that reads a
-- column the database does not have. Prisma selects every scalar field of a model
-- unless the query names fields, so it is not only password recovery that breaks:
-- every read of User fails with "column does not exist", sign-in included.
--
-- `credentialVersion` is NOT NULL DEFAULT 0 because every existing account is on
-- version 0, which is exactly the value a reset link issued today is bound to, so
-- no backfill is needed and no account is locked out by the deploy.
--
-- PasswordResetToken stores only the sha256 of a token, so a database leak cannot
-- be turned into a working reset link. AdminAuditEvent keeps its own snapshot of
-- the target (label and id) because the record it describes may be deleted later
-- and the trail has to survive that.

ALTER TABLE "User" ADD COLUMN "credentialVersion" INTEGER NOT NULL DEFAULT 0;

CREATE TABLE "PasswordResetToken" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "tokenHash" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "credentialVersion" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PasswordResetToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "PasswordResetToken_tokenHash_key" ON "PasswordResetToken"("tokenHash");

CREATE INDEX "PasswordResetToken_userId_expiresAt_idx" ON "PasswordResetToken"("userId", "expiresAt");

CREATE INDEX "PasswordResetToken_expiresAt_idx" ON "PasswordResetToken"("expiresAt");

CREATE TABLE "AdminAuditEvent" (
    "id" TEXT NOT NULL,
    "actorId" TEXT,
    "actorEmail" TEXT,
    "actorRole" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "targetType" TEXT NOT NULL,
    "targetId" TEXT,
    "targetLabel" TEXT,
    "reason" TEXT,
    "metadataJson" TEXT,
    "ipAddress" TEXT,
    "userAgent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AdminAuditEvent_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AdminAuditEvent_createdAt_idx" ON "AdminAuditEvent"("createdAt");

CREATE INDEX "AdminAuditEvent_actorId_idx" ON "AdminAuditEvent"("actorId");

CREATE INDEX "AdminAuditEvent_action_idx" ON "AdminAuditEvent"("action");

CREATE INDEX "AdminAuditEvent_targetType_targetId_idx" ON "AdminAuditEvent"("targetType", "targetId");

ALTER TABLE "PasswordResetToken" ADD CONSTRAINT "PasswordResetToken_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
