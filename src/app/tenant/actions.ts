"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireTenantScope } from "@/lib/tenant";

/** Tenant action, "Submit a request" on /tenant/maintenance. Creates a
 *  WorkOrder tagged with leaseId/raisedByTenantId so it shows up flagged
 *  on the staff work-orders board — see src/app/portal/work-orders/page.tsx.
 *  "This can't wait" bumps priority to HIGH on top of setting urgent,
 *  since the staff board's existing priority column is what actually
 *  sorts/colours the kanban — urgent alone wouldn't surface it there. */
export async function submitMaintenanceRequest(formData: FormData) {
  const { tenant, lease } = await requireTenantScope();
  if (!lease) return;

  const title = String(formData.get("title") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const urgent = formData.get("urgent") === "on";
  if (!title || !description) return;

  await prisma.workOrder.create({
    data: {
      propertyId: lease.propertyId,
      leaseId: lease.id,
      raisedByTenantId: tenant.id,
      title,
      description,
      urgent,
      priority: urgent ? "HIGH" : "MEDIUM",
    },
  });
  revalidatePath("/tenant/maintenance");
  revalidatePath("/tenant");
}
