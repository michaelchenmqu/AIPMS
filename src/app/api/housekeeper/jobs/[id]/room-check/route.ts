import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { cleanCheckRoom } from "@/lib/ai";
import type { RoomKind } from "@prisma/client";

const ROOMS: RoomKind[] = ["LIVING_ROOM", "BEDROOM", "KITCHEN", "BATHROOM"];

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "HOUSEKEEPER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.assignedUserId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const room = body.room as RoomKind;
  if (!ROOMS.includes(room)) return NextResponse.json({ error: "Invalid room" }, { status: 400 });
  const photoDataUrl = typeof body.photoDataUrl === "string" ? body.photoDataUrl.slice(0, 5_000_000) : null;

  const result = await cleanCheckRoom({ jobId: job.id, room, afterPhotoDataUrl: photoDataUrl });

  const existing = await prisma.jobRoomCheck.findFirst({ where: { jobId: job.id, room } });
  const roomCheck = existing
    ? await prisma.jobRoomCheck.update({
        where: { id: existing.id },
        data: {
          afterPhotoUrl: photoDataUrl,
          matchPercent: result.matchPercent,
          flagged: result.flagged,
          aiNote: result.note,
          reviewedAt: null,
          reviewedBy: null,
          reviewNote: null,
        },
      })
    : await prisma.jobRoomCheck.create({
        data: {
          jobId: job.id,
          room,
          afterPhotoUrl: photoDataUrl,
          matchPercent: result.matchPercent,
          flagged: result.flagged,
          aiNote: result.note,
        },
      });

  return NextResponse.json({ roomCheck });
}
