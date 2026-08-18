-- CreateEnum
CREATE TYPE "CampaignStatus" AS ENUM ('SCHEDULED', 'POSTED', 'NEEDS_REVIEW');

-- CreateTable
CREATE TABLE "Campaign" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "vacancyStart" TIMESTAMP(3) NOT NULL,
    "vacancyEnd" TIMESTAMP(3) NOT NULL,
    "caption" TEXT NOT NULL,
    "hashtags" TEXT NOT NULL DEFAULT '[]',
    "platforms" TEXT NOT NULL DEFAULT '[]',
    "status" "CampaignStatus" NOT NULL DEFAULT 'SCHEDULED',
    "reviewNote" TEXT,
    "scheduledAt" TIMESTAMP(3),
    "postedAt" TIMESTAMP(3),
    "reach" INTEGER NOT NULL DEFAULT 0,
    "clicks" INTEGER NOT NULL DEFAULT 0,
    "bookingsAttributed" INTEGER NOT NULL DEFAULT 0,
    "revenueAttributed" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Campaign_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
