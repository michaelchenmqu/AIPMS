import Link from "next/link";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatMoney, timeAgo } from "@/lib/format";

const TABS = [
  { key: "pending", label: "Pending", statuses: ["PENDING", "ACCEPTED"] },
  { key: "in-progress", label: "In progress", statuses: ["IN_PROGRESS"] },
  { key: "done", label: "Done", statuses: ["DONE"] },
];

const STATUS_TONE: Record<string, "neutral" | "info" | "success"> = {
  PENDING: "neutral",
  ACCEPTED: "info",
  IN_PROGRESS: "info",
  DONE: "success",
};

export default async function HousekeepingPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "done" } = await searchParams;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[2];

  const jobs = await prisma.job.findMany({
    where: { status: { in: activeTab.statuses as never } },
    include: { property: true, assignedUser: true, roomChecks: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Housekeeping & laundry" subtitle="Jobs synced from housekeeper app captures, billed on verified usage" />

      <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 w-fit shadow-[var(--shadow-card)]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/portal/housekeeping?tab=${t.key}`}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-semibold",
              tab === t.key ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-sand-100)]"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {jobs.map((j) => {
          const flagged = j.roomChecks.some((rc) => rc.flagged);
          return (
            <Link key={j.id} href={`/portal/housekeeping/${j.id}`}>
              <Card hover className="p-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold text-[var(--color-navy)]">{j.property.name}</div>
                    <div className="text-xs text-[var(--color-muted)] mt-0.5">{j.assignedUser?.name ?? "Unassigned"}</div>
                  </div>
                  <Badge tone={STATUS_TONE[j.status]}>{j.status.replace("_", " ")}</Badge>
                </div>
                <div className="flex items-center justify-between mt-4 pt-3 border-t border-[var(--color-sand-200)]">
                  <span className="text-xs text-[var(--color-muted)]">{timeAgo(j.createdAt)}</span>
                  <div className="flex items-center gap-2">
                    {flagged && <Badge tone="warning">Flagged</Badge>}
                    {j.totalCost != null && <span className="font-mono text-sm">{formatMoney(j.totalCost)}</span>}
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
        {jobs.length === 0 && <div className="col-span-full text-center py-16 text-[var(--color-muted)]">No jobs in this view.</div>}
      </div>
    </div>
  );
}
