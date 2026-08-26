-- Split across two migrations on purpose: Postgres will not let a newly added
-- enum value be *used* in the same transaction that adds it, and Prisma runs
-- each migration file in its own transaction. This file only adds the value
-- and the reference column; the next one sets the new default.
--
-- BEFORE 'ACTIVE' keeps the physical enum order matching the order declared in
-- schema.prisma, so Prisma doesn't report drift later.
--
-- IF NOT EXISTS is load-bearing, not defensive habit: ALTER TYPE ... ADD VALUE
-- takes effect even when the surrounding transaction rolls back, so a
-- migration that fails on a later statement leaves the label behind and the
-- retry would otherwise die with "enum label already exists".
ALTER TYPE "SaleStatus" ADD VALUE IF NOT EXISTS 'AWAITING_CALLBACK' BEFORE 'ACTIVE';

-- Added nullable, backfilled, then constrained, so existing orders survive.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "reference" TEXT;

-- Backfill any pre-existing order with a code in the same shape the app
-- generates. md5 yields 0-9A-F; translating 0 and 1 away leaves only
-- characters that can't be misread when read aloud, matching the alphabet in
-- lib/order-reference.ts. random() is seeded per row via the id, so two rows
-- can't collide on the unique index below.
UPDATE "Sale"
SET "reference" = translate(upper(substr(md5(random()::text || id), 1, 6)), '01', 'WZ')
WHERE "reference" IS NULL;

ALTER TABLE "Sale" ALTER COLUMN "reference" SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "Sale_reference_key" ON "Sale"("reference");

CREATE INDEX IF NOT EXISTS "Sale_salespersonId_status_idx" ON "Sale"("salespersonId", "status");
