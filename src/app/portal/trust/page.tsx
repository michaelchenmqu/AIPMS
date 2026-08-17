import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile, ScrollTable } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";

export default async function TrustAccountingPage() {
  const entries = await prisma.trustLedgerEntry.findMany({
    include: { owner: true },
    orderBy: { date: "desc" },
  });

  const collected = entries.filter((e) => e.type === "RENT_COLLECTED").reduce((s, e) => s + e.amount, 0);
  const payouts = entries.filter((e) => e.type === "OWNER_PAYOUT").reduce((s, e) => s + e.amount, 0);
  const balance = entries.reduce((s, e) => s + e.amount, 0);

  return (
    <div>
      <PageHeader title="Trust accounting" subtitle="Rent collected, commission, expenses, and owner payouts" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiTile label="Rent collected" value={formatMoney(collected)} />
        <KpiTile label="Owner payouts" value={formatMoney(Math.abs(payouts))} />
        <KpiTile label="Trust balance" value={formatMoney(balance)} tone={balance >= 0 ? "success" : "warning"} />
      </div>

      <Card className="p-0 overflow-hidden">
        <ScrollTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)] bg-[var(--color-sand-100)]">
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Owner</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Memo</th>
              <th className="px-5 py-3 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id} className="border-t border-[var(--color-sand-200)]">
                <td className="px-5 py-3">{formatDate(e.date)}</td>
                <td className="px-5 py-3 font-medium text-[var(--color-navy)]">{e.owner.name}</td>
                <td className="px-5 py-3">
                  <Badge tone={e.amount >= 0 ? "success" : "neutral"}>{e.type.replace("_", " ")}</Badge>
                </td>
                <td className="px-5 py-3 text-[var(--color-muted)]">{e.memo}</td>
                <td className={`px-5 py-3 text-right font-mono ${e.amount < 0 ? "text-[var(--color-error)]" : ""}`}>
                  {formatMoney(e.amount)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        </ScrollTable>
      </Card>
    </div>
  );
}
