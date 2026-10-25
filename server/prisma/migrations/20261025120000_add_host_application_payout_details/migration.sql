-- A host application must record where the money should go, not just the chosen
-- method, so approval can hand Paystack a real destination. All nullable: existing
-- applications keep loading, and applicants are asked for the details on their
-- next edit.
ALTER TABLE "HostApplication"
  ADD COLUMN "payoutBankName" TEXT,
  ADD COLUMN "payoutBankCode" TEXT,
  ADD COLUMN "payoutBankAccountNo" TEXT,
  ADD COLUMN "payoutMpesaPhone" TEXT;
