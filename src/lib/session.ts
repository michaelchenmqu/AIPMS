import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Role } from "@prisma/client";

export async function getSessionUser() {
  const session = await auth();
  return session?.user ?? null;
}

const ROLE_HOME: Record<Role, string> = {
  STAFF: "/portal",
  OWNER: "/owner",
  CONTRACTOR: "/contractor",
  HOUSEKEEPER: "/app/housekeeper",
};

export function roleHome(role: Role): string {
  return ROLE_HOME[role];
}

/** Server-component guard: redirects to /login (or the right home) if the
 *  session doesn't match `role`. Use at the top of every protected page as
 *  defense-in-depth alongside middleware.ts. */
export async function requireRole(role: Role) {
  const user = await getSessionUser();
  if (!user) redirect(`/login?callbackUrl=${encodeURIComponent(ROLE_HOME[role])}`);
  if (user.role !== role) redirect(ROLE_HOME[user.role]);
  return user;
}
