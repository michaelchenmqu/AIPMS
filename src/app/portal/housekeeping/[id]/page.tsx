import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile } from "@/components/ui";
import { formatMoney, formatDateTime } from "@/lib/format";
import { ReviewActions } from "@/components/portal/ReviewActions";

const REVIEW_TONE: Record<string, "success" | "error" | "warning"> = {
  APPROVED: "success",
  REJECTED: "error",
  RETURNED: "warning",
};

const ROOM_LABEL: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Main bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
};

function matchColor(pct: number | null) {
  if (pct == null) return "text-[var(--color-muted)]";
  if (pct >= 90) return "text-[var(--color-success)]";
  if (pct >= 85) return "text-[var(--color-warning)]";
  return "text-[var(--color-error)]";
}

export default async function JobDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      property: true,
      assignedUser: true,
      contractor: true,
      reservation: true,
      roomChecks: true,
      linenUsage: true,
    },
  });
  if (!job) notFound();

  return (
    <div className="max-w-4xl">
      <Link href="/portal/housekeeping" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← Housekeeping & laundry
      </Link>
      <PageHeader
        title={job.property.name}
        subtitle={`${job.type === "CLEANING" ? "Cleaning" : "Maintenance"} turnover · ${job.assignedUser?.name ?? "Unassigned"} · ${job.contractor.name}`}
        actions={<Badge tone={job.status === "DONE" ? "success" : "info"}>{job.status.replace("_", " ")}</Badge>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Time on-site" value={job.computedHours != null ? `${job.computedHours}h` : "—"} sub={`@ $${job.hourlyRate}/hr`} />
        <KpiTile label="Labor cost" value={formatMoney(job.laborCost ?? 0)} />
        <KpiTile label="Linen cost" value={formatMoney(job.linenCost ?? 0)} />
        <KpiTile label="Total — usage-based" value={formatMoney(job.totalCost ?? 0)} tone="success" />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mb-6">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Arrival &amp; departure</div>
          <div className="flex flex-col gap-2 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Arrival (server-verified)</span>
              <span className="font-mono">{job.arrivalAt ? formatDateTime(job.arrivalAt) : "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--color-muted)]">Departure (server-verified)</span>
              <span className="font-mono">{job.departureAt ? formatDateTime(job.departureAt) : "—"}</span>
            </div>
            {job.arrivalGeoLat && (
              <div className="flex justify-between">
                <span className="text-[var(--color-muted)]">Geo</span>
                <span className="font-mono text-xs">
                  {job.arrivalGeoLat.toFixed(4)}, {job.arrivalGeoLng?.toFixed(4)}
                </span>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Linen used</div>
          {job.linenUsage.length ? (
            <div className="flex flex-col gap-2 text-sm">
              {job.linenUsage.map((l) => (
                <div key={l.id} className="flex justify-between">
                  <span className="text-[var(--color-muted)]">
                    {l.quantity}× {l.item.toLowerCase()}
                  </span>
                  <span className="font-mono">{formatMoney(l.quantity * l.unitCost)}</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-sm text-[var(--color-muted)]">Not logged yet.</div>
          )}
        </Card>
      </div>

      <Card className="p-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">AI clean-check</div>
        <p className="text-xs text-[var(--color-muted)] mb-4">
          Each room compared against the property&apos;s reference photos. Soft-flag only — never blocks job completion.
        </p>
        <div className="grid sm:grid-cols-2 gap-4">
          {job.roomChecks.map((rc) => (
            <div key={rc.id} className="border border-[var(--color-sand-200)] rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--color-navy)]">{ROOM_LABEL[rc.room]}</div>
                <span className={`text-sm font-bold ${matchColor(rc.matchPercent)}`}>{rc.matchPercent}% match</span>
              </div>
              {rc.afterPhotoUrl && (
                <div className="mt-2 rounded-lg overflow-hidden bg-[var(--color-sand-100)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration */}
                  <img src={rc.afterPhotoUrl} alt={ROOM_LABEL[rc.room]} className="w-full h-28 object-cover" />
                </div>
              )}
              <p className="text-xs text-[var(--color-muted)] mt-2">{rc.aiNote}</p>
              {rc.flagged && (
                <div className="mt-2">
                  {rc.reviewedAt ? (
                    <div className="flex flex-col gap-1">
                      {rc.reviewStatus && <Badge tone={REVIEW_TONE[rc.reviewStatus]}>{rc.reviewStatus}</Badge>}
                      <span className="text-[11px] text-[var(--color-muted-2)]">
                        {rc.reviewNote} — {rc.reviewedBy}
                      </span>
                    </div>
                  ) : (
                    <ReviewActions roomCheckId={rc.id} />
                  )}
                </div>
              )}
            </div>
          ))}
          {job.roomChecks.length === 0 && (
            <div className="text-sm text-[var(--color-muted)] col-span-2">AI clean-check runs once the job is completed.</div>
          )}
        </div>
      </Card>
    </div>
  );
}
