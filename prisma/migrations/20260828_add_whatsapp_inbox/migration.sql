-- AlterEnum
ALTER TYPE "Channel" ADD VALUE 'WHATSAPP';

-- AlterTable
ALTER TABLE "InboxMessage" ALTER COLUMN "fromEmail" DROP NOT NULL;
ALTER TABLE "InboxMessage" ADD COLUMN     "fromPhone" TEXT;
