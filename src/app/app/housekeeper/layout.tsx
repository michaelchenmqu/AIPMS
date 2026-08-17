import { ReactNode } from "react";
import { requireHousekeeperScope } from "@/lib/housekeeper";
import MobileShell from "@/components/mobile/MobileShell";

export default async function HousekeeperAppLayout({ children }: { children: ReactNode }) {
  const { user } = await requireHousekeeperScope();
  return <MobileShell title={`Housekeeper App · ${user.name}`}>{children}</MobileShell>;
}
