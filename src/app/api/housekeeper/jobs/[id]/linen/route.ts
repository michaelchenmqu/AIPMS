import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LINEN_UNIT_COST } from "@/lib/billing";
import type { LinenItem } from "@prisma/client";

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "HOUSEKEEPER") return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job || job.assignedUserId !== user.id) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json();
  const item = body.item as LinenItem;
  const quantity = Math.max(0, Math.min(20, Number(body.quantity) || 0));
  if (!(item in LINEN_UNIT_COST)) return NextResponse.json({ error: "Invalid item" }, { status: 400 });

  const existing = await prisma.linenUsage.findFirst({ where: { jobId: job.id, item } });
  const usage =
    quantity === 0 && existing
      ? await prisma.linenUsage.delete({ where: { id: existing.id } }).then(() => null)
      : existing
      ? await prisma.linenUsage.update({ where: { id: existing.id }, data: { quantity } })
      : quantity > 0
      ? await prisma.linenUsage.create({
          data: { jobId: job.id, item, quantity, unitCost: LINEN_UNIT_COST[item] },
        })
      : null;

  return NextResponse.json({ usage });
}
