import { requireOwnerScope } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { formatMoney, formatDate } from "@/lib/format";
import DemoActionButton from "@/components/mobile/DemoActionButton";

export default async function OwnerAppStatementPage() {
  const { owner } = await requireOwnerScope();
  const statement = await prisma.statement.findFirst({
    where: { ownerId: owner.id },
    include: { property: true, lineItems: true },
    orderBy: { issuedAt: "desc" },
  });

  if (!statement) {
    return <div className="p-5 text-sm text-[var(--color-muted)]">No statements issued yet.</div>;
  }

  return (
    <div className="pb-6">
      <div className="px-5 pt-8 pb-1">
        <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">
          {statement.periodLabel}
        </div>
        <div className="text-xs text-[var(--color-muted-2)] mt-0.5">
          Auto-issued {formatDate(statement.issuedAt)} · {statement.property.name}
        </div>
      </div>

      <div className="px-5 pt-3.5">
        <div className="bg-white rounded-2xl p-3.5">
          <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2">
            Turnover · {formatDate(statement.issuedAt)}
          </div>
          {statement.lineItems.map((li) => (
            <div key={li.id} className="flex justify-between text-[12.5px] py-1.5 border-b border-[var(--color-sand-100)]">
              <span className="text-[#4a5b66]">{li.label}</span>
              <span className="font-bold text-[var(--color-navy)]">{formatMoney(li.amount)}</span>
            </div>
          ))}
          <div className="flex justify-between items-center mt-2 pt-2 border-t-2 border-[var(--color-navy)]">
            <span className="text-[13px] font-bold text-[var(--color-navy)]">Total this turnover</span>
            <span className="font-[family-name:var(--font-serif)] text-[19px] font-bold text-[var(--color-navy)]">
              {formatMoney(statement.totalAmount)}
            </span>
          </div>
        </div>

        <div className="bg-[var(--color-success-bg)] rounded-xl p-3 mt-2.5 text-[11.5px] text-[var(--color-success)] leading-relaxed">
          ✓ Usage-based billing — you pay for exactly what was used and the time actually spent on site, not a flat
          per-clean fee.
        </div>

        <DemoActionButton
          message={`${statement.periodLabel} PDF downloaded`}
          className="w-full h-[46px] mt-4 bg-[var(--color-navy)] text-white rounded-[13px] text-[13.5px] font-bold flex items-center justify-center"
        >
          ⭳ Download statement (PDF)
        </DemoActionButton>
      </div>
    </div>
  );
}
