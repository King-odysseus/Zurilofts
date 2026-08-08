-- CreateTable
CREATE TABLE "Shortlist" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "ownerId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "token" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Shortlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ShortlistItem" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid()::text,
    "shortlistId" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "note" TEXT,
    "addedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ShortlistItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Shortlist_token_key" ON "Shortlist"("token");

-- CreateIndex
CREATE INDEX "Shortlist_ownerId_idx" ON "Shortlist"("ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "ShortlistItem_shortlistId_propertyId_key" ON "ShortlistItem"("shortlistId", "propertyId");

-- CreateIndex
CREATE INDEX "ShortlistItem_shortlistId_idx" ON "ShortlistItem"("shortlistId");

-- AddForeignKey
ALTER TABLE "Shortlist" ADD CONSTRAINT "Shortlist_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_shortlistId_fkey" FOREIGN KEY ("shortlistId") REFERENCES "Shortlist"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ShortlistItem" ADD CONSTRAINT "ShortlistItem_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
