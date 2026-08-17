"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import clsx from "clsx";
import SignOutButton from "@/components/SignOutButton";

const NAV = [
  { href: "/portal/trainer", label: "AI Trainer", icon: "✦" },
  { href: "/portal/dashboard", label: "Dashboard", icon: "▦" },
  { href: "/portal/properties", label: "Property performance", icon: "◈" },
  { href: "/portal/reservations", label: "Reservations", icon: "▤" },
  { href: "/portal/owners", label: "Owners", icon: "⌂" },
  { href: "/portal/inbox", label: "Inbox & enquiries", icon: "✉" },
  { href: "/portal/work-orders", label: "Work orders", icon: "🛠" },
  { href: "/portal/housekeeping", label: "Housekeeping & laundry", icon: "🧺" },
  { href: "/portal/audits", label: "Q&A / audits", icon: "◎" },
  { href: "/portal/invoicing", label: "Invoicing", icon: "$" },
  { href: "/portal/trust", label: "Trust accounting", icon: "⚖" },
];

export default function PortalShell({
  children,
  userName,
}: {
  children: ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen flex bg-[var(--color-sand-200)]">
      <aside className="w-64 shrink-0 bg-[var(--color-navy)] text-white flex flex-col">
        <div className="px-5 py-5 font-[family-name:var(--font-serif)] text-lg font-bold border-b border-[rgba(255,255,255,0.1)]">
          AIPMS
        </div>
        <nav className="flex-1 overflow-y-auto py-3">
          {NAV.map((item) => {
            const active = pathname?.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={clsx(
                  "flex items-center gap-3 px-5 py-2.5 text-sm font-medium",
                  active
                    ? "bg-[rgba(31,184,172,0.15)] text-[var(--color-teal)] border-r-2 border-[var(--color-teal)]"
                    : "text-[rgba(255,255,255,0.7)] hover:bg-[rgba(255,255,255,0.06)] hover:text-white"
                )}
              >
                <span className="w-4 text-center">{item.icon}</span>
                {item.label}
              </Link>
            );
          })}
        </nav>
      </aside>
      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center justify-between px-8 bg-white border-b border-[var(--color-sand-300)]">
          <div className="text-sm text-[var(--color-muted)]">Web portal</div>
          <div className="flex items-center gap-4">
            <span className="text-sm font-semibold text-[var(--color-navy)]">{userName}</span>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">{children}</main>
      </div>
    </div>
  );
}
