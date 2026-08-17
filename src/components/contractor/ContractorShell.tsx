"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import clsx from "clsx";
import SignOutButton from "@/components/SignOutButton";

const NAV = [
  { href: "/contractor/jobs", label: "Jobs" },
  { href: "/contractor/payouts", label: "Payouts" },
];

export default function ContractorShell({
  children,
  contractorName,
}: {
  children: ReactNode;
  contractorName: string;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[var(--color-sand-200)]">
      <header className="bg-[var(--color-navy)] text-white">
        <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <span className="font-[family-name:var(--font-serif)] font-bold">AIPMS · Contractor portal</span>
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
            <span className="text-sm font-semibold">{contractorName}</span>
            <SignOutButton className="text-sm text-[rgba(255,255,255,0.7)] hover:text-white" />
          </div>
        </div>
      </header>
      <main className="max-w-6xl mx-auto px-6 py-8">{children}</main>
    </div>
  );
}
