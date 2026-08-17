"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ReactNode } from "react";
import clsx from "clsx";
import SignOutButton from "@/components/SignOutButton";

export type MobileTab = { href: string; label: string; icon: string };

export default function MobileShell({
  children,
  tabs,
  title,
}: {
  children: ReactNode;
  tabs?: MobileTab[];
  title?: string;
}) {
  const pathname = usePathname();
  return (
    <div className="min-h-screen bg-[var(--color-navy)] flex justify-center sm:py-8">
      <div className="w-full sm:max-w-[430px] sm:rounded-[36px] sm:shadow-[0_40px_80px_rgba(0,0,0,0.35)] sm:overflow-hidden bg-[var(--color-sand-200)] flex flex-col sm:h-[880px]">
        {title && (
          <div className="flex-none flex items-center justify-between px-4 py-3 bg-white border-b border-[var(--color-sand-300)]">
            <span className="text-sm font-semibold text-[var(--color-navy)]">{title}</span>
            <SignOutButton className="text-xs text-[var(--color-muted)]" />
          </div>
        )}
        <div className="flex-1 overflow-y-auto">{children}</div>
        {tabs && (
          <div className="flex-none flex border-t border-[var(--color-sand-300)] bg-white pb-safe">
            {tabs.map((t) => {
              const active = pathname === t.href;
              return (
                <Link
                  key={t.href}
                  href={t.href}
                  className={clsx(
                    "flex-1 flex flex-col items-center gap-1 py-2.5",
                    active ? "text-[var(--color-teal)]" : "text-[var(--color-muted-2)]"
                  )}
                >
                  <span className="text-lg leading-none">{t.icon}</span>
                  <span className="text-[10px] font-semibold">{t.label}</span>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
