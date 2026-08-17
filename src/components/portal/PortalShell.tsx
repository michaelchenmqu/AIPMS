"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode, useState } from "react";
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

function NavLinks({ pathname, onNavigate }: { pathname: string | null; onNavigate?: () => void }) {
  return (
    <nav className="flex-1 overflow-y-auto py-3">
      {NAV.map((item) => {
        const active = pathname?.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
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
  );
}

export default function PortalShell({
  children,
  userName,
}: {
  children: ReactNode;
  userName: string;
}) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-[var(--color-sand-200)]">
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-64 shrink-0 bg-[var(--color-navy)] text-white flex-col">
        <div className="px-5 py-5 font-[family-name:var(--font-serif)] text-lg font-bold border-b border-[rgba(255,255,255,0.1)]">
          AIPMS
        </div>
        <NavLinks pathname={pathname} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside className="relative w-72 max-w-[80%] bg-[var(--color-navy)] text-white flex flex-col h-full">
            <div className="flex items-center justify-between px-5 py-5 border-b border-[rgba(255,255,255,0.1)]">
              <span className="font-[family-name:var(--font-serif)] text-lg font-bold">AIPMS</span>
              <button
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="text-2xl leading-none text-[rgba(255,255,255,0.7)]"
              >
                ×
              </button>
            </div>
            <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
          </aside>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-16 shrink-0 flex items-center justify-between px-4 md:px-8 bg-white border-b border-[var(--color-sand-300)]">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setDrawerOpen(true)}
              aria-label="Open menu"
              className="md:hidden -ml-1 p-1.5 text-[var(--color-navy)]"
            >
              <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                <path d="M3 6h16M3 11h16M3 16h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
            <div className="text-sm text-[var(--color-muted)] hidden sm:block">Web portal</div>
          </div>
          <div className="flex items-center gap-3 md:gap-4">
            <span className="text-sm font-semibold text-[var(--color-navy)] truncate max-w-[40vw] sm:max-w-none">
              {userName}
            </span>
            <SignOutButton />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
