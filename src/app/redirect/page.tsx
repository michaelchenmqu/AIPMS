import { redirect } from "next/navigation";
import { getSessionUser, roleHome } from "@/lib/session";

export default async function RedirectPage() {
  const user = await getSessionUser();
  redirect(user ? roleHome(user.role) : "/login");
}
