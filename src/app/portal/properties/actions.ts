"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { connectProperty } from "@/lib/channex";

/** Staff action, "Connect to Channex" button on the property detail page.
 *  Registers the property with Channex and stores the returned ID — see
 *  lib/channex.ts. Throws if CHANNEX_API_KEY isn't set; the button is only
 *  rendered when it is (see the property detail page). */
export async function connectPropertyToChannex(propertyId: string) {
  await requireRole("STAFF");
  await connectProperty(propertyId);
  revalidatePath(`/portal/properties/${propertyId}`);
}

/** Staff action, the "Guest experience details" form on the property detail
 *  page — the wifi/check-in/checkout/house-manual/bin-day/gas-bottle fields
 *  the Guest App and the reminders in lib/reminders.ts draw on. */
export async function updateGuestExperience(propertyId: string, formData: FormData) {
  await requireRole("STAFF");
  const str = (key: string) => {
    const v = String(formData.get(key) ?? "").trim();
    return v || null;
  };
  await prisma.property.update({
    where: { id: propertyId },
    data: {
      wifiNetwork: str("wifiNetwork"),
      wifiPassword: str("wifiPassword"),
      checkInTime: str("checkInTime") ?? "3:00 PM",
      checkoutTime: str("checkoutTime") ?? "10:00 AM",
      houseManual: str("houseManual"),
      binDay: str("binDay"),
      hasGasBottle: formData.get("hasGasBottle") === "on",
    },
  });
  revalidatePath(`/portal/properties/${propertyId}`);
}
