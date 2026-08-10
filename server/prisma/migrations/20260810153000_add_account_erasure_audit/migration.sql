ALTER TABLE "User" ADD COLUMN "deletedAt" TIMESTAMP(3);

CREATE TABLE "AccountErasureLog" (
    "id" TEXT NOT NULL,
    "targetUserId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "actorRole" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "reason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountErasureLog_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AccountErasureLog_targetUserId_idx" ON "AccountErasureLog"("targetUserId");
CREATE INDEX "AccountErasureLog_actorId_idx" ON "AccountErasureLog"("actorId");
