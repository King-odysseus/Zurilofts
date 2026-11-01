-- Hosts' reviews of the guests who stayed with them.
--
-- Its own table rather than a second "Review" row: "Review"."bookingId" is
-- unique (one guest review per booking), and the property rating aggregate sums
-- "Review" rows only, so a guest rating stored there could be counted into a
-- listing's score. No backfill: every stay before this migration simply has no
-- host review.

CREATE TABLE "GuestReview" (
  "id" TEXT NOT NULL,
  "bookingId" TEXT NOT NULL,
  "hostId" TEXT NOT NULL,
  "guestId" TEXT NOT NULL,
  "propertyId" TEXT NOT NULL,
  "rating" INTEGER NOT NULL,
  "publicComment" TEXT,
  "privateNote" TEXT,
  "hidden" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "GuestReview_pkey" PRIMARY KEY ("id")
);

-- One host review per stay, mirroring the unique bookingId on "Review".
CREATE UNIQUE INDEX "GuestReview_bookingId_key" ON "GuestReview"("bookingId");

CREATE INDEX "GuestReview_guestId_idx" ON "GuestReview"("guestId");
CREATE INDEX "GuestReview_hostId_idx" ON "GuestReview"("hostId");
CREATE INDEX "GuestReview_propertyId_idx" ON "GuestReview"("propertyId");

-- Deleting a booking takes its host review with it. The host, guest and
-- property rows are referenced rather than owned, so RESTRICT stops a delete
-- from silently discarding a review that still points at them.
ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_bookingId_fkey"
  FOREIGN KEY ("bookingId") REFERENCES "Booking"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_hostId_fkey"
  FOREIGN KEY ("hostId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_guestId_fkey"
  FOREIGN KEY ("guestId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "GuestReview" ADD CONSTRAINT "GuestReview_propertyId_fkey"
  FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
