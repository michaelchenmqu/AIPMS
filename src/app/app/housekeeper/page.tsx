import Link from "next/link";
import { requireHousekeeperScope } from "@/lib/housekeeper";
import { prisma } from "@/lib/prisma";
import { formatDate } from "@/lib/format";

const STATUS_LABEL: Record<string, { label: string; tone: string }> = {
  PENDING: { label: "New", tone: "bg-[var(--color-info)] text-white" },
  ACCEPTED: { label: "Accepted", tone: "bg-[var(--color-info)] text-white" },
  IN_PROGRESS: { label: "In progress", tone: "bg-[var(--color-warning)] text-white" },
  DONE: { label: "Done", tone: "bg-[var(--color-success)] text-white" },
};

export default async function HousekeeperFeedPage() {
  const { user } = await requireHousekeeperScope();

  const jobs = await prisma.job.findMany({
    where: { assignedUserId: user.id, status: { in: ["PENDING", "ACCEPTED", "IN_PROGRESS"] } },
    include: { property: true, reservation: true },
    orderBy: { createdAt: "asc" },
  });

  const recentDone = await prisma.job.findMany({
    where: { assignedUserId: user.id, status: "DONE" },
    include: { property: true },
    orderBy: { departureAt: "desc" },
    take: 3,
  });

  return (
    <div className="pb-6">
      <div className="px-5 pt-6 pb-2">
        <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">Today&apos;s jobs</div>
        <div className="text-xs text-[var(--color-muted-2)] mt-0.5">{jobs.length} assigned</div>
      </div>

      <div className="px-5 flex flex-col gap-3">
        {jobs.map((j) => {
          const status = STATUS_LABEL[j.status];
          return (
            <Link key={j.id} href={`/app/housekeeper/jobs/${j.id}`}>
              <div className="tap bg-white rounded-2xl p-4 flex gap-3 items-center">
                {/* eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration */}
                <img src={j.property.heroImage} alt="" className="w-14 h-14 object-cover rounded-xl flex-none" />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold text-[var(--color-navy)] truncate">{j.property.name}</div>
                  <div className="text-xs text-[var(--color-muted)] truncate">{j.property.address}</div>
                  {j.reservation && (
                    <div className="text-[11px] text-[var(--color-muted-2)] mt-0.5">
                      Check-in {formatDate(j.reservation.checkIn)}
                    </div>
                  )}
                </div>
                <span className={`text-[10px] font-bold px-2.5 py-1 rounded-full ${status.tone}`}>{status.label}</span>
              </div>
            </Link>
          );
        })}
        {jobs.length === 0 && (
          <div className="text-center py-12 text-sm text-[var(--color-muted)] border border-dashed border-[var(--color-sand-400)] rounded-2xl">
            No jobs assigned right now.
          </div>
        )}
      </div>

      {recentDone.length > 0 && (
        <div className="px-5 mt-6">
          <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2">
            Recently completed
          </div>
          <div className="flex flex-col gap-2">
            {recentDone.map((j) => (
              <Link key={j.id} href={`/app/housekeeper/jobs/${j.id}`} className="tap flex items-center justify-between text-sm bg-white rounded-xl px-3.5 py-2.5">
                <span className="font-medium text-[var(--color-navy)]">{j.property.name}</span>
                <span className="text-xs text-[var(--color-muted)]">{j.departureAt && formatDate(j.departureAt)}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
