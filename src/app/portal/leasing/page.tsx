import Link from "next/link";
import { PageHeader, Card, Badge, KpiTile } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { proposeInspectionBatch, portfolioComplianceSummary, type InspectionProposal } from "@/lib/leasing";
import { approveInspectionBatchAction } from "./actions";

export default async function LeasingPage({
  searchParams,
}: {
  searchParams: Promise<{ scheduled?: string; skipped?: string }>;
}) {
  const { scheduled, skipped } = await searchParams;
  const [proposals, compliance] = await Promise.all([proposeInspectionBatch(), portfolioComplianceSummary()]);

  const grouped = proposals.reduce<Record<string, InspectionProposal[]>>((acc, p) => {
    (acc[p.region] ??= []).push(p);
    return acc;
  }, {});

  const defaultDate = new Date();
  defaultDate.setDate(defaultDate.getDate() + 14);
  const defaultDateStr = defaultDate.toISOString().slice(0, 10);

  return (
    <div>
      <PageHeader
        title="Leasing"
        subtitle="Portfolio-wide inspection scheduling and compliance — across every long-term lease"
      />

      {scheduled && (
        <div className="text-sm bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-lg px-4 py-3 mb-5">
          Scheduled {scheduled} inspection{scheduled === "1" ? "" : "s"}
          {skipped && Number(skipped) > 0 ? ` — ${skipped} skipped (no longer eligible)` : ""}.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Due this month" value={String(compliance.dueThisMonth.length)} />
        <KpiTile label="Overdue" value={String(compliance.overdue.length)} tone={compliance.overdue.length > 0 ? "warning" : undefined} />
        <KpiTile label="Clear" value={String(compliance.clear.length)} tone="success" />
        <KpiTile label="Flagged" value={String(compliance.flagged.length)} tone={compliance.flagged.length > 0 ? "warning" : undefined} />
      </div>

      {compliance.flagged.length > 0 && (
        <Card className="p-6 mb-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Flagged — needs review</div>
          <p className="text-xs text-[var(--color-muted)] mb-4">
            Rooms the AI inspection QA flagged on the most recent completed inspection, not yet reviewed.
          </p>
          <div className="flex flex-col gap-2.5">
            {compliance.flagged.map((f) => (
              <Link
                key={f.leaseId}
                href={`/portal/properties/${f.propertyId}/condition-reports/${f.reportId}`}
                className="tap flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-medium text-[var(--color-navy)]">{f.propertyName}</div>
                  <div className="text-xs text-[var(--color-muted)]">{f.tenantName}</div>
                </div>
                <Badge tone="warning">
                  {f.flaggedRooms} flagged room{f.flaggedRooms === 1 ? "" : "s"}
                </Badge>
              </Link>
            ))}
          </div>
        </Card>
      )}

      {compliance.overdue.length > 0 && (
        <Card className="p-6 mb-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Overdue</div>
          <p className="text-xs text-[var(--color-muted)] mb-4">
            Past their inspection due date with nothing scheduled — proposed for the batch below.
          </p>
          <div className="flex flex-col gap-2">
            {compliance.overdue.map((o) => (
              <Link
                key={o.leaseId}
                href={`/portal/properties/${o.propertyId}`}
                className="tap flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-medium text-[var(--color-navy)]">{o.propertyName}</div>
                  <div className="text-xs text-[var(--color-muted)]">{o.tenantName}</div>
                </div>
                <span className="text-xs text-[var(--color-error)]">due {formatDate(o.dueDate)}</span>
              </Link>
            ))}
          </div>
        </Card>
      )}

      <Card className="p-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">AI inspection scheduler</div>
        <p className="text-xs text-[var(--color-muted)] mb-4">
          Every lease due for a routine inspection this month, grouped by region. Uncheck any you don&apos;t want to
          include, pick a date, and approve — each one gets booked and its statutory notice sent to the tenant
          immediately.
        </p>
        {proposals.length === 0 ? (
          <div className="text-sm text-[var(--color-muted)]">Nothing due for scheduling this month.</div>
        ) : (
          <form action={approveInspectionBatchAction}>
            <div className="flex flex-col gap-5 mb-5">
              {Object.entries(grouped).map(([region, items]) => (
                <div key={region}>
                  <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mb-2">
                    {region} · {items.length}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    {items.map((p) => (
                      <label key={p.leaseId} className="flex items-center justify-between text-sm gap-3">
                        <span className="flex items-center gap-2 min-w-0">
                          <input type="checkbox" name="leaseIds" value={p.leaseId} defaultChecked />
                          <span className="truncate">{p.propertyName}</span>
                        </span>
                        {p.overdue ? (
                          <Badge tone="error">Overdue</Badge>
                        ) : (
                          <span className="text-xs text-[var(--color-muted)]">due {formatDate(p.dueDate)}</span>
                        )}
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Schedule for</label>
                <input
                  name="scheduledFor"
                  type="date"
                  defaultValue={defaultDateStr}
                  required
                  className="text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2"
                />
              </div>
              <button className="tap text-sm font-semibold bg-[var(--color-navy)] text-white rounded-lg px-4 py-2">
                Approve batch →
              </button>
            </div>
          </form>
        )}
      </Card>
    </div>
  );
}
