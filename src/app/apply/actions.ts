"use server";

import { redirect } from "next/navigation";
import { submitTenantApplication, LeasingError } from "@/lib/leasing";

/** Public action, the application form on /apply — no auth, same posture
 *  as the Guest App's own unauthenticated intake (see src/app/guest/actions.ts).
 *  See lib/leasing.ts#submitTenantApplication. */
export async function submitApplication(formData: FormData) {
  const propertyId = String(formData.get("propertyId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const moveInDateRaw = String(formData.get("moveInDate") ?? "").trim();
  const note = String(formData.get("note") ?? "").trim();

  try {
    await submitTenantApplication({
      propertyId,
      name,
      email,
      phone: phone || undefined,
      moveInDate: moveInDateRaw ? new Date(moveInDateRaw) : undefined,
      note: note || undefined,
    });
  } catch (err) {
    const message = err instanceof LeasingError ? err.message : "Couldn't submit that application.";
    redirect(`/apply?propertyId=${propertyId}&error=${encodeURIComponent(message)}`);
  }
  redirect(`/apply?propertyId=${propertyId}&submitted=1`);
}
