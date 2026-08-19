import { requireGuestScope } from "@/lib/guest";
import { prisma } from "@/lib/prisma";
import GuestShell from "@/components/guest/GuestShell";
import RequestsFlow from "./RequestsFlow";
import { format } from "date-fns";

export default async function GuestRequestsPage() {
  const { reservation, property } = await requireGuestScope();

  const requests = await prisma.guestRequest.findMany({
    where: { reservationId: reservation.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <GuestShell title={property.name} activeHref="/guest/requests">
      <RequestsFlow
        checkInISO={format(reservation.checkIn, "yyyy-MM-dd")}
        checkOutISO={format(reservation.checkOut, "yyyy-MM-dd")}
        basePrice={property.basePrice}
        initialRequests={requests.map((r) => ({
          id: r.id,
          type: r.type,
          requestedCheckOut: r.requestedCheckOut ? format(r.requestedCheckOut, "yyyy-MM-dd") : null,
          requestedTime: r.requestedTime,
          quantity: r.quantity,
          note: r.note,
          estimatedPrice: r.estimatedPrice,
          status: r.status,
          createdAt: r.createdAt.toISOString(),
        }))}
      />
    </GuestShell>
  );
}
