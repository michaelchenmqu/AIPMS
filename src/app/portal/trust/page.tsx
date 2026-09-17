import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile, ScrollTable, Button } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";
import { isBasiqConfigured } from "@/lib/basiq";
import { connectTrustBank, syncTrustBank, unmatchTransaction, matchTransaction, disconnectTrustBank } from "./actions";

export default async function TrustAccountingPage({
  searchParams,
}: {
  searchParams: Promise<{ basiqError?: string }>;
}) {
  const { basiqError } = await searchParams;
  const [entries, connection] = await Promise.all([
    prisma.trustLedgerEntry.findMany({
      include: { owner: true, bankTransaction: true },
      orderBy: { date: "desc" },
    }),
    prisma.bankConnection.findFirst({
      orderBy: { createdAt: "desc" },
      include: { transactions: { orderBy: { date: "desc" } } },
    }),
  ]);

  const collected = entries.filter((e) => e.type === "RENT_COLLECTED").reduce((s, e) => s + e.amount, 0);
  const payouts = entries.filter((e) => e.type === "OWNER_PAYOUT").reduce((s, e) => s + e.amount, 0);
  const ledgerBalance = entries.reduce((s, e) => s + e.amount, 0);

  const ownerBalances = Object.values(
    entries.reduce<Record<string, { name: string; balance: number }>>((acc, e) => {
      acc[e.ownerId] ??= { name: e.owner.name, balance: 0 };
      acc[e.ownerId].balance += e.amount;
      return acc;
    }, {})
  );
  const anyOwnerNegative = ownerBalances.some((o) => o.balance < 0);

  const bankBalance = connection?.transactions.reduce((s, t) => s + t.amount, 0) ?? 0;
  const unmatchedTransactions = connection?.transactions.filter((t) => !t.matchedLedgerEntryId) ?? [];
  const unmatchedEntries = entries.filter((e) => !e.bankTransaction);
  const threeWayOk = connection && Math.abs(bankBalance - ledgerBalance) < 0.01 && !anyOwnerNegative;

  return (
    <div>
      <PageHeader title="Trust accounting" subtitle="Rent collected, commission, expenses, owner payouts, and bank reconciliation" />

      {basiqError && (
        <div className="text-sm text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg px-4 py-3 mb-5">
          Couldn&apos;t connect the trust bank account: {basiqError}
        </div>
      )}

      <Card className="p-5 mb-6 border-l-[3px] border-l-[var(--color-warning)]">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">AML/CTF — action needed before any real client goes live</div>
        <p className="text-xs text-[var(--color-muted)]">
          AUSTRAC&apos;s AML/CTF regime became mandatory for real estate agents on 1 July 2026 — customer due
          diligence and suspicious-matter reporting on top of standard trust-account rules. This is a real legal
          compliance program, not something this app implements for you. Get the client&apos;s own compliance/legal
          sign-off on scope and process before onboarding real trust money.
        </p>
      </Card>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
        <KpiTile label="Rent collected" value={formatMoney(collected)} />
        <KpiTile label="Owner payouts" value={formatMoney(Math.abs(payouts))} />
        <KpiTile label="Trust ledger balance" value={formatMoney(ledgerBalance)} tone={ledgerBalance >= 0 ? "success" : "warning"} />
      </div>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold text-[var(--color-navy)]">Bank reconciliation</div>
          {connection && (
            <Badge tone={connection.status === "ACTIVE" ? "success" : "warning"}>
              {connection.status === "ACTIVE" ? "Connected" : "Pending"}
            </Badge>
          )}
        </div>

        {!isBasiqConfigured() ? (
          <p className="text-xs text-[var(--color-muted)]">
            Not configured — set BASIQ_API_KEY to connect a real (sandbox, for now) trust bank account.
          </p>
        ) : !connection ? (
          <div>
            <p className="text-xs text-[var(--color-muted)] mb-3">
              No trust bank account connected yet. This is the required three-way check — bank balance, ledger
              balance, and the sum of every owner&apos;s balance all have to match.
            </p>
            <form action={connectTrustBank}>
              <Button type="submit" variant="accent">Connect trust bank account →</Button>
            </form>
          </div>
        ) : (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-4">
              <KpiTile label="Bank balance" value={formatMoney(bankBalance)} />
              <KpiTile label="Trust ledger balance" value={formatMoney(ledgerBalance)} />
              <KpiTile
                label="Three-way check"
                value={threeWayOk ? "Matches" : "Mismatch"}
                tone={threeWayOk ? "success" : "warning"}
              />
            </div>

            {anyOwnerNegative && (
              <div className="text-xs text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg px-3 py-2 mb-4">
                One or more owners has a negative trust balance — meaning payouts have exceeded what was actually
                collected for them. This is a serious trust-account issue even if the totals above match.
              </div>
            )}

            <div className="flex items-center gap-3 mb-5">
              <form action={syncTrustBank.bind(null, connection.id)}>
                <Button type="submit" variant="outline">Sync transactions →</Button>
              </form>
              <form action={disconnectTrustBank.bind(null, connection.id)}>
                <button className="tap text-xs text-[var(--color-muted)] hover:text-[var(--color-error)]">
                  Disconnect &amp; retry
                </button>
              </form>
            </div>

            <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mb-2.5">
              Owner balances
            </div>
            <div className="flex flex-col gap-2 mb-6">
              {ownerBalances.map((o) => (
                <div key={o.name} className="flex items-center justify-between text-sm">
                  <span className="text-[var(--color-text)]">{o.name}</span>
                  <span className={`font-mono ${o.balance < 0 ? "text-[var(--color-error)]" : ""}`}>
                    {formatMoney(o.balance)}
                  </span>
                </div>
              ))}
            </div>

            {unmatchedTransactions.length > 0 && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mb-2.5">
                  Unmatched bank transactions ({unmatchedTransactions.length})
                </div>
                <div className="flex flex-col gap-2 mb-6">
                  {unmatchedTransactions.map((t) => (
                    <div key={t.id} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--color-sand-200)] pb-2">
                      <div className="min-w-0">
                        <div className="text-[var(--color-text)] truncate">{t.description}</div>
                        <div className="text-[11px] text-[var(--color-muted)]">{formatDate(t.date)}</div>
                      </div>
                      <span className="font-mono shrink-0">{formatMoney(t.amount)}</span>
                      <form action={matchTransaction.bind(null, t.id)} className="flex items-center gap-1.5 shrink-0">
                        <select
                          name="ledgerEntryId"
                          required
                          className="text-xs border border-[var(--color-sand-400)] rounded-lg px-2 py-1"
                        >
                          <option value="">Match to…</option>
                          {unmatchedEntries.map((e) => (
                            <option key={e.id} value={e.id}>
                              {e.owner.name} · {formatMoney(e.amount)} · {e.memo.slice(0, 30)}
                            </option>
                          ))}
                        </select>
                        <button className="tap text-xs font-semibold text-[var(--color-teal-dark)]">Match</button>
                      </form>
                    </div>
                  ))}
                </div>
              </>
            )}

            {connection.transactions.some((t) => t.matchedLedgerEntryId) && (
              <>
                <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mb-2.5">
                  Matched
                </div>
                <div className="flex flex-col gap-2">
                  {connection.transactions
                    .filter((t) => t.matchedLedgerEntryId)
                    .map((t) => (
                      <div key={t.id} className="flex items-center justify-between text-sm">
                        <span className="text-[var(--color-muted)] truncate">{t.description}</span>
                        <span className="font-mono">{formatMoney(t.amount)}</span>
                        <form action={unmatchTransaction.bind(null, t.id)}>
                          <button className="tap text-xs text-[var(--color-muted)] hover:text-[var(--color-error)]">Unmatch</button>
                        </form>
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        )}
      </Card>

      <Card className="p-0 overflow-hidden">
        <ScrollTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)] bg-[var(--color-sand-100)]">
              <th className="px-5 py-3 font-semibold">Date</th>
              <th className="px-5 py-3 font-semibold">Owner</th>
              <th className="px-5 py-3 font-semibold">Type</th>
              <th className="px-5 py-3 font-semibold">Memo</th>
              <th className="px-5 py-3 font-semibold">Reconciled</th>
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
                <td className="px-5 py-3">
                  {e.bankTransaction ? <Badge tone="success">Yes</Badge> : <Badge tone="neutral">No</Badge>}
                </td>
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
