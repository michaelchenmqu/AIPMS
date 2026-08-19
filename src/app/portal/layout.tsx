import { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import PortalShell from "@/components/portal/PortalShell";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("STAFF");
  const pendingRequestCount = await prisma.guestRequest.count({ where: { status: "PENDING" } });
  return (
    <PortalShell userName={user.name ?? "Staff"} pendingRequestCount={pendingRequestCount}>
      {children}
    </PortalShell>
  );
}
