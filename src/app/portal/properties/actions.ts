"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { connectProperty } from "@/lib/channex";
import { switchToLongTerm, switchToShortTerm, createLease, recordRentPayment, endLease, LeasingError } from "@/lib/leasing";
import type { RentFrequency } from "@prisma/client";

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

/** Staff action, "Switch to long-term leasing" / "Switch back to
 *  short-term" on the property detail page — see lib/leasing.ts for the
 *  guard rails. A LeasingError (e.g. an open reservation or active lease
 *  in the way) is expected, not a bug — report it instead of crashing. */
export async function togglePropertyLettingMode(propertyId: string, targetMode: "LONG_TERM" | "SHORT_TERM") {
  const user = await requireRole("STAFF");
  try {
    if (targetMode === "LONG_TERM") {
      await switchToLongTerm(propertyId, user.id);
    } else {
      await switchToShortTerm(propertyId, user.id);
    }
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Something went wrong switching this property's mode.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  // A clean redirect on success too — otherwise a stale ?leaseError= from an
  // earlier blocked attempt can linger in the address bar and re-render on
  // this next, unrelated (successful) action.
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, the "Add a lease" form on a LONG_TERM property with no
 *  active lease. */
export async function createLeaseAction(propertyId: string, formData: FormData) {
  await requireRole("STAFF");
  const str = (key: string) => String(formData.get(key) ?? "").trim();
  const num = (key: string) => {
    const v = str(key);
    return v ? Number(v) : undefined;
  };

  try {
    await createLease({
      propertyId,
      tenantName: str("tenantName"),
      tenantEmail: str("tenantEmail") || undefined,
      tenantPhone: str("tenantPhone") || undefined,
      startDate: new Date(str("startDate")),
      rentAmount: Number(str("rentAmount")),
      rentFrequency: str("rentFrequency") as RentFrequency,
      bondAmount: num("bondAmount"),
    });
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't create the lease.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "Record rent payment" on an active lease's card. */
export async function recordRentPaymentAction(propertyId: string, leaseId: string, formData: FormData) {
  await requireRole("STAFF");
  const amount = Number(formData.get("amount") ?? "");
  const dateRaw = String(formData.get("date") ?? "");

  try {
    await recordRentPayment(leaseId, { amount, date: dateRaw ? new Date(dateRaw) : new Date() });
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't record that payment.";
    redirect(`/portal/properties/${propertyId}?leaseError=${encodeURIComponent(message)}`);
  }
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}

/** Staff action, "End lease" — see lib/leasing.ts#endLease. */
export async function endLeaseAction(propertyId: string, leaseId: string) {
  await requireRole("STAFF");
  await endLease(leaseId);
  revalidatePath(`/portal/properties/${propertyId}`);
  redirect(`/portal/properties/${propertyId}`);
}
