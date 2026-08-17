import { requireContractorScope } from "@/lib/contractor";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, KpiTile } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";

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

  return (
    <div>
      <PageHeader title="Payouts" subtitle={`Earnings for ${contractor.name} at $${contractor.hourlyRate}/hr`} />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiTile label="Total earnings" value={formatMoney(totalEarnings)} />
        <KpiTile label="Hours billed" value={`${totalHours.toFixed(1)}h`} />
        <KpiTile label="Jobs completed" value={String(jobs.length)} />
      </div>

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
      </Card>
    </div>
  );
}
