-- CreateEnum
CREATE TYPE "ConditionReportType" AS ENUM ('ENTRY', 'EXIT', 'ROUTINE');

-- CreateEnum
CREATE TYPE "InspectionStatus" AS ENUM ('SCHEDULED', 'NOTICE_SENT', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "ConditionReport" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "type" "ConditionReportType" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConditionReport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ConditionRoomCheck" (
    "id" TEXT NOT NULL,
    "conditionReportId" TEXT NOT NULL,
    "room" "RoomKind" NOT NULL,
    "photoUrl" TEXT,
    "matchPercent" INTEGER,
    "flagged" BOOLEAN NOT NULL DEFAULT false,
    "aiNote" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewedBy" TEXT,
    "reviewNote" TEXT,
    "reviewStatus" "ReviewStatus",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ConditionRoomCheck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineInspection" (
    "id" TEXT NOT NULL,
    "leaseId" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "noticeGivenAt" TIMESTAMP(3),
    "status" "InspectionStatus" NOT NULL DEFAULT 'SCHEDULED',
    "conditionReportId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RoutineInspection_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "RoutineInspection_conditionReportId_key" ON "RoutineInspection"("conditionReportId");

-- AddForeignKey
ALTER TABLE "ConditionReport" ADD CONSTRAINT "ConditionReport_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConditionRoomCheck" ADD CONSTRAINT "ConditionRoomCheck_conditionReportId_fkey" FOREIGN KEY ("conditionReportId") REFERENCES "ConditionReport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineInspection" ADD CONSTRAINT "RoutineInspection_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineInspection" ADD CONSTRAINT "RoutineInspection_conditionReportId_fkey" FOREIGN KEY ("conditionReportId") REFERENCES "ConditionReport"("id") ON DELETE SET NULL ON UPDATE CASCADE;
