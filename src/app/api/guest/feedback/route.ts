import { NextResponse } from "next/server";
import { getGuestSession } from "@/lib/guest";
import { prisma } from "@/lib/prisma";

function toRating(value: unknown): number | null {
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return Math.max(1, Math.min(5, Math.round(n)));
}

export async function POST(req: Request) {
  const scope = await getGuestSession();
  if (!scope) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { reservation } = scope;

  const body = await req.json();
  const overallRating = toRating(body.overallRating);
  if (!overallRating) {
    return NextResponse.json({ error: "An overall rating is required" }, { status: 400 });
  }

  const data = {
    overallRating,
    cleanlinessRating: toRating(body.cleanlinessRating),
    communicationRating: toRating(body.communicationRating),
    accuracyRating: toRating(body.accuracyRating),
    comment: typeof body.comment === "string" ? body.comment.slice(0, 2000) || null : null,
  };

  const saved = await prisma.guestFeedback.upsert({
    where: { reservationId: reservation.id },
    create: { reservationId: reservation.id, ...data },
    update: data,
  });

  return NextResponse.json({ feedback: saved });
}
