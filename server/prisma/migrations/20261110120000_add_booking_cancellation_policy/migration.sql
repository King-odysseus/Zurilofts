-- The cancellation policy the guest was shown before paying.
--
-- The policy has three tiers and will be revised. A guest is entitled to the
-- terms they agreed to at the time, so the version is written onto the booking
-- when it is created rather than looked up from whatever the policy says later.
--
-- Nullable on purpose: bookings taken before this column existed have no
-- recorded version, and inventing one for them would be worse than unknown.

ALTER TABLE "Booking" ADD COLUMN "cancellationPolicyVersion" TEXT;
