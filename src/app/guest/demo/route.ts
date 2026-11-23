// A standing "log in as a guest, anytime" shortcut — bookmark this URL and
// it always drops you into an in-progress stay, with no last name/arrival
// date to remember. Each visit re-anchors the same demo Reservation's dates
// to a few days either side of right now (upsert keyed on externalId), so
// it never goes stale the way a fixed-date reservation would, and the
// Guest App's "Night X of Y" display always looks like a real current stay
// instead of a years-long one. Not linked from anywhere guest-facing —
// share the URL directly.

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { setGuestSession } from "@/lib/guest";

const DEMO_EXTERNAL_ID = "demo-guest-standing";
const DEMO_GUEST_NAME = "Taylor Demo";

export async function GET() {
  const property = await prisma.property.findFirstOrThrow({
    where: { lettingMode: "SHORT_TERM" },
    orderBy: { name: "asc" },
  });

  const checkIn = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const checkOut = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);

  const reservation = await prisma.reservation.upsert({
    where: { externalId: DEMO_EXTERNAL_ID },
    update: { checkIn, checkOut, status: "IN_STAY" },
    create: {
      externalId: DEMO_EXTERNAL_ID,
      propertyId: property.id,
      guestName: DEMO_GUEST_NAME,
      channel: "DIRECT",
      checkIn,
      checkOut,
      totalAmount: property.basePrice * 7,
      status: "IN_STAY",
    },
  });

  await setGuestSession(reservation.id);
  redirect("/guest/stay");
}
