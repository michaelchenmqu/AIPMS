import { ReactNode } from "react";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import OwnerShell from "@/components/owner/OwnerShell";

export default async function OwnerLayout({ children }: { children: ReactNode }) {
  const user = await requireRole("OWNER");
  const owner = user.ownerId ? await prisma.owner.findUnique({ where: { id: user.ownerId } }) : null;
  return <OwnerShell ownerName={owner?.name ?? user.name ?? "Owner"}>{children}</OwnerShell>;
}
