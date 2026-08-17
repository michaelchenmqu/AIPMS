import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";

export default async function InvoicingPage() {
  const statements = await prisma.statement.findMany({
    include: { owner: true, property: true, lineItems: true },
    orderBy: { issuedAt: "desc" },
  });

  const totalLinen = statements.reduce((s, st) => s + st.linenTotal, 0);
  const totalLabor = statements.reduce((s, st) => s + st.laborTotal, 0);
  const total = statements.reduce((s, st) => s + st.totalAmount, 0);

  return (
    <div>
      <PageHeader title="Invoicing" subtitle="Usage-based owner statements — linen + verified-hours line items" />

      <div className="grid grid-cols-3 gap-4 mb-6">
        <KpiTile label="Linen billed" value={formatMoney(totalLinen)} />
        <KpiTile label="Labor billed" value={formatMoney(totalLabor)} />
        <KpiTile label="Total invoiced" value={formatMoney(total)} tone="success" />
      </div>

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)] bg-[var(--color-sand-100)]">
              <th className="px-5 py-3 font-semibold">Period</th>
              <th className="px-5 py-3 font-semibold">Owner</th>
              <th className="px-5 py-3 font-semibold">Property</th>
              <th className="px-5 py-3 font-semibold">Linen</th>
              <th className="px-5 py-3 font-semibold">Labor</th>
              <th className="px-5 py-3 font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {statements.map((s) => (
              <tr key={s.id} className="border-t border-[var(--color-sand-200)]">
                <td className="px-5 py-3">
                  <div className="font-medium text-[var(--color-navy)]">{s.periodLabel}</div>
                  <div className="text-xs text-[var(--color-muted)]">{formatDate(s.issuedAt)}</div>
                </td>
                <td className="px-5 py-3">{s.owner.name}</td>
                <td className="px-5 py-3 text-[var(--color-muted)]">{s.property.name}</td>
                <td className="px-5 py-3 font-mono">{formatMoney(s.linenTotal)}</td>
                <td className="px-5 py-3 font-mono">{formatMoney(s.laborTotal)}</td>
                <td className="px-5 py-3 font-mono font-semibold">{formatMoney(s.totalAmount)}</td>
                <td className="px-5 py-3">
                  <Badge tone={s.status === "PAID" ? "success" : "info"}>{s.status}</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
