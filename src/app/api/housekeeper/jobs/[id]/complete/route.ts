import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { computeJobTotals } from "@/lib/billing";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "HOUSEKEEPER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id }, include: { linenUsage: true } });
  if (!job || job.assignedUserId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!job.arrivalAt) return NextResponse.json({ error: "No arrival recorded" }, { status: 400 });

  const body = await req.json().catch(() => ({}));
  const photoDataUrl = typeof body.photoDataUrl === "string" ? body.photoDataUrl.slice(0, 5_000_000) : null;

  // Server clock again — the elapsed time billed is departureAt - arrivalAt,
  // both server-stamped, never trusting anything the client reports.
  const departureAt = new Date();

  const totals = computeJobTotals({
    arrivalAt: job.arrivalAt,
    departureAt,
    hourlyRate: job.hourlyRate,
    linen: job.linenUsage.map((l) => ({ quantity: l.quantity, unitCost: l.unitCost })),
  });

  const updated = await prisma.job.update({
    where: { id },
    data: { status: "DONE", departureAt, departurePhotoUrl: photoDataUrl, ...totals },
  });

  return NextResponse.json({ job: updated });
}
