import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "HOUSEKEEPER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.assignedUserId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (job.status !== "PENDING") return NextResponse.json({ error: "Job already accepted" }, { status: 400 });

  const updated = await prisma.job.update({ where: { id }, data: { status: "ACCEPTED" } });
  return NextResponse.json({ job: updated });
}
