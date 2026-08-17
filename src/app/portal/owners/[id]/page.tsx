import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";

export default async function OwnerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const owner = await prisma.owner.findUnique({
    where: { id },
    include: {
      properties: true,
      statements: { orderBy: { issuedAt: "desc" }, include: { lineItems: true } },
      ledger: { orderBy: { date: "desc" } },
    },
  });
  if (!owner) notFound();

  const totalStatements = owner.statements.reduce((s, st) => s + st.totalAmount, 0);
  const netPayout = owner.ledger.reduce((s, l) => s + l.amount, 0);

  return (
    <div>
      <Link href="/portal/owners" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← Owners
      </Link>
      <PageHeader title={owner.name} subtitle={`${owner.email} · ${owner.region}`} />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <KpiTile label="Properties" value={String(owner.properties.length)} />
        <KpiTile label="Statements issued" value={formatMoney(totalStatements)} sub={`${owner.statements.length} statements`} />
        <KpiTile label="Net trust balance" value={formatMoney(netPayout)} tone={netPayout >= 0 ? "success" : "warning"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="text-sm font-semibold text-[var(--color-navy)]">Properties</div>
          </div>
          <div className="flex flex-col gap-3">
            {owner.properties.map((p) => (
              <Link key={p.id} href={`/portal/properties/${p.id}`} className="tap flex items-center justify-between text-sm">
                <div className="font-medium text-[var(--color-navy)]">{p.name}</div>
                <div className="text-xs text-[var(--color-muted)]">{p.address}</div>
              </Link>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">
            Statements — owner portal preview
          </div>
          <div className="flex flex-col gap-3">
            {owner.statements.map((s) => (
              <div key={s.id} className="border border-[var(--color-sand-200)] rounded-xl p-3.5">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold text-[var(--color-navy)]">{s.periodLabel}</div>
                  <div className="font-mono text-sm">{formatMoney(s.totalAmount)}</div>
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-1">Issued {formatDate(s.issuedAt)}</div>
                {s.lineItems.map((li) => (
                  <div key={li.id} className="flex justify-between text-xs text-[var(--color-muted)] mt-2">
                    <span>{li.label}</span>
                    <span>{formatMoney(li.amount)}</span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="p-6 mt-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Trust ledger</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)]">
              <th className="pb-2 font-semibold">Date</th>
              <th className="pb-2 font-semibold">Type</th>
              <th className="pb-2 font-semibold">Memo</th>
              <th className="pb-2 font-semibold text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {owner.ledger.map((l) => (
              <tr key={l.id} className="border-t border-[var(--color-sand-200)]">
                <td className="py-2.5">{formatDate(l.date)}</td>
                <td className="py-2.5">
                  <Badge tone={l.amount >= 0 ? "success" : "neutral"}>{l.type.replace("_", " ")}</Badge>
                </td>
                <td className="py-2.5 text-[var(--color-muted)]">{l.memo}</td>
                <td className="py-2.5 text-right font-mono">{formatMoney(l.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
