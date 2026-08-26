-- Which price the customer bought. Needed to know when a subscription runs
-- to: the plan alone doesn't say, since a recurring plan sells monthly or
-- yearly. Existing rows default to "month"; the only ones that exist are
-- test orders, and a one-off's period is never read anyway.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "interval" TEXT NOT NULL DEFAULT 'month';

-- The current subscription term. Null until an agent marks the callback Sold,
-- since nothing is running while the order is still a lead.
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "periodStart" TIMESTAMP(3);
ALTER TABLE "Sale" ADD COLUMN IF NOT EXISTS "periodEnd" TIMESTAMP(3);

-- The account finder looks customers up by phone and email; without these
-- every search is a full scan.
CREATE INDEX IF NOT EXISTS "Sale_customerEmail_idx" ON "Sale"("customerEmail");
CREATE INDEX IF NOT EXISTS "Sale_customerPhone_idx" ON "Sale"("customerPhone");

-- Monthly earnings views filter on when the sale landed.
CREATE INDEX IF NOT EXISTS "Sale_salespersonId_createdAt_idx" ON "Sale"("salespersonId", "createdAt");
