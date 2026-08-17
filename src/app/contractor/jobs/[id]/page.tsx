import { notFound } from "next/navigation";
import Link from "next/link";
import { requireContractorScope } from "@/lib/contractor";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile } from "@/components/ui";
import { formatMoney, formatDateTime } from "@/lib/format";

export default async function ContractorJobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { contractor } = await requireContractorScope();

  const job = await prisma.job.findUnique({
    where: { id },
    include: { property: true, assignedUser: true, linenUsage: true, roomChecks: true },
  });
  if (!job || job.contractorId !== contractor.id) notFound();

  return (
    <div className="max-w-3xl">
      <Link href="/contractor/jobs" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← Jobs
      </Link>
      <PageHeader
        title={job.property.name}
        subtitle={job.assignedUser?.name ?? "Unassigned"}
        actions={<Badge tone={job.status === "DONE" ? "success" : "info"}>{job.status.replace("_", " ")}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Time on-site" value={job.computedHours != null ? `${job.computedHours}h` : "—"} />
        <KpiTile label="Rate" value={`$${job.hourlyRate}/hr`} />
        <KpiTile label="Labor cost" value={formatMoney(job.laborCost ?? 0)} />
        <KpiTile label="Total" value={formatMoney(job.totalCost ?? 0)} tone="success" />
      </div>

      <Card className="p-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Timestamps</div>
        <div className="flex flex-col gap-2 text-sm">
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Arrival</span>
            <span className="font-mono">{job.arrivalAt ? formatDateTime(job.arrivalAt) : "—"}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[var(--color-muted)]">Departure</span>
            <span className="font-mono">{job.departureAt ? formatDateTime(job.departureAt) : "—"}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
