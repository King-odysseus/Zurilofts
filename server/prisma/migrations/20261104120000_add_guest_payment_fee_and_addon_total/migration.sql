-- The guest now pays Paystack's collection fee and it was previously unknown
-- to the books: the booking total included neither the fee nor the add-ons the
-- guest was charged for. Snapshot both on the booking so every booking
-- reconciles against the amount actually collected:
--
--   total = stay + addOnsTotal + paymentFee
--
-- paymentFee is a pass-through to Paystack, not platform income. addOnsTotal is
-- add-on money collected with this booking; add-on changes are locked once a
-- booking is paid, so this snapshot stays true.
ALTER TABLE "Booking"
  ADD COLUMN "paymentFee" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "addOnsTotal" INTEGER NOT NULL DEFAULT 0;
