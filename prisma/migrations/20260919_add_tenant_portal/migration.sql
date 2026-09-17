-- AlterEnum
ALTER TYPE "Role" ADD VALUE 'TENANT';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "tenantId" TEXT;

-- AlterTable
ALTER TABLE "WorkOrder" ADD COLUMN "leaseId" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "raisedByTenantId" TEXT;
ALTER TABLE "WorkOrder" ADD COLUMN "urgent" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "User" ADD CONSTRAINT "User_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_leaseId_fkey" FOREIGN KEY ("leaseId") REFERENCES "Lease"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkOrder" ADD CONSTRAINT "WorkOrder_raisedByTenantId_fkey" FOREIGN KEY ("raisedByTenantId") REFERENCES "Tenant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
