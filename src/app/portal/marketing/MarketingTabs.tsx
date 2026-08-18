import Link from "next/link";
import clsx from "clsx";

export function MarketingTabs({ active }: { active: "queue" | "performance" }) {
  const tabs = [
    { key: "queue", label: "Queue", href: "/portal/marketing/queue" },
    { key: "performance", label: "Performance", href: "/portal/marketing/performance" },
  ] as const;
  return (
    <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 w-fit shadow-[var(--shadow-card)]">
      {tabs.map((t) => (
        <Link
          key={t.key}
          href={t.href}
          className={clsx(
            "px-4 py-2 rounded-lg text-sm font-semibold",
            active === t.key ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-sand-100)]"
          )}
        >
          {t.label}
        </Link>
      ))}
    </div>
  );
}
