-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "channexPropertyId" TEXT;

-- AlterTable
ALTER TABLE "Reservation" ADD COLUMN     "externalId" TEXT;

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN     "emailRecipient" TEXT,
ADD COLUMN     "facebookPostId" TEXT,
ADD COLUMN     "instagramPostId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Reservation_externalId_key" ON "Reservation"("externalId");
