-- PlanPrice table is empty at this point (no seed has run yet), so the new
-- column can be added as NOT NULL directly, no backfill needed.
ALTER TABLE "PlanPrice" ADD COLUMN "interval" TEXT NOT NULL;

DROP INDEX "PlanPrice_planId_currency_key";

CREATE UNIQUE INDEX "PlanPrice_planId_currency_interval_key" ON "PlanPrice"("planId", "currency", "interval");
