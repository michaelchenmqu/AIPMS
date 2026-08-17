import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, ScrollTable } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { reviewRoomCheck } from "../housekeeping/[id]/actions";

const ROOM_LABEL: Record<string, string> = {
  LIVING_ROOM: "Living room",
  BEDROOM: "Main bedroom",
  KITCHEN: "Kitchen",
  BATHROOM: "Bathroom",
};

export default async function AuditsPage() {
  const [pending, reviewed] = await Promise.all([
    prisma.jobRoomCheck.findMany({
      where: { flagged: true, reviewedAt: null },
      include: { job: { include: { property: true, assignedUser: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.jobRoomCheck.findMany({
      where: { flagged: true, reviewedAt: { not: null } },
      include: { job: { include: { property: true, assignedUser: true } } },
      orderBy: { reviewedAt: "desc" },
      take: 10,
    }),
  ]);

  return (
    <div>
      <PageHeader title="Q&A / audits" subtitle="Supervisor review queue for AI clean-check soft-flags" />

      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-2)] mb-3">
        Pending review · {pending.length}
      </div>
      <div className="grid md:grid-cols-2 gap-4 mb-8">
        {pending.map((rc) => (
          <Card key={rc.id} className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <Link href={`/portal/housekeeping/${rc.jobId}`} className="text-sm font-semibold text-[var(--color-navy)] hover:underline">
                  {rc.job.property.name}
                </Link>
                <div className="text-xs text-[var(--color-muted)]">
                  {ROOM_LABEL[rc.room]} · {rc.job.assignedUser?.name ?? "Unassigned"}
                </div>
              </div>
              <Badge tone="warning">{rc.matchPercent}% match</Badge>
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-2">{rc.aiNote}</p>
            <div className="flex items-center justify-between mt-3">
              <span className="text-[11px] text-[var(--color-muted-2)]">{timeAgo(rc.createdAt)}</span>
              <form action={reviewRoomCheck.bind(null, rc.id, "Reviewed — no action needed")}>
                <button className="tap text-xs font-semibold bg-[var(--color-navy)] text-white rounded-lg px-3 py-1.5">
                  Approve
                </button>
              </form>
            </div>
          </Card>
        ))}
        {pending.length === 0 && (
          <div className="col-span-full text-center py-10 text-[var(--color-muted)] border border-dashed border-[var(--color-sand-400)] rounded-2xl">
            Nothing pending review.
          </div>
        )}
      </div>

      <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-2)] mb-3">
        Recently reviewed
      </div>
      <Card className="p-0 overflow-hidden">
        <ScrollTable>
        <table className="w-full text-sm">
          <tbody>
            {reviewed.map((rc) => (
              <tr key={rc.id} className="border-t border-[var(--color-sand-200)] first:border-t-0">
                <td className="px-5 py-3 font-medium text-[var(--color-navy)]">{rc.job.property.name}</td>
                <td className="px-5 py-3 text-[var(--color-muted)]">{ROOM_LABEL[rc.room]}</td>
                <td className="px-5 py-3 text-[var(--color-muted)]">{rc.reviewNote}</td>
                <td className="px-5 py-3 text-right text-xs text-[var(--color-muted-2)]">
                  {rc.reviewedBy} · {rc.reviewedAt && timeAgo(rc.reviewedAt)}
                </td>
              </tr>
            ))}
            {reviewed.length === 0 && (
              <tr>
                <td className="px-5 py-10 text-center text-[var(--color-muted)]">No reviews yet.</td>
              </tr>
            )}
          </tbody>
        </table>
        </ScrollTable>
      </Card>
    </div>
  );
}
