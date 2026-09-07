"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { sendCheckinReminders, sendReviewRequests, sendGasBottleReminders, type ReminderResult } from "@/lib/reminders";

function toQuery(kind: "checkin" | "review" | "gas", result: ReminderResult): string {
  const params = new URLSearchParams({
    [kind]: JSON.stringify({ sent: result.sent, failed: result.failed.length }),
  });
  return `/portal/reminders?${params.toString()}`;
}

export async function runCheckinReminders() {
  await requireRole("STAFF");
  const result = await sendCheckinReminders();
  redirect(toQuery("checkin", result));
}

export async function runReviewRequests() {
  await requireRole("STAFF");
  const result = await sendReviewRequests();
  redirect(toQuery("review", result));
}

export async function runGasBottleReminders() {
  await requireRole("STAFF");
  const result = await sendGasBottleReminders();
  redirect(toQuery("gas", result));
}

/** Staff action, inline "Save" on the phone field next to an arrival with
 *  no guestPhone on file yet — see the "tomorrow's arrivals" preview list. */
export async function setGuestPhone(reservationId: string, formData: FormData) {
  await requireRole("STAFF");
  const phone = String(formData.get("phone") ?? "").trim();
  await prisma.reservation.update({
    where: { id: reservationId },
    data: { guestPhone: phone || null },
  });
  revalidatePath("/portal/reminders");
}
