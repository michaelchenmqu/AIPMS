import { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import PortalShell from "@/components/portal/PortalShell";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("STAFF");
  return <PortalShell userName={user.name ?? "Staff"}>{children}</PortalShell>;
}
