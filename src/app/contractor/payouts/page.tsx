import { requireContractorScope } from "@/lib/contractor";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, KpiTile, ScrollTable } from "@/components/ui";
import { LineAreaChart } from "@/components/charts/TrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { formatMoney, formatDate } from "@/lib/format";
import { format } from "date-fns";

const PALETTE = ["#1fb8ac", "#3d7ee8", "#e8615a", "#8b6fd8", "#c98a1a", "#137a4f"];

export default async function ContractorPayoutsPage() {
  const { contractor } = await requireContractorScope();
  const jobs = await prisma.job.findMany({
    where: { contractorId: contractor.id, status: "DONE" },
    include: { property: true, assignedUser: true },
    orderBy: { departureAt: "desc" },
  });

  const totalEarnings = jobs.reduce((s, j) => s + (j.laborCost ?? 0), 0);
  const totalHours = jobs.reduce((s, j) => s + (j.computedHours ?? 0), 0);

  const byWorker = new Map<string, { name: string; hours: number; earnings: number; jobs: number }>();
  for (const j of jobs) {
    const name = j.assignedUser?.name ?? "Unassigned";
    const entry = byWorker.get(name) ?? { name, hours: 0, earnings: 0, jobs: 0 };
    entry.hours += j.computedHours ?? 0;
    entry.earnings += j.laborCost ?? 0;
    entry.jobs += 1;
    byWorker.set(name, entry);
  }

  const earningsByMonth = new Map<string, { label: string; value: number }>();
  for (const j of jobs) {
    if (!j.departureAt) continue;
    const key = format(j.departureAt, "yyyy-MM");
    const entry = earningsByMonth.get(key) ?? { label: format(j.departureAt, "MMM"), value: 0 };
    entry.value += j.laborCost ?? 0;
    earningsByMonth.set(key, entry);
  }
  const earningsTrend = Array.from(earningsByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
  const earningsDelta =
    earningsTrend.length >= 2 && earningsTrend[0].value > 0
      ? Math.round(((earningsTrend[earningsTrend.length - 1].value - earningsTrend[0].value) / earningsTrend[0].value) * 100)
      : null;

  const earningsByWorker = Array.from(byWorker.values())
    .map((w, i) => ({ key: w.name, label: w.name, value: w.earnings, color: PALETTE[i % PALETTE.length] }))
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHeader title="Payouts" subtitle={`Earnings for ${contractor.name} at $${contractor.hourlyRate}/hr`} />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiTile label="Total earnings" value={formatMoney(totalEarnings)} />
        <KpiTile label="Hours billed" value={`${totalHours.toFixed(1)}h`} />
        <KpiTile label="Jobs completed" value={String(jobs.length)} />
      </div>

      {(earningsTrend.length >= 2 || earningsByWorker.length >= 2) && (
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          {earningsTrend.length >= 2 && (
            <Card className="p-6">
              <div className="flex items-baseline justify-between mb-1">
                <div className="text-sm font-semibold text-[var(--color-navy)]">Earnings trend</div>
                {earningsDelta !== null && (
                  <span
                    className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full ${
                      earningsDelta >= 0 ? "text-[var(--color-success)] bg-[var(--color-success-bg)]" : "text-[var(--color-error)] bg-[var(--color-error-bg)]"
                    }`}
                  >
                    {earningsDelta >= 0 ? "+" : ""}
                    {earningsDelta}% vs {earningsTrend[0].label}
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--color-muted)] mb-4">Labor earnings by month — click a point</div>
              <LineAreaChart data={earningsTrend} format="money" />
            </Card>
          )}
          {earningsByWorker.length >= 2 && (
            <Card className="p-6">
              <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Earnings by team member</div>
              <div className="text-xs text-[var(--color-muted)] mb-4">Click a slice or a name to isolate it</div>
              <DonutChart data={earningsByWorker} centerLabel="total earnings" format="money" />
            </Card>
          )}
        </div>
      )}

      <Card className="p-6 mb-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">By team member</div>
        <div className="flex flex-col gap-3">
          {Array.from(byWorker.values()).map((w) => (
            <div key={w.name} className="flex items-center justify-between text-sm">
              <div className="font-medium text-[var(--color-navy)]">{w.name}</div>
              <div className="text-[var(--color-muted)]">
                {w.jobs} jobs · {w.hours.toFixed(1)}h
              </div>
              <div className="font-mono font-semibold">{formatMoney(w.earnings)}</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="p-0 overflow-hidden">
        <ScrollTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)] bg-[var(--color-sand-100)]">
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Property</th>
              <th className="px-5 py-3 font-semibold">Worker</th>
              <th className="px-5 py-3 font-semibold">Hours</th>
              <th className="px-5 py-3 font-semibold text-right">Earnings</th>
            </tr>
          </thead>
          <tbody>
            {jobs.map((j) => (
              <tr key={j.id} className="border-t border-[var(--color-sand-200)]">
                <td className="px-5 py-3">{j.departureAt ? formatDate(j.departureAt) : "—"}</td>
                <td className="px-5 py-3 font-medium text-[var(--color-navy)]">{j.property.name}</td>
                <td className="px-5 py-3">{j.assignedUser?.name ?? "—"}</td>
                <td className="px-5 py-3">{j.computedHours}h</td>
                <td className="px-5 py-3 text-right font-mono">{formatMoney(j.laborCost ?? 0)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        </ScrollTable>
      </Card>
    </div>
  );
}
