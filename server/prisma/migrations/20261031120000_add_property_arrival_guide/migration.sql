-- Arrival guide: what a guest needs once a booking is confirmed - how to get
-- in, the wifi, the house manual and the house rules.
--
-- Kept on the property rather than on each booking so a host writes it once and
-- can correct it later; a booking reads the guide as it stands at check-in.
-- houseRulesJson follows the existing imagesJson/amenitiesJson convention (a
-- JSON string, not a native array) so one service path serves both providers.
ALTER TABLE "Property"
  ADD COLUMN "directions" TEXT,
  ADD COLUMN "checkInMethod" TEXT,
  ADD COLUMN "wifiNetwork" TEXT,
  ADD COLUMN "wifiPassword" TEXT,
  ADD COLUMN "houseManual" TEXT,
  ADD COLUMN "houseRulesJson" TEXT NOT NULL DEFAULT '[]';
