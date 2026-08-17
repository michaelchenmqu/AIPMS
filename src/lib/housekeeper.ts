import { requireRole } from "@/lib/session";

/** Server-side guard for every /app/housekeeper page: confirms the session
 *  is a HOUSEKEEPER. Individual job routes additionally check
 *  job.assignedUserId === user.id so one housekeeper can never act on
 *  another's job. */
export async function requireHousekeeperScope() {
  const user = await requireRole("HOUSEKEEPER");
  return { user };
}
