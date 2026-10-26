-- Host growth programme: a capped founding-host rate, referral rewards, and
-- signup nudges for an application left half-finished.
--
-- foundingHost is set at approval while FOUNDING_HOST_LIMIT places remain and
-- lowers that host's commission for life. The referral columns record the code
-- an applicant typed (referredByCode, resolved to referredByHostId) and the code
-- the host owns and can share (ownReferralCode, unique so two hosts cannot claim
-- the same code).
ALTER TABLE "HostApplication"
  ADD COLUMN "foundingHost" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "ownReferralCode" TEXT,
  ADD COLUMN "referredByCode" TEXT,
  ADD COLUMN "referredByHostId" TEXT,
  ADD COLUMN "nudgeCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastNudgeAt" TIMESTAMP(3);

-- Nulls are distinct in a unique index, so every existing application keeps its
-- row and only a host that has been given a code participates.
CREATE UNIQUE INDEX "HostApplication_ownReferralCode_key" ON "HostApplication"("ownReferralCode");

-- One row per referred host, so the reward can only be credited once however
-- many times the release sweep runs. Referrer ids are bare strings, like
-- Payout.initiatedBy, to keep User free of a growing set of back-relations.
CREATE TABLE "HostReferral" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "referrerHostId" TEXT NOT NULL,
  "referredHostId" TEXT NOT NULL,
  "amount" INTEGER NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "creditedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "HostReferral_referredHostId_key" ON "HostReferral"("referredHostId");
CREATE INDEX "HostReferral_referrerHostId_idx" ON "HostReferral"("referrerHostId");
CREATE INDEX "HostReferral_status_idx" ON "HostReferral"("status");
