import Link from "next/link";
import { requireTenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile, EmptyState } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";

const CONDITION_TYPE_LABEL: Record<string, string> = {
  ENTRY: "Entry report",
  EXIT: "Exit report",
  ROUTINE: "Routine inspection",
};

export default async function TenantDashboardPage() {
  const { tenant, lease } = await requireTenantScope();

  if (!lease) {
    return (
      <div>
        <PageHeader title={`Welcome, ${tenant.name}`} subtitle="No active lease on file right now" />
        <EmptyState>Get in touch with your property manager if this doesn&apos;t look right.</EmptyState>
      </div>
    );
  }

  const [ledgerEntries, upcomingInspection, conditionReports, recentWorkOrders] = await Promise.all([
    prisma.trustLedgerEntry.findMany({ where: { leaseId: lease.id }, orderBy: { date: "desc" }, take: 5 }),
    prisma.routineInspection.findFirst({
      where: { leaseId: lease.id, status: { in: ["SCHEDULED", "NOTICE_SENT", "IN_PROGRESS"] } },
      orderBy: { scheduledFor: "asc" },
    }),
    prisma.conditionReport.findMany({ where: { leaseId: lease.id }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.workOrder.findMany({ where: { leaseId: lease.id }, orderBy: { createdAt: "desc" }, take: 5 }),
  ]);

  const balance = ledgerEntries.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader title={`Welcome, ${tenant.name}`} subtitle={lease.property.name} />

      <Card className="p-6 mb-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Your lease</div>
        <div className="text-xs text-[var(--color-muted)] mb-4">{lease.property.address}</div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <KpiTile label="Rent" value={formatMoney(lease.rentAmount)} sub={lease.rentFrequency.toLowerCase()} />
          <KpiTile label="Started" value={formatDate(lease.startDate)} />
          <KpiTile
            label="Bond"
            value={lease.bondAmount ? formatMoney(lease.bondAmount) : "—"}
            sub={lease.bondAmount ? lease.bondStatus.toLowerCase() : undefined}
          />
          <KpiTile label="Ledger balance" value={formatMoney(balance)} tone={balance >= 0 ? "success" : "warning"} />
        </div>
      </Card>

      {upcomingInspection && (
        <Card className="p-6 mb-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Upcoming inspection</div>
          <div className="flex items-center justify-between">
            <div className="text-sm text-[var(--color-text)]">{formatDate(upcomingInspection.scheduledFor)}</div>
            <Badge tone={upcomingInspection.noticeGivenAt ? "info" : "neutral"}>
              {upcomingInspection.noticeGivenAt ? "Notice given" : "Scheduled"}
            </Badge>
          </div>
        </Card>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[var(--color-navy)]">Recent rent activity</div>
            <Link href="/tenant/statement" className="text-xs font-semibold text-[var(--color-teal-dark)] hover:underline">
              Full statement →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {ledgerEntries.map((e) => (
              <div key={e.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-muted)]">
                  {formatDate(e.date)} · {e.memo}
                </span>
                <span className={`font-mono ${e.amount < 0 ? "text-[var(--color-error)]" : ""}`}>{formatMoney(e.amount)}</span>
              </div>
            ))}
            {ledgerEntries.length === 0 && <div className="text-sm text-[var(--color-muted)]">No rent recorded yet.</div>}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[var(--color-navy)]">Maintenance requests</div>
            <Link href="/tenant/maintenance" className="text-xs font-semibold text-[var(--color-teal-dark)] hover:underline">
              Submit / view all →
            </Link>
          </div>
          <div className="flex flex-col gap-2">
            {recentWorkOrders.map((w) => (
              <div key={w.id} className="flex items-center justify-between text-sm">
                <span className="text-[var(--color-navy)] truncate">{w.title}</span>
                <Badge tone={w.status === "DONE" ? "success" : w.status === "IN_PROGRESS" ? "info" : "neutral"}>
                  {w.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
            {recentWorkOrders.length === 0 && <div className="text-sm text-[var(--color-muted)]">No requests submitted yet.</div>}
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Condition reports</div>
        <div className="flex flex-col gap-2">
          {conditionReports.map((r) => (
            <div key={r.id} className="flex items-center justify-between text-sm">
              <span className="text-[var(--color-navy)]">{CONDITION_TYPE_LABEL[r.type]}</span>
              <span className="text-xs text-[var(--color-muted)]">{formatDate(r.createdAt)}</span>
            </div>
          ))}
          {conditionReports.length === 0 && <div className="text-sm text-[var(--color-muted)]">None on file yet.</div>}
        </div>
      </Card>
    </div>
  );
}
