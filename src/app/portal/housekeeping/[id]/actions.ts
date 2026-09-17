"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import type { ReviewStatus } from "@prisma/client";

const DEFAULT_NOTE: Record<ReviewStatus, string> = {
  APPROVED: "Approved — looks good",
  REJECTED: "Rejected — redo required",
  RETURNED: "Returned for follow-up",
};

export async function reviewRoomCheck(roomCheckId: string, status: ReviewStatus, note?: string) {
  const user = await requireRole("STAFF");
  await prisma.jobRoomCheck.update({
    where: { id: roomCheckId },
    data: {
      reviewedAt: new Date(),
      reviewedBy: user.name,
      reviewStatus: status,
      reviewNote: note?.trim() || DEFAULT_NOTE[status],
    },
  });
  revalidatePath("/portal/audits");
  revalidatePath("/portal/housekeeping");
}

export async function returnRoomCheckWithComment(formData: FormData) {
  const roomCheckId = String(formData.get("roomCheckId") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  if (!roomCheckId || !note) return;
  await reviewRoomCheck(roomCheckId, "RETURNED", note);
}
