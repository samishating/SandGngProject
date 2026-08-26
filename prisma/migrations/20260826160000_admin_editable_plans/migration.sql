-- Plan copy moves into the database so an admin can add an offer or reword an
-- existing one without a code change. Previously each plan's wording lived in
-- the pricing component AND in five locale files, so a new plan meant editing
-- six places and shipping.
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "badge" TEXT;

-- { "fr": { "name": ..., "description": ..., "badge": ... }, ... }
-- Absent locales and absent fields fall back to the columns above.
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "translations" JSONB;

ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isFeatured" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "isActive" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Plan" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Preserve the order and emphasis the hardcoded page already had, so the
-- pricing page looks identical the moment it starts reading from here.
UPDATE "Plan" SET "sortOrder" = 10 WHERE "key" = 'one-off';
UPDATE "Plan" SET "sortOrder" = 20, "isFeatured" = true WHERE "key" = 'household';
UPDATE "Plan" SET "sortOrder" = 30 WHERE "key" = 'family-elders';
