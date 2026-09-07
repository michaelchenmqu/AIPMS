-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT;

-- AlterTable
ALTER TABLE "Property"
  ADD COLUMN "checkInTime" TEXT NOT NULL DEFAULT '3:00 PM',
  ADD COLUMN "binDay" TEXT,
  ADD COLUMN "hasGasBottle" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "Reservation"
  ADD COLUMN "guestPhone" TEXT,
  ADD COLUMN "checkinReminderSentAt" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Job" ADD COLUMN "gasReminderSentAt" TIMESTAMP(3);
