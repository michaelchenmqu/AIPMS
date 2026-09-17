import { requireTenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, KpiTile } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";

export default async function TenantStatementPage() {
  const { lease } = await requireTenantScope();
  if (!lease) {
    return (
      <div>
        <PageHeader title="Statement" subtitle="No active lease on file" />
      </div>
    );
  }

  const ledgerEntries = await prisma.trustLedgerEntry.findMany({
    where: { leaseId: lease.id },
    orderBy: { date: "desc" },
  });

  const rentCollected = ledgerEntries.filter((e) => e.type === "RENT_COLLECTED").reduce((s, e) => s + e.amount, 0);
  const balance = ledgerEntries.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader title="Statement" subtitle={`${lease.property.name} · full rent ledger`} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiTile label="Total rent paid" value={formatMoney(rentCollected)} />
        <KpiTile label="Ledger balance" value={formatMoney(balance)} tone={balance >= 0 ? "success" : "warning"} />
        <KpiTile label="Management fee" value={`${Math.round(lease.managementFeeRate * 100)}%`} />
      </div>

      <Card className="p-6">
        <div className="flex flex-col gap-2.5">
          {ledgerEntries.map((e) => (
            <div key={e.id} className="flex items-center justify-between text-sm border-b border-[var(--color-sand-200)] pb-2.5">
              <div>
                <div className="text-[var(--color-navy)] font-medium">{e.memo}</div>
                <div className="text-xs text-[var(--color-muted)]">{formatDate(e.date)}</div>
              </div>
              <span className={`font-mono font-semibold ${e.amount < 0 ? "text-[var(--color-error)]" : "text-[var(--color-navy)]"}`}>
                {formatMoney(e.amount)}
              </span>
            </div>
          ))}
          {ledgerEntries.length === 0 && <div className="text-sm text-[var(--color-muted)] py-6 text-center">No rent recorded yet.</div>}
        </div>
      </Card>
    </div>
  );
}
