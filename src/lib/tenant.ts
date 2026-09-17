import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Server-side guard + scope for every /tenant page: confirms the session
 *  is a TENANT, and returns their Tenant record plus their current lease
 *  (the most recent ACTIVE/ENDING one — a tenant renting again later gets
 *  a new lease, not a new login). Mirrors lib/owner.ts#requireOwnerScope —
 *  the same choke point that keeps one tenant from ever seeing another
 *  tenant's, or another lease's, data. */
export async function requireTenantScope() {
  const user = await requireRole("TENANT");
  if (!user.tenantId) redirect("/login");

  const tenant = await prisma.tenant.findUnique({ where: { id: user.tenantId } });
  if (!tenant) redirect("/login");

  const lease = await prisma.lease.findFirst({
    where: { tenants: { some: { tenantId: tenant.id } }, status: { in: ["ACTIVE", "ENDING"] } },
    orderBy: { startDate: "desc" },
    include: { property: true, tenants: { include: { tenant: true } } },
  });

  return { user, tenant, lease };
}
