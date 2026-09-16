-- AlterTable
ALTER TABLE "Lease" ADD COLUMN "rentReminderSentFor" TIMESTAMP(3);
ALTER TABLE "Lease" ADD COLUMN "arrearsReminderSentFor" TIMESTAMP(3);
ALTER TABLE "Lease" ADD COLUMN "renewalReminderSentAt" TIMESTAMP(3);
