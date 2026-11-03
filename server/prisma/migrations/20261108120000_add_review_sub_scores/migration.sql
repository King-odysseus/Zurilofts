-- Guest review sub-scores.
--
-- The Review model has carried cleanlinessRating, locationRating and valueRating
-- in both schemas, and the review form has collected them, but no migration ever
-- added the columns. Production runs `prisma migrate deploy`, which applies this
-- folder and nothing else, so the columns were absent there.
--
-- Prisma selects every scalar field of a model unless a query names its fields,
-- so this did not only break submitting a review. Every read of Review failed
-- with P2022 "column does not exist", which took down the reviews section of
-- every listing page: GET /api/properties/:id/reviews returned 500.
--
-- All three are nullable with no default, matching `Int?` in the schema. Existing
-- reviews simply carry no sub-score, which is the honest state: they were written
-- before the scores were stored, and inventing a value would put a number under a
-- guest's name that they never gave.

ALTER TABLE "Review" ADD COLUMN "cleanlinessRating" INTEGER;

ALTER TABLE "Review" ADD COLUMN "locationRating" INTEGER;

ALTER TABLE "Review" ADD COLUMN "valueRating" INTEGER;
