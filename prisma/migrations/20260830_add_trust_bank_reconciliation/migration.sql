-- CreateEnum
CREATE TYPE "BankConnectionStatus" AS ENUM ('PENDING', 'ACTIVE', 'FAILED');

-- CreateTable
CREATE TABLE "BankConnection" (
    "id" TEXT NOT NULL,
    "basiqUserId" TEXT NOT NULL,
    "basiqConnectionId" TEXT,
    "institutionName" TEXT,
    "status" "BankConnectionStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankConnection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankTransaction" (
    "id" TEXT NOT NULL,
    "connectionId" TEXT NOT NULL,
    "basiqTransactionId" TEXT NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "description" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "matchedLedgerEntryId" TEXT,

    CONSTRAINT "BankTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_basiqTransactionId_key" ON "BankTransaction"("basiqTransactionId");

-- CreateIndex
CREATE UNIQUE INDEX "BankTransaction_matchedLedgerEntryId_key" ON "BankTransaction"("matchedLedgerEntryId");

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_connectionId_fkey" FOREIGN KEY ("connectionId") REFERENCES "BankConnection"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankTransaction" ADD CONSTRAINT "BankTransaction_matchedLedgerEntryId_fkey" FOREIGN KEY ("matchedLedgerEntryId") REFERENCES "TrustLedgerEntry"("id") ON DELETE SET NULL ON UPDATE CASCADE;
