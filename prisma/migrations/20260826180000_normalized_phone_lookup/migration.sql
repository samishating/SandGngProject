-- Phone search was failing outright: an agent types "555 010 2030" while the
-- customer entered "+1 (555) 010-2030", and a LIKE against the raw column
-- matches neither direction. This stores the digits alongside, so the lookup
-- compares like with like against an index.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "customerPhoneDigits" TEXT;

UPDATE "Sale"
SET "customerPhoneDigits" = regexp_replace("customerPhone", '\D', '', 'g')
WHERE "customerPhone" IS NOT NULL AND "customerPhoneDigits" IS NULL;

DROP INDEX IF EXISTS "Sale_customerPhone_idx";
CREATE INDEX IF NOT EXISTS "Sale_customerPhoneDigits_idx" ON "Sale"("customerPhoneDigits");
