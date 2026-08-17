"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

export async function reviewRoomCheck(roomCheckId: string, note: string) {
  const user = await requireRole("STAFF");
  await prisma.jobRoomCheck.update({
    where: { id: roomCheckId },
    data: { reviewedAt: new Date(), reviewedBy: user.name, reviewNote: note || "Reviewed — no action needed" },
  });
  revalidatePath("/portal/audits");
  revalidatePath("/portal/housekeeping");
}
