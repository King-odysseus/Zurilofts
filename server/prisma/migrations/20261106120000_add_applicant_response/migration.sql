-- Host's written reply to a request for more information.
--
-- Without this column a reviewer could ask for more detail, but the answer had
-- nowhere to go except edited fields or a new upload. Nullable so every existing
-- application keeps working unchanged.
ALTER TABLE "HostApplication" ADD COLUMN "applicantResponse" TEXT;
