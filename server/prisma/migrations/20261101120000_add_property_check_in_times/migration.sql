-- Check-in and checkout times: the window a guest may arrive in and the time
-- they must leave by. Free text, so a host can write "Flexible" where a clock
-- time makes no sense.
--
-- Kept on the property beside the rest of the arrival guide (see the
-- 20261031120000_add_property_arrival_guide migration): the host writes them
-- once in the listing editor and a booking reads them as they stand at check-in.
ALTER TABLE "Property"
  ADD COLUMN "checkInWindowStart" TEXT,
  ADD COLUMN "checkInWindowEnd" TEXT,
  ADD COLUMN "checkOutTime" TEXT;
