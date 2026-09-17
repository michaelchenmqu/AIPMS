import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";
import { recordConditionRoomPhotoAction } from "../../../actions";
import { ConditionReviewActions } from "@/components/portal/ConditionReviewActions";
import type { RoomKind } from "@prisma/client";

const ROOMS: RoomKind[] = ["LIVING_ROOM", "BEDROOM", "KITCHEN", "BATHROOM"];
const ROOM_LABEL: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Main bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
};
const TYPE_LABEL: Record<string, string> = {
  ENTRY: "Entry condition report",
  EXIT: "Exit condition report",
  ROUTINE: "Routine inspection report",
};
const REVIEW_TONE: Record<string, "success" | "error" | "warning"> = {
  APPROVED: "success",
  REJECTED: "error",
  RETURNED: "warning",
};

function matchColor(pct: number | null) {
  if (pct == null) return "text-[var(--color-muted)]";
  if (pct >= 90) return "text-[var(--color-success)]";
  if (pct >= 85) return "text-[var(--color-warning)]";
  return "text-[var(--color-error)]";
}

export default async function ConditionReportPage({
  params,
}: {
  params: Promise<{ id: string; reportId: string }>;
}) {
  const { id, reportId } = await params;
  const report = await prisma.conditionReport.findUnique({
    where: { id: reportId },
    include: {
      lease: { include: { property: true, tenants: { include: { tenant: true } } } },
      roomChecks: true,
    },
  });
  if (!report || report.lease.propertyId !== id) notFound();

  const checksByRoom = Object.fromEntries(report.roomChecks.map((rc) => [rc.room, rc]));

  return (
    <div className="max-w-4xl">
      <Link href={`/portal/properties/${id}`} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← {report.lease.property.name}
      </Link>
      <PageHeader
        title={TYPE_LABEL[report.type]}
        subtitle={`${report.lease.tenants.map((t) => t.tenant.name).join(", ") || "No tenant on record"} · ${formatDate(report.createdAt)}`}
      />
      <p className="text-xs text-[var(--color-muted)] mb-4 max-w-2xl">
        {report.type === "ENTRY"
          ? "These photos become the baseline every later report and inspection for this lease is compared against."
          : "Each room compared against the entry-condition baseline for this lease. Soft-flag only — never blocks anything on its own."}
      </p>
      <div className="grid sm:grid-cols-2 gap-4">
        {ROOMS.map((room) => {
          const rc = checksByRoom[room];
          return (
            <Card key={room} className="p-4">
              <div className="flex items-center justify-between">
                <div className="text-sm font-semibold text-[var(--color-navy)]">{ROOM_LABEL[room]}</div>
                {rc?.matchPercent != null && (
                  <span className={`text-sm font-bold ${matchColor(rc.matchPercent)}`}>{rc.matchPercent}% match</span>
                )}
              </div>
              {rc?.photoUrl && (
                <div className="mt-2 rounded-lg overflow-hidden bg-[var(--color-sand-100)]">
                  {/* eslint-disable-next-line @next/next/no-img-element -- staff-uploaded condition photo */}
                  <img src={rc.photoUrl} alt={ROOM_LABEL[room]} className="w-full h-28 object-cover" />
                </div>
              )}
              {rc?.aiNote && <p className="text-xs text-[var(--color-muted)] mt-2">{rc.aiNote}</p>}
              <form action={recordConditionRoomPhotoAction.bind(null, id, reportId, room)} className="mt-3 flex items-center gap-2">
                <input type="file" name="photo" accept="image/*" required className="text-xs flex-1" />
                <button className="tap text-xs font-semibold bg-[var(--color-navy)] text-white rounded-lg px-3 py-1.5">
                  {rc?.photoUrl ? "Retake" : "Upload"}
                </button>
              </form>
              {rc?.flagged && (
                <div className="mt-2">
                  {rc.reviewedAt ? (
                    <div className="flex flex-col gap-1">
                      {rc.reviewStatus && <Badge tone={REVIEW_TONE[rc.reviewStatus]}>{rc.reviewStatus}</Badge>}
                      <span className="text-[11px] text-[var(--color-muted-2)]">
                        {rc.reviewNote} — {rc.reviewedBy}
                      </span>
                    </div>
                  ) : (
                    <ConditionReviewActions roomCheckId={rc.id} />
                  )}
                </div>
              )}
            </Card>
          );
        })}
      </div>
    </div>
  );
}
