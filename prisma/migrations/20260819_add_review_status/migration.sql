-- CreateEnum
CREATE TYPE "ReviewStatus" AS ENUM ('APPROVED', 'REJECTED', 'RETURNED');

-- AlterTable
ALTER TABLE "JobRoomCheck" ADD COLUMN     "reviewStatus" "ReviewStatus";

