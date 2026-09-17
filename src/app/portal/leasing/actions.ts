"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireRole } from "@/lib/session";
import { approveInspectionBatch } from "@/lib/leasing";

/** Staff action, "Approve batch" on the AI inspection scheduler — books
 *  every checked lease's inspection for the chosen date and sends its
 *  statutory notice in one step. See lib/leasing.ts#approveInspectionBatch. */
export async function approveInspectionBatchAction(formData: FormData) {
  await requireRole("STAFF");
  const leaseIds = formData.getAll("leaseIds").map(String).filter(Boolean);
  const scheduledForRaw = String(formData.get("scheduledFor") ?? "");
  if (leaseIds.length === 0 || !scheduledForRaw) {
    redirect("/portal/leasing");
  }
  const result = await approveInspectionBatch(leaseIds, new Date(scheduledForRaw));
  revalidatePath("/portal/leasing");
  redirect(`/portal/leasing?scheduled=${result.scheduled}&skipped=${result.skipped}`);
}
