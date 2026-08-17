import { requireOwnerScope } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";

export default async function OwnerStatementsPage() {
  const { owner } = await requireOwnerScope();
  const statements = await prisma.statement.findMany({
    where: { ownerId: owner.id },
    include: { property: true, lineItems: true },
    orderBy: { issuedAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Statements" subtitle="Usage-based billing — you pay for exactly what was used, not a flat per-clean fee" />

      <div className="flex flex-col gap-5">
        {statements.map((s) => (
          <Card key={s.id} className="p-6">
            <div className="flex items-start justify-between mb-1">
              <div>
                <div className="font-[family-name:var(--font-serif)] text-lg font-bold text-[var(--color-navy)]">
                  {s.periodLabel}
                </div>
                <div className="text-xs text-[var(--color-muted)]">
                  Auto-issued {formatDate(s.issuedAt)} · {s.property.name}
                </div>
              </div>
              <Badge tone={s.status === "PAID" ? "success" : "info"}>{s.status}</Badge>
            </div>

            <div className="mt-4 border-t border-[var(--color-sand-200)] pt-4">
              {s.lineItems.map((li) => (
                <div key={li.id} className="flex justify-between text-sm py-1.5 border-b border-[var(--color-sand-100)]">
                  <span className="text-[var(--color-muted)]">{li.label}</span>
                  <span className="font-mono font-semibold text-[var(--color-navy)]">{formatMoney(li.amount)}</span>
                </div>
              ))}
              <div className="flex justify-between items-center pt-3 mt-1 border-t-2 border-[var(--color-navy)]">
                <span className="text-sm font-semibold text-[var(--color-navy)]">Total this turnover</span>
                <span className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">
                  {formatMoney(s.totalAmount)}
                </span>
              </div>
            </div>

            <div className="bg-[var(--color-success-bg)] text-[var(--color-success)] text-xs rounded-xl px-3.5 py-2.5 mt-4 leading-relaxed">
              ✓ Usage-based billing — you pay for exactly what was used and the time actually spent on site, not a flat
              per-clean fee.
            </div>
          </Card>
        ))}
        {statements.length === 0 && (
          <div className="text-center py-16 text-[var(--color-muted)]">No statements issued yet.</div>
        )}
      </div>
    </div>
  );
}
