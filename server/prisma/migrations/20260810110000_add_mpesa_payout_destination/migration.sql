-- Add host-selectable payout destinations and reusable Paystack recipient data.
-- Existing hosts remain compatible: a null payoutMethod falls back to their
-- existing bank details in the application service.
ALTER TABLE "User"
  ADD COLUMN "payoutMethod" TEXT,
  ADD COLUMN "mpesaPhone" TEXT,
  ADD COLUMN "paystackRecipientCode" TEXT,
  ADD COLUMN "paystackRecipientKey" TEXT;
