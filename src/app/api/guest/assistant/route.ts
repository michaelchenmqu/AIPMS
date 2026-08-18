import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/guest";
import { prisma } from "@/lib/prisma";
import { guestConciergeChat } from "@/lib/ai";

export async function POST(req: Request) {
  const scope = await getGuestSession();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservation, property } = scope;

  const body = await req.json();
  const content = String(body.content ?? "").slice(0, 2000);
  if (!content.trim()) return NextResponse.json({ error: "Empty message" }, { status: 400 });

  await prisma.guestChatMessage.create({ data: { reservationId: reservation.id, role: "USER", content } });

  const history = await prisma.guestChatMessage.findMany({
    where: { reservationId: reservation.id },
    orderBy: { createdAt: "asc" },
  });

  const reply = await guestConciergeChat(
    history.map((m) => ({ role: m.role === "USER" ? ("user" as const) : ("assistant" as const), content: m.content })),
    {
      name: property.name,
      address: property.address,
      wifiNetwork: property.wifiNetwork,
      wifiPassword: property.wifiPassword,
      checkoutTime: property.checkoutTime,
      houseManual: property.houseManual,
    }
  );

  const saved = await prisma.guestChatMessage.create({
    data: { reservationId: reservation.id, role: "ASSISTANT", content: reply },
  });

  return NextResponse.json({ message: saved });
}
