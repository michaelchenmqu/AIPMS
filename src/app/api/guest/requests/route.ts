import { NextResponse } from "next/server";
import { differenceInCalendarDays } from "date-fns";
import { getGuestSession } from "@/lib/guest";
import { prisma } from "@/lib/prisma";

const REQUEST_TYPES = [
  "EXTEND_STAY",
  "REDUCE_STAY",
  "EARLY_CHECKIN",
  "LATE_CHECKOUT",
  "EXTRA_CLEANING",
  "EXTRA_BED",
  "AIRPORT_TRANSFER",
  "SPECIAL_OCCASION",
  "OTHER",
] as const;

export async function POST(req: Request) {
  const scope = await getGuestSession();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservation, property } = scope;

  const body = await req.json();
  const type = body.type;
  if (!REQUEST_TYPES.includes(type)) {
    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  }

  const note = typeof body.note === "string" ? body.note.slice(0, 1000) : null;
  const requestedTime = typeof body.requestedTime === "string" ? body.requestedTime.slice(0, 40) : null;
  const quantity = Number.isFinite(body.quantity) ? Math.max(1, Math.min(10, Math.round(body.quantity))) : null;

  const requestedCheckIn: Date | null = null;
  let requestedCheckOut: Date | null = null;
  let estimatedPrice: number | null = null;

  if (type === "EXTEND_STAY" || type === "REDUCE_STAY") {
    const rawDate = typeof body.requestedCheckOut === "string" ? new Date(body.requestedCheckOut) : null;
    if (!rawDate || isNaN(rawDate.getTime())) {
      return NextResponse.json({ error: "A valid new checkout date is required" }, { status: 400 });
    }
    if (type === "EXTEND_STAY" && rawDate.getTime() <= reservation.checkOut.getTime()) {
      return NextResponse.json({ error: "Extended checkout must be after the current checkout" }, { status: 400 });
    }
    if (type === "REDUCE_STAY" && (rawDate.getTime() >= reservation.checkOut.getTime() || rawDate.getTime() <= reservation.checkIn.getTime())) {
      return NextResponse.json({ error: "Earlier checkout must be between check-in and the current checkout" }, { status: 400 });
    }
    requestedCheckOut = rawDate;

    // Server-computed — never trust a client-supplied price.
    const nightsDelta = Math.abs(differenceInCalendarDays(rawDate, reservation.checkOut));
    estimatedPrice = nightsDelta * property.basePrice;
  }

  const created = await prisma.guestRequest.create({
    data: {
      reservationId: reservation.id,
      type,
      requestedCheckIn,
      requestedCheckOut,
      requestedTime,
      quantity,
      note,
      estimatedPrice,
    },
  });

  return NextResponse.json({ request: created });
}
