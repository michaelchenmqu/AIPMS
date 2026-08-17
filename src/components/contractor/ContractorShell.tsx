"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
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
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[var(--color-sand-200)]">
      <header className="bg-[var(--color-navy)] text-white relative">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex items-center justify-between h-16">
          <div className="flex items-center gap-8">
            <span className="font-[family-name:var(--font-serif)] font-bold whitespace-nowrap">
              AIPMS <span className="hidden sm:inline">· Contractor portal</span>
            </span>
            <nav className="hidden md:flex items-center gap-1">
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

          <div className="hidden md:flex items-center gap-4">
            <span className="text-sm font-semibold">{contractorName}</span>
            <SignOutButton className="text-sm text-[rgba(255,255,255,0.7)] hover:text-white" />
          </div>

          <button
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Open menu"
            className="md:hidden p-1.5 text-white"
          >
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        {menuOpen && (
          <div className="md:hidden absolute inset-x-0 top-16 z-50 bg-[var(--color-navy)] border-t border-[rgba(255,255,255,0.12)] shadow-[var(--shadow-lift)]">
            <nav className="flex flex-col px-2 py-2">
              {NAV.map((item) => {
                const active = pathname?.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMenuOpen(false)}
                    className={clsx(
                      "px-3 py-2.5 rounded-lg text-sm font-medium",
                      active ? "bg-[rgba(31,184,172,0.18)] text-[var(--color-teal)]" : "text-[rgba(255,255,255,0.75)]"
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <div className="flex items-center justify-between px-5 py-3 border-t border-[rgba(255,255,255,0.12)]">
              <span className="text-sm font-semibold">{contractorName}</span>
              <SignOutButton className="text-sm text-[rgba(255,255,255,0.7)]" />
            </div>
          </div>
        )}
      </header>
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">{children}</main>
    </div>
  );
}
