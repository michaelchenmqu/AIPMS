import { ReactNode } from "react";
import { requireTenantScope } from "@/lib/tenant";
import TenantShell from "@/components/tenant/TenantShell";

export default async function TenantLayout({ children }: { children: ReactNode }) {
  const { tenant } = await requireTenantScope();
  return <TenantShell tenantName={tenant.name}>{children}</TenantShell>;
}
