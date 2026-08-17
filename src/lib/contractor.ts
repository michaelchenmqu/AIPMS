import { redirect } from "next/navigation";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";

/** Server-side guard + scope for every /contractor page: confirms the
 *  session is a CONTRACTOR and returns their Contractor record. */
export async function requireContractorScope() {
  const user = await requireRole("CONTRACTOR");
  if (!user.contractorId) redirect("/login");

  const contractor = await prisma.contractor.findUnique({ where: { id: user.contractorId } });
  if (!contractor) redirect("/login");

  return { user, contractor };
}
