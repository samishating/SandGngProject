-- Forced password change on first login. Existing rows default to true too:
-- the only account that exists is the admin, which is about to be given the
-- same temporary password as everyone else.
ALTER TABLE "Profile" ADD COLUMN "mustChangePassword" BOOLEAN NOT NULL DEFAULT true;

CREATE TYPE "SaleProvider" AS ENUM ('MANUAL', 'PAYPAL', 'STRIPE');
CREATE TYPE "SaleApproval" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- PlanPrice becomes USD-only. Every existing row carries a placeholder Stripe
-- price id and no Sale references any of them, so they are rebuilt from the
-- seed rather than migrated across.
DELETE FROM "PlanPrice";
DROP INDEX IF EXISTS "PlanPrice_planId_currency_interval_key";
DROP INDEX IF EXISTS "PlanPrice_stripePriceId_key";
ALTER TABLE "PlanPrice" DROP COLUMN "currency";
ALTER TABLE "PlanPrice" DROP COLUMN "stripePriceId";
ALTER TABLE "PlanPrice" RENAME COLUMN "unitAmount" TO "amountUsd";
ALTER TABLE "PlanPrice" ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
CREATE UNIQUE INDEX "PlanPrice_planId_interval_key" ON "PlanPrice"("planId", "interval");

CREATE TABLE "ExchangeRate" (
    "currency" TEXT NOT NULL,
    "rate" DECIMAL(14,6) NOT NULL,
    "source" TEXT NOT NULL,
    "rateDate" TEXT NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ExchangeRate_pkey" PRIMARY KEY ("currency")
);

-- Sales are recorded by hand now, so nothing Stripe-shaped can stay required.
ALTER TABLE "Sale" ADD COLUMN "provider" "SaleProvider" NOT NULL DEFAULT 'MANUAL';
ALTER TABLE "Sale" ADD COLUMN "approval" "SaleApproval" NOT NULL DEFAULT 'APPROVED';
ALTER TABLE "Sale" ADD COLUMN "amount" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ALTER COLUMN "amount" DROP DEFAULT;
ALTER TABLE "Sale" ADD COLUMN "amountUsd" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Sale" ALTER COLUMN "amountUsd" DROP DEFAULT;
ALTER TABLE "Sale" ADD COLUMN "customerEmail" TEXT;
ALTER TABLE "Sale" ADD COLUMN "note" TEXT;
ALTER TABLE "Sale" ALTER COLUMN "stripeCustomerId" DROP NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "stripeCheckoutSessionId" DROP NOT NULL;
ALTER TABLE "Sale" ALTER COLUMN "mode" DROP NOT NULL;

-- A manually recorded sale has no upstream event to deduplicate against.
ALTER TABLE "CommissionEvent" ALTER COLUMN "stripeEventId" DROP NOT NULL;
ALTER TABLE "CommissionEvent" ALTER COLUMN "stripeObjectId" DROP NOT NULL;
