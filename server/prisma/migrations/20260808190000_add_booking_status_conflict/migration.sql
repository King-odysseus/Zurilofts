-- Add the CONFLICT booking status.
--
-- Used when a guest completes payment but the dates were taken while their
-- hold had lapsed. The booking is neither confirmed nor cancelled: money has
-- changed hands, so an admin resolves it manually.
--
-- ALTER TYPE ... ADD VALUE is safe here: this migration only adds the label and
-- does not write a row using it, so it does not hit the "unsafe use of new
-- value" restriction. IF NOT EXISTS keeps the migration idempotent.
ALTER TYPE "BookingStatus" ADD VALUE IF NOT EXISTS 'CONFLICT';
