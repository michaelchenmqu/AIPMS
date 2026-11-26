-- CreateTable
CREATE TABLE "PricingRule" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "weekendMultiplier" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "minPrice" DOUBLE PRECISION,
    "longStayNights" INTEGER NOT NULL DEFAULT 0,
    "longStayDiscountPercent" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiRationale" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PricingRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PricingSeason" (
    "id" TEXT NOT NULL,
    "pricingRuleId" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "startMonth" INTEGER NOT NULL,
    "startDay" INTEGER NOT NULL,
    "endMonth" INTEGER NOT NULL,
    "endDay" INTEGER NOT NULL,
    "multiplier" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "PricingSeason_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PricingRule_propertyId_key" ON "PricingRule"("propertyId");

-- AddForeignKey
ALTER TABLE "PricingRule" ADD CONSTRAINT "PricingRule_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PricingSeason" ADD CONSTRAINT "PricingSeason_pricingRuleId_fkey" FOREIGN KEY ("pricingRuleId") REFERENCES "PricingRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;
