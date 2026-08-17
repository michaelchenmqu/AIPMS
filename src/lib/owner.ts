import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Server-side guard + scope for every /owner and /app/owner page: confirms
 *  the session is an OWNER and returns their Owner record with properties.
 *  This is the single choke point that keeps one owner from ever seeing
 *  another owner's data. */
export async function requireOwnerScope() {
  const user = await requireRole("OWNER");
  if (!user.ownerId) redirect("/login");

  const owner = await prisma.owner.findUnique({
    where: { id: user.ownerId },
    include: { properties: true },
  });
  if (!owner) redirect("/login");

  return { user, owner };
}
