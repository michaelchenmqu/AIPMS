import Link from "next/link";
import { ReactNode } from "react";
import clsx from "clsx";
import { endGuestSession } from "@/app/guest/actions";

export type GuestTab = { href: string; label: string; icon: string };

const TABS: GuestTab[] = [
  { href: "/guest/stay", label: "Stay", icon: "⌂" },
  { href: "/guest/explore", label: "Explore", icon: "🧭" },
  { href: "/guest/requests", label: "Requests", icon: "✎" },
  { href: "/guest/assistant", label: "Assistant", icon: "✦" },
];

export default function GuestShell({
  children,
  title,
  activeHref,
}: {
  children: ReactNode;
  title: string;
  activeHref: string;
}) {
  return (
    <div className="min-h-screen bg-[var(--color-navy)] flex justify-center sm:py-8">
      <div className="w-full sm:max-w-[430px] sm:rounded-[36px] sm:shadow-[0_40px_80px_rgba(0,0,0,0.35)] sm:overflow-hidden relative flex flex-col sm:h-[880px]">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/aipms-app-bg.jpg')" }}
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-[var(--color-sand-200)]/88" aria-hidden="true" />

        <div className="relative flex-none flex items-center justify-between px-4 py-3 bg-white/90 backdrop-blur-sm border-b border-[var(--color-sand-300)]">
          <span className="text-sm font-semibold text-[var(--color-navy)] truncate">{title}</span>
          <form action={endGuestSession}>
            <button type="submit" className="text-xs text-[var(--color-muted)]">
              Exit
            </button>
          </form>
        </div>

        <div className="relative flex-1 overflow-y-auto">{children}</div>

        <div className="relative flex-none flex border-t border-[var(--color-sand-300)] bg-white/90 backdrop-blur-sm pb-safe">
          {TABS.map((t) => {
            const active = activeHref === t.href;
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
      </div>
    </div>
  );
}
