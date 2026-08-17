import { notFound } from "next/navigation";
import { requireHousekeeperScope } from "@/lib/housekeeper";
import { prisma } from "@/lib/prisma";
import JobFlow from "./JobFlow";

export default async function HousekeeperJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { user } = await requireHousekeeperScope();

  const job = await prisma.job.findUnique({
    where: { id },
    include: { property: true, reservation: true, linenUsage: true, roomChecks: true },
  });
  if (!job || job.assignedUserId !== user.id) notFound();

  return (
    <JobFlow
      job={{
        id: job.id,
        status: job.status,
        hourlyRate: job.hourlyRate,
        arrivalAt: job.arrivalAt?.toISOString() ?? null,
        departureAt: job.departureAt?.toISOString() ?? null,
        computedHours: job.computedHours,
        laborCost: job.laborCost,
        linenCost: job.linenCost,
        totalCost: job.totalCost,
        property: { name: job.property.name, address: job.property.address, heroImage: job.property.heroImage },
        reservation: job.reservation ? { guestName: job.reservation.guestName } : null,
        linenUsage: job.linenUsage.map((l) => ({ item: l.item, quantity: l.quantity })),
        roomChecks: job.roomChecks.map((rc) => ({
          room: rc.room,
          matchPercent: rc.matchPercent,
          flagged: rc.flagged,
          aiNote: rc.aiNote,
        })),
      }}
    />
  );
}
