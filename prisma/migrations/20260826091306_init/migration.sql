-- CreateEnum
CREATE TYPE "Role" AS ENUM ('ADMIN', 'SALESPERSON');

-- CreateEnum
CREATE TYPE "CommissionType" AS ENUM ('PERCENTAGE', 'FLAT');

-- CreateEnum
CREATE TYPE "CommissionScope" AS ENUM ('SALESPERSON_DEFAULT', 'PLAN_SPECIFIC');

-- CreateEnum
CREATE TYPE "StripeMode" AS ENUM ('PAYMENT', 'SUBSCRIPTION');

-- CreateEnum
CREATE TYPE "SaleStatus" AS ENUM ('ACTIVE', 'CANCELED', 'REFUNDED');

-- CreateEnum
CREATE TYPE "SaleEventType" AS ENUM ('INITIAL_PURCHASE', 'RENEWAL', 'REFUND_REVERSAL');

-- CreateTable
CREATE TABLE "Profile" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "Role" NOT NULL,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Profile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ReferralTag" (
    "id" TEXT NOT NULL,
    "tag" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ReferralTag_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Plan" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isRecurring" BOOLEAN NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Plan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanPrice" (
    "id" TEXT NOT NULL,
    "planId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "stripePriceId" TEXT NOT NULL,
    "unitAmount" INTEGER NOT NULL,

    CONSTRAINT "PlanPrice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionRule" (
    "id" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "scope" "CommissionScope" NOT NULL,
    "planId" TEXT,
    "type" "CommissionType" NOT NULL,
    "currency" TEXT,
    "value" DECIMAL(10,4) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "effectiveTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommissionRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Sale" (
    "id" TEXT NOT NULL,
    "referralTagId" TEXT,
    "salespersonId" TEXT,
    "planId" TEXT NOT NULL,
    "currency" TEXT NOT NULL,
    "stripeCustomerId" TEXT NOT NULL,
    "stripeCheckoutSessionId" TEXT NOT NULL,
    "stripeSubscriptionId" TEXT,
    "stripePaymentIntentId" TEXT,
    "mode" "StripeMode" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'ACTIVE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Sale_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommissionEvent" (
    "id" TEXT NOT NULL,
    "saleId" TEXT NOT NULL,
    "salespersonId" TEXT NOT NULL,
    "eventType" "SaleEventType" NOT NULL,
    "stripeEventId" TEXT NOT NULL,
    "stripeObjectId" TEXT NOT NULL,
    "stripePaymentIntentId" TEXT,
    "grossAmount" INTEGER NOT NULL,
    "currency" TEXT NOT NULL,
    "commissionRuleId" TEXT,
    "commissionType" "CommissionType",
    "commissionValue" DECIMAL(10,4),
    "commissionAmount" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CommissionEvent_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Profile_email_key" ON "Profile"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ReferralTag_tag_key" ON "ReferralTag"("tag");

-- CreateIndex
CREATE INDEX "ReferralTag_salespersonId_idx" ON "ReferralTag"("salespersonId");

-- CreateIndex
CREATE UNIQUE INDEX "Plan_key_key" ON "Plan"("key");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_stripePriceId_key" ON "PlanPrice"("stripePriceId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanPrice_planId_currency_key" ON "PlanPrice"("planId", "currency");

-- CreateIndex
CREATE INDEX "CommissionRule_salespersonId_planId_isActive_idx" ON "CommissionRule"("salespersonId", "planId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_stripeCheckoutSessionId_key" ON "Sale"("stripeCheckoutSessionId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_stripeSubscriptionId_key" ON "Sale"("stripeSubscriptionId");

-- CreateIndex
CREATE UNIQUE INDEX "Sale_stripePaymentIntentId_key" ON "Sale"("stripePaymentIntentId");

-- CreateIndex
CREATE INDEX "Sale_salespersonId_idx" ON "Sale"("salespersonId");

-- CreateIndex
CREATE INDEX "Sale_referralTagId_idx" ON "Sale"("referralTagId");

-- CreateIndex
CREATE UNIQUE INDEX "CommissionEvent_stripeEventId_key" ON "CommissionEvent"("stripeEventId");

-- CreateIndex
CREATE INDEX "CommissionEvent_salespersonId_createdAt_idx" ON "CommissionEvent"("salespersonId", "createdAt");

-- CreateIndex
CREATE INDEX "CommissionEvent_stripePaymentIntentId_idx" ON "CommissionEvent"("stripePaymentIntentId");

-- AddForeignKey
ALTER TABLE "ReferralTag" ADD CONSTRAINT "ReferralTag_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlanPrice" ADD CONSTRAINT "PlanPrice_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionRule" ADD CONSTRAINT "CommissionRule_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_referralTagId_fkey" FOREIGN KEY ("referralTagId") REFERENCES "ReferralTag"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Profile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Sale" ADD CONSTRAINT "Sale_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEvent" ADD CONSTRAINT "CommissionEvent_saleId_fkey" FOREIGN KEY ("saleId") REFERENCES "Sale"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEvent" ADD CONSTRAINT "CommissionEvent_salespersonId_fkey" FOREIGN KEY ("salespersonId") REFERENCES "Profile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CommissionEvent" ADD CONSTRAINT "CommissionEvent_commissionRuleId_fkey" FOREIGN KEY ("commissionRuleId") REFERENCES "CommissionRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;
