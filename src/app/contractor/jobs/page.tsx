import Link from "next/link";
import clsx from "clsx";
import { requireContractorScope } from "@/lib/contractor";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatMoney, timeAgo } from "@/lib/format";

const TABS = [
  { key: "active", label: "Active", statuses: ["PENDING", "ACCEPTED", "IN_PROGRESS"] },
  { key: "done", label: "Completed", statuses: ["DONE"] },
];

const STATUS_TONE: Record<string, "neutral" | "info" | "success"> = {
  PENDING: "neutral",
  ACCEPTED: "info",
  IN_PROGRESS: "info",
  DONE: "success",
};

export default async function ContractorJobsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { contractor } = await requireContractorScope();
  const { tab = "active" } = await searchParams;
  const activeTab = TABS.find((t) => t.key === tab) ?? TABS[0];

  const jobs = await prisma.job.findMany({
    where: { contractorId: contractor.id, status: { in: activeTab.statuses as never } },
    include: { property: true, assignedUser: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Jobs" subtitle={`Assigned jobs across ${contractor.name}'s team`} />

      <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 w-fit shadow-[var(--shadow-card)]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/contractor/jobs?tab=${t.key}`}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-semibold",
              tab === t.key ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-sand-100)]"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)] bg-[var(--color-sand-100)]">
              <th className="px-5 py-3 font-semibold">Property</th>
              <th className="px-5 py-3 font-semibold">Assigned to</th>
              <th className="px-5 py-3 font-semibold">Created</th>
              <th className="px-5 py-3 font-semibold">Cost</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-[var(--color-sand-200)]">
                <td className="px-5 py-3 font-medium text-[var(--color-navy)]">
                  <Link href={`/contractor/jobs/${j.id}`} className="hover:underline">
                    {j.property.name}
                  </Link>
                </td>
                <td className="px-5 py-3">{j.assignedUser?.name ?? "Unassigned"}</td>
                <td className="px-5 py-3 text-[var(--color-muted)]">{timeAgo(j.createdAt)}</td>
                <td className="px-5 py-3 font-mono">{j.totalCost != null ? formatMoney(j.totalCost) : "—"}</td>
                <td className="px-5 py-3">
                  <Badge tone={STATUS_TONE[j.status]}>{j.status.replace("_", " ")}</Badge>
                </td>
              </tr>
            ))}
            {jobs.length === 0 && (
              <tr>
                <td colSpan={5} className="px-5 py-10 text-center text-[var(--color-muted)]">
                  No jobs in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
