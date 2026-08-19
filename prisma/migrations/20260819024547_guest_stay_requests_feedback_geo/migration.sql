-- CreateEnum
CREATE TYPE "GuestRequestType" AS ENUM ('EXTEND_STAY', 'REDUCE_STAY', 'EARLY_CHECKIN', 'LATE_CHECKOUT', 'EXTRA_CLEANING', 'EXTRA_BED', 'AIRPORT_TRANSFER', 'SPECIAL_OCCASION', 'OTHER');

-- CreateEnum
CREATE TYPE "GuestRequestStatus" AS ENUM ('PENDING', 'APPROVED', 'DECLINED');

-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "latitude" DOUBLE PRECISION,
ADD COLUMN     "longitude" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "GuestRequest" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "type" "GuestRequestType" NOT NULL,
    "requestedCheckIn" TIMESTAMP(3),
    "requestedCheckOut" TIMESTAMP(3),
    "requestedTime" TEXT,
    "quantity" INTEGER,
    "note" TEXT,
    "estimatedPrice" DOUBLE PRECISION,
    "status" "GuestRequestStatus" NOT NULL DEFAULT 'PENDING',
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestRequest_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GuestFeedback" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "overallRating" INTEGER NOT NULL,
    "cleanlinessRating" INTEGER,
    "communicationRating" INTEGER,
    "accuracyRating" INTEGER,
    "comment" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "GuestFeedback_reservationId_key" ON "GuestFeedback"("reservationId");

-- AddForeignKey
ALTER TABLE "GuestRequest" ADD CONSTRAINT "GuestRequest_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GuestFeedback" ADD CONSTRAINT "GuestFeedback_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
