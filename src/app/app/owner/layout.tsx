import { ReactNode } from "react";
import { requireOwnerScope } from "@/lib/owner";
import MobileShell from "@/components/mobile/MobileShell";

const TABS = [
  { href: "/app/owner", label: "Home", icon: "⌂" },
  { href: "/app/owner/statement", label: "Statement", icon: "$" },
  { href: "/app/owner/properties", label: "Properties", icon: "◈" },
  { href: "/app/owner/grow", label: "Grow", icon: "📈" },
];

export default async function OwnerAppLayout({ children }: { children: ReactNode }) {
  await requireOwnerScope();
  return <MobileShell tabs={TABS}>{children}</MobileShell>;
}
