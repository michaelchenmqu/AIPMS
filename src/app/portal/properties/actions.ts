"use server";

import { revalidatePath } from "next/cache";
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
