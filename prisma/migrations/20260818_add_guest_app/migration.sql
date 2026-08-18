-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "checkoutTime" TEXT NOT NULL DEFAULT '10:00 AM',
ADD COLUMN     "houseManual" TEXT,
ADD COLUMN     "wifiNetwork" TEXT,
ADD COLUMN     "wifiPassword" TEXT;

-- CreateTable
CREATE TABLE "GuestChatMessage" (
    "id" TEXT NOT NULL,
    "reservationId" TEXT NOT NULL,
    "role" "ChatRole" NOT NULL,
    "content" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GuestChatMessage_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "GuestChatMessage" ADD CONSTRAINT "GuestChatMessage_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

