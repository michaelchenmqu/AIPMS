// Time-driven lifecycle sync — AIPMS has no background job runner (see
// lib/reminders.ts), so a reservation's stored status and its turnover
// cleaning job only ever change when something calls these. Point a
// scheduler at /api/cron/lifecycle every 15-30 minutes to keep both in
// step with real time: UPCOMING -> IN_STAY -> CHECKED_OUT as check-in/
// check-out pass, and a cleaning Job marked DONE once a stay's checkout
// has happened — exactly the shape prisma/seed.ts's createCompletedJob
// produces, so demo data keeps looking "lived in" indefinitely rather
// than freezing at whatever the seed/import date happened to be.

import { prisma } from "@/lib/prisma";
import { cleanCheckRoom } from "@/lib/ai";
import { computeJobTotals, LINEN_UNIT_COST } from "@/lib/billing";

export async function syncReservationStatuses() {
  const now = new Date();

  const [toInStay, toCheckedOut, toUpcoming] = await prisma.$transaction([
    prisma.reservation.updateMany({
      where: { status: { not: "IN_STAY" }, checkIn: { lte: now }, checkOut: { gt: now } },
      data: { status: "IN_STAY" },
    }),
    prisma.reservation.updateMany({
      where: { status: { not: "CHECKED_OUT" }, checkOut: { lte: now } },
      data: { status: "CHECKED_OUT" },
    }),
    // Covers a reservation whose dates were edited after it was marked
    // IN_STAY/CHECKED_OUT, pushing check-in back into the future — rare,
    // but cheap to keep correct.
    prisma.reservation.updateMany({
      where: { status: { not: "UPCOMING" }, checkIn: { gt: now } },
      data: { status: "UPCOMING" },
    }),
  ]);

  return { checkedIn: toInStay.count, checkedOut: toCheckedOut.count, revertedToUpcoming: toUpcoming.count };
}

const ROOM_IMAGE: Record<string, string> = {
  LIVING_ROOM: "/images/room-living.svg",
  BEDROOM: "/images/room-bedroom.svg",
  KITCHEN: "/images/room-kitchen.svg",
  BATHROOM: "/images/room-bathroom.svg",
};

export async function completeTurnoverCleaning() {
  const now = new Date();

  const dueReservations = await prisma.reservation.findMany({
    where: { status: "CHECKED_OUT", checkOut: { lte: now } },
    include: {
      property: true,
      jobs: { where: { type: "CLEANING" }, orderBy: { createdAt: "desc" } },
    },
  });

  let completed = 0;
  let created = 0;
  let skippedNoContractor = 0;

  for (const reservation of dueReservations) {
    if (reservation.jobs.some((j) => j.status === "DONE")) continue;

    // Reuse a job already created for this checkout (e.g. a PENDING one
    // seeded ahead of time) rather than creating a duplicate.
    const pending = reservation.jobs.find((j) => j.status !== "DONE");

    let contractorId: string;
    let assignedUserId: string | null;
    let hourlyRate: number;
    if (pending) {
      contractorId = pending.contractorId;
      assignedUserId = pending.assignedUserId;
      hourlyRate = pending.hourlyRate;
    } else {
      // No job exists for this reservation at all — reuse whichever
      // contractor/housekeeper most recently cleaned this property rather
      // than guessing; if this property has no cleaning history, skip it
      // instead of assigning an arbitrary contractor.
      const lastJobForProperty = await prisma.job.findFirst({
        where: { propertyId: reservation.propertyId, type: "CLEANING" },
        orderBy: { createdAt: "desc" },
      });
      if (!lastJobForProperty) {
        skippedNoContractor++;
        continue;
      }
      contractorId = lastJobForProperty.contractorId;
      assignedUserId = lastJobForProperty.assignedUserId;
      hourlyRate = lastJobForProperty.hourlyRate;
    }

    // Plausible turnover timing: housekeeper arrives an hour after
    // checkout, done about ninety minutes later.
    const arrivalAt = new Date(reservation.checkOut.getTime() + 60 * 60 * 1000);
    const departureAt = new Date(arrivalAt.getTime() + 90 * 60 * 1000);
    const linen = [
      { item: "QUEEN" as const, quantity: reservation.property.linenParQueen },
      { item: "SINGLE" as const, quantity: reservation.property.linenParSingle },
      { item: "BATH" as const, quantity: reservation.property.linenParBath },
    ];
    const totals = computeJobTotals({
      arrivalAt,
      departureAt,
      hourlyRate,
      linen: linen.map((l) => ({ quantity: l.quantity, unitCost: LINEN_UNIT_COST[l.item] })),
    });

    const job = pending
      ? await prisma.job.update({
          where: { id: pending.id },
          data: {
            status: "DONE",
            arrivalAt,
            arrivalPhotoUrl: pending.arrivalPhotoUrl ?? "/images/keybox-capture.svg",
            departureAt,
            departurePhotoUrl: "/images/keybox-capture.svg",
            ...totals,
          },
        })
      : await prisma.job.create({
          data: {
            propertyId: reservation.propertyId,
            reservationId: reservation.id,
            contractorId,
            assignedUserId,
            type: "CLEANING",
            status: "DONE",
            arrivalAt,
            arrivalPhotoUrl: "/images/keybox-capture.svg",
            departureAt,
            departurePhotoUrl: "/images/keybox-capture.svg",
            hourlyRate,
            ...totals,
          },
        });

    if (pending) completed++;
    else created++;

    await prisma.linenUsage.createMany({
      data: linen.map((l) => ({ jobId: job.id, item: l.item, quantity: l.quantity, unitCost: LINEN_UNIT_COST[l.item] })),
    });

    for (const room of ["LIVING_ROOM", "BEDROOM", "KITCHEN", "BATHROOM"] as const) {
      const result = await cleanCheckRoom({ jobId: job.id, room });
      await prisma.jobRoomCheck.create({
        data: {
          jobId: job.id,
          room,
          afterPhotoUrl: ROOM_IMAGE[room],
          matchPercent: result.matchPercent,
          flagged: result.flagged,
          aiNote: result.note,
        },
      });
    }
  }

  return { completed, created, skippedNoContractor };
}
