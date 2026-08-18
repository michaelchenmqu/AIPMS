"use server";

import { redirect } from "next/navigation";
import { verifyGuestAccess, setGuestSession, clearGuestSession } from "@/lib/guest";

export async function verifyGuest(formData: FormData) {
  const lastName = String(formData.get("lastName") ?? "").trim();
  const arrivalDateRaw = String(formData.get("arrivalDate") ?? "");
  const propertyId = String(formData.get("propertyId") ?? "") || undefined;

  const qs = propertyId ? `?propertyId=${encodeURIComponent(propertyId)}` : "";

  if (!lastName || !arrivalDateRaw) {
    redirect(`/guest${qs}${qs ? "&" : "?"}error=1`);
  }

  const arrivalDate = new Date(arrivalDateRaw);
  if (Number.isNaN(arrivalDate.getTime())) {
    redirect(`/guest${qs}${qs ? "&" : "?"}error=1`);
  }

  const reservation = await verifyGuestAccess({ lastName, arrivalDate, propertyId });
  if (!reservation) {
    redirect(`/guest${qs}${qs ? "&" : "?"}error=1`);
  }

  await setGuestSession(reservation.id);
  redirect("/guest/stay");
}

export async function endGuestSession() {
  await clearGuestSession();
  redirect("/guest");
}
