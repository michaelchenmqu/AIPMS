"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import clsx from "clsx";
import SignOutButton from "@/components/SignOutButton";

const NAV = [
  { href: "/owner/overview", label: "Overview" },
  { href: "/owner/statements", label: "Statements" },
  { href: "/owner/properties", label: "Properties" },
  { href: "/owner/grow", label: "Grow bookings" },
];

export default function OwnerShell({
  children,
  ownerName,
}: {
  children: ReactNode;
  ownerName: string;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[var(--color-sand-200)]">
      <header className="bg-[var(--color-navy)] text-white">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <span className="font-[family-name:var(--font-serif)] font-bold">AIPMS · Owner portal</span>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "px-3 py-2 rounded-lg text-sm font-medium",
                      active ? "bg-[rgba(31,184,172,0.18)] text-[var(--color-teal)]" : "text-[rgba(255,255,255,0.75)] hover:text-white"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/app/owner" className="text-xs text-[rgba(255,255,255,0.7)] hover:text-white">
              Open Owner App (mobile) →
            </Link>
            <span className="text-sm font-semibold">{ownerName}</span>
            <SignOutButton className="text-sm text-[rgba(255,255,255,0.7)] hover:text-white" />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
