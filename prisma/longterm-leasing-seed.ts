// Long-term leasing sample data — shared between prisma/seed.ts (a fresh
// database, entities created moments earlier in the same run) and
// prisma/run-longterm-leasing-seed.ts (an already-seeded database, e.g.
// Neon staging/demo, where the same entities already exist and are looked
// up instead of created). Keeping this in one place means the two never
// drift out of sync with each other.
//
// Gives the /portal/leasing scheduler/compliance dashboard, the tenant
// portal, and the reporting charts (lease calendar, short<->long
// conversion trend, rent revenue, AI scheduler forecast) real history to
// show instead of an empty state. Four properties get a long-term story;
// the rest (Island Oasis, Bay Retreat, Hilltop Hideaway) stay pure
// short-stay flagships.
//
// Deliberately hand-built rather than routed through lib/leasing.ts — a
// seed script wants exact, reproducible numbers (a guaranteed flagged
// room, a guaranteed overdue lease, a guaranteed already-scheduled one),
// not whatever the guarded functions or the AI mock's seeded-random would
// happen to produce.

import type { PrismaClient } from "@prisma/client";

const ROOMS = ["LIVING_ROOM", "BEDROOM", "KITCHEN", "BATHROOM"] as const;

const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

export type LongTermLeasingSeedDeps = {
  james: { id: string };
  priya: { id: string };
  nadia: { id: string; name: string };
  coastalCabin: { id: string };
  lighthouseView: { id: string };
  hinterlandBarn: { id: string };
  fernGullyCottage: { id: string };
  leaseTenantPasswordHash: string;
};

/** Every 7 days from startDaysAgo down to (but not including) endDaysAgo,
 *  paired RENT_COLLECTED + COMMISSION ledger rows at whatever rent was in
 *  effect at that point (rentAt walks the RentReview history). */
function weeklyRentLedger(params: {
  ownerId: string;
  leaseId: string;
  startDaysAgo: number;
  endDaysAgo: number;
  rentAt: (daysAgo: number) => number;
  feeRate: number;
}) {
  const rows: { ownerId: string; leaseId: string; type: "RENT_COLLECTED" | "COMMISSION"; amount: number; memo: string; date: Date }[] = [];
  for (let d = params.startDaysAgo; d > params.endDaysAgo; d -= 7) {
    const rent = params.rentAt(d);
    const commission = Math.round(rent * params.feeRate * 100) / 100;
    rows.push({ ownerId: params.ownerId, leaseId: params.leaseId, type: "RENT_COLLECTED", amount: rent, memo: "Rent payment", date: daysAgo(d) });
    rows.push({
      ownerId: params.ownerId,
      leaseId: params.leaseId,
      type: "COMMISSION",
      amount: -commission,
      memo: `Management fee (${Math.round(params.feeRate * 100)}%)`,
      date: daysAgo(d),
    });
  }
  return rows;
}

export async function seedLongTermLeasing(prisma: PrismaClient, deps: LongTermLeasingSeedDeps) {
  const { james, priya, nadia, coastalCabin, lighthouseView, hinterlandBarn, fernGullyCottage, leaseTenantPasswordHash } = deps;

  // --- Coastal Cabin: converted, leased, reverted, leased again ---------
  const priyaKapoor = await prisma.tenant.create({ data: { name: "Priya Kapoor", email: "priya.kapoor@example.com" } });
  const owenBlake = await prisma.tenant.create({ data: { name: "Owen Blake", email: "owen.blake@example.com", phone: "+61491570161" } });

  const coastalCabinLeaseA = await prisma.lease.create({
    data: {
      propertyId: coastalCabin.id,
      termType: "PERIODIC",
      startDate: daysAgo(300),
      endDate: daysAgo(180),
      rentAmount: 520,
      rentFrequency: "WEEKLY",
      managementFeeRate: 0.08,
      bondAmount: 2000,
      bondStatus: "REFUNDED",
      bondReference: "RBO-441207",
      bondLodgedAt: daysAgo(298),
      status: "ENDED",
      endedAt: daysAgo(180),
      tenants: { create: { tenantId: priyaKapoor.id } },
    },
  });
  const coastalCabinLeaseB = await prisma.lease.create({
    data: {
      propertyId: coastalCabin.id,
      termType: "PERIODIC",
      startDate: daysAgo(150),
      rentAmount: 560,
      rentFrequency: "WEEKLY",
      managementFeeRate: 0.08,
      bondAmount: 2100,
      bondStatus: "LODGED",
      bondReference: "RBO-778812",
      bondLodgedAt: daysAgo(145),
      status: "ACTIVE",
      tenants: { create: { tenantId: owenBlake.id } },
    },
  });

  await prisma.propertyModeChange.createMany({
    data: [
      { propertyId: coastalCabin.id, fromMode: "SHORT_TERM", toMode: "LONG_TERM", changedByUserId: nadia.id, changedAt: daysAgo(300), note: "Owner requested long-term lease trial" },
      { propertyId: coastalCabin.id, fromMode: "LONG_TERM", toMode: "SHORT_TERM", changedByUserId: nadia.id, changedAt: daysAgo(180), note: "Lease ended, owner wants it back on OTAs" },
      { propertyId: coastalCabin.id, fromMode: "SHORT_TERM", toMode: "LONG_TERM", changedByUserId: nadia.id, changedAt: daysAgo(150), note: "New long-term tenant found" },
    ],
  });
  await prisma.property.update({ where: { id: coastalCabin.id }, data: { lettingMode: "LONG_TERM" } });
  await prisma.rentReview.create({
    data: { leaseId: coastalCabinLeaseA.id, previousRent: 500, newRent: 520, effectiveDate: daysAgo(220), note: "Annual review" },
  });
  await prisma.rentReview.create({
    data: { leaseId: coastalCabinLeaseB.id, previousRent: 540, newRent: 560, effectiveDate: daysAgo(90), note: "Suburb median moved" },
  });
  await prisma.trustLedgerEntry.createMany({
    data: [
      ...weeklyRentLedger({ ownerId: james.id, leaseId: coastalCabinLeaseA.id, startDaysAgo: 300, endDaysAgo: 180, rentAt: (d) => (d > 220 ? 500 : 520), feeRate: 0.08 }),
      ...weeklyRentLedger({ ownerId: james.id, leaseId: coastalCabinLeaseB.id, startDaysAgo: 150, endDaysAgo: 0, rentAt: (d) => (d > 90 ? 540 : 560), feeRate: 0.08 }),
    ],
  });

  const coastalEntryA = await prisma.conditionReport.create({ data: { leaseId: coastalCabinLeaseA.id, type: "ENTRY", createdAt: daysAgo(300) } });
  await prisma.conditionRoomCheck.createMany({
    data: ROOMS.map((room) => ({ conditionReportId: coastalEntryA.id, room, photoUrl: "/images/room-living.svg", aiNote: "Condition documented at entry — baseline for future reports.", createdAt: daysAgo(300) })),
  });
  const coastalExitA = await prisma.conditionReport.create({ data: { leaseId: coastalCabinLeaseA.id, type: "EXIT", createdAt: daysAgo(180) } });
  await prisma.conditionRoomCheck.createMany({
    data: ROOMS.map((room) => ({
      conditionReportId: coastalExitA.id,
      room,
      photoUrl: "/images/room-living.svg",
      matchPercent: 93,
      flagged: false,
      aiNote: "Consistent with entry condition.",
      reviewedAt: daysAgo(179),
      reviewedBy: nadia.name,
      reviewStatus: "APPROVED",
      reviewNote: "Bond refunded in full — no deductions.",
      createdAt: daysAgo(180),
    })),
  });

  const coastalEntryB = await prisma.conditionReport.create({ data: { leaseId: coastalCabinLeaseB.id, type: "ENTRY", createdAt: daysAgo(150) } });
  await prisma.conditionRoomCheck.createMany({
    data: ROOMS.map((room) => ({ conditionReportId: coastalEntryB.id, room, photoUrl: "/images/room-living.svg", aiNote: "Condition documented at entry — baseline for future reports.", createdAt: daysAgo(150) })),
  });
  const coastalRoutineB1 = await prisma.conditionReport.create({ data: { leaseId: coastalCabinLeaseB.id, type: "ROUTINE", createdAt: daysAgo(60) } });
  await prisma.conditionRoomCheck.createMany({
    data: ROOMS.map((room) => ({ conditionReportId: coastalRoutineB1.id, room, photoUrl: "/images/room-living.svg", matchPercent: 94, flagged: false, aiNote: "Consistent with entry condition.", createdAt: daysAgo(60) })),
  });
  await prisma.routineInspection.create({
    data: { leaseId: coastalCabinLeaseB.id, scheduledFor: daysAgo(60), noticeGivenAt: daysAgo(67), status: "COMPLETED", conditionReportId: coastalRoutineB1.id, createdAt: daysAgo(70) },
  });
  // Already proposed and booked by the AI scheduler for next month —
  // notice sent, room photos not captured yet.
  await prisma.routineInspection.create({
    data: { leaseId: coastalCabinLeaseB.id, scheduledFor: daysFromNow(28), noticeGivenAt: daysAgo(0), status: "NOTICE_SENT", createdAt: daysAgo(1) },
  });

  // --- Lighthouse View: newly converted, first inspection overdue -------
  const samWu = await prisma.tenant.create({ data: { name: "Sam Wu", email: "sam.wu@example.com", phone: "+61491570177" } });
  const lighthouseLease = await prisma.lease.create({
    data: {
      propertyId: lighthouseView.id,
      termType: "PERIODIC",
      startDate: daysAgo(95),
      rentAmount: 610,
      rentFrequency: "WEEKLY",
      managementFeeRate: 0.08,
      bondAmount: 2400,
      bondStatus: "PENDING",
      status: "ACTIVE",
      tenants: { create: { tenantId: samWu.id } },
    },
  });
  await prisma.propertyModeChange.create({
    data: { propertyId: lighthouseView.id, fromMode: "SHORT_TERM", toMode: "LONG_TERM", changedByUserId: nadia.id, changedAt: daysAgo(95), note: "Owner switching to long-term for stable income" },
  });
  await prisma.property.update({ where: { id: lighthouseView.id }, data: { lettingMode: "LONG_TERM" } });
  await prisma.trustLedgerEntry.createMany({
    data: weeklyRentLedger({ ownerId: james.id, leaseId: lighthouseLease.id, startDaysAgo: 95, endDaysAgo: 0, rentAt: () => 610, feeRate: 0.08 }),
  });
  const lighthouseEntry = await prisma.conditionReport.create({ data: { leaseId: lighthouseLease.id, type: "ENTRY", createdAt: daysAgo(95) } });
  await prisma.conditionRoomCheck.createMany({
    data: ROOMS.map((room) => ({ conditionReportId: lighthouseEntry.id, room, photoUrl: "/images/room-living.svg", aiNote: "Condition documented at entry — baseline for future reports.", createdAt: daysAgo(95) })),
  });
  // No inspection since — due 95-90=5 days ago, deliberately left
  // overdue with nothing scheduled, so the compliance dashboard and the
  // AI scheduler's proposal batch both have a real overdue case to show.

  // --- Hinterland Barn: longest-running, one flagged room, tenant login -
  const morganEllis = await prisma.tenant.create({ data: { name: "Morgan Ellis", email: "morgan.ellis@example.com", phone: "+61491570188" } });
  const hinterlandLease = await prisma.lease.create({
    data: {
      propertyId: hinterlandBarn.id,
      termType: "PERIODIC",
      startDate: daysAgo(240),
      rentAmount: 650,
      rentFrequency: "WEEKLY",
      managementFeeRate: 0.08,
      bondAmount: 2600,
      bondStatus: "LODGED",
      bondReference: "RBO-556231",
      bondLodgedAt: daysAgo(235),
      status: "ACTIVE",
      tenants: { create: { tenantId: morganEllis.id } },
    },
  });
  await prisma.propertyModeChange.create({
    data: { propertyId: hinterlandBarn.id, fromMode: "SHORT_TERM", toMode: "LONG_TERM", changedByUserId: nadia.id, changedAt: daysAgo(240), note: "Owner's longest-running long-term tenancy" },
  });
  await prisma.property.update({ where: { id: hinterlandBarn.id }, data: { lettingMode: "LONG_TERM" } });
  await prisma.rentReview.create({ data: { leaseId: hinterlandLease.id, previousRent: 620, newRent: 635, effectiveDate: daysAgo(180), note: "Annual review" } });
  await prisma.rentReview.create({ data: { leaseId: hinterlandLease.id, previousRent: 635, newRent: 650, effectiveDate: daysAgo(60), note: "Suburb median moved" } });
  await prisma.trustLedgerEntry.createMany({
    data: [
      ...weeklyRentLedger({
        ownerId: priya.id,
        leaseId: hinterlandLease.id,
        startDaysAgo: 240,
        endDaysAgo: 0,
        rentAt: (d) => (d > 180 ? 620 : d > 60 ? 635 : 650),
        feeRate: 0.08,
      }),
      { ownerId: priya.id, leaseId: hinterlandLease.id, type: "WATER_USAGE", amount: 58.2, memo: "Water usage charge", date: daysAgo(150) },
      { ownerId: priya.id, leaseId: hinterlandLease.id, type: "WATER_USAGE", amount: 64.1, memo: "Water usage charge", date: daysAgo(60) },
      { ownerId: priya.id, leaseId: hinterlandLease.id, type: "WATER_USAGE", amount: 71.5, memo: "Water usage charge", date: daysAgo(5) },
    ],
  });

  const hinterlandEntry = await prisma.conditionReport.create({ data: { leaseId: hinterlandLease.id, type: "ENTRY", createdAt: daysAgo(240) } });
  await prisma.conditionRoomCheck.createMany({
    data: ROOMS.map((room) => ({ conditionReportId: hinterlandEntry.id, room, photoUrl: "/images/room-living.svg", aiNote: "Condition documented at entry — baseline for future reports.", createdAt: daysAgo(240) })),
  });
  const hinterlandRoutine1 = await prisma.conditionReport.create({ data: { leaseId: hinterlandLease.id, type: "ROUTINE", createdAt: daysAgo(150) } });
  await prisma.conditionRoomCheck.createMany({
    data: ROOMS.map((room) => ({ conditionReportId: hinterlandRoutine1.id, room, photoUrl: "/images/room-living.svg", matchPercent: 92, flagged: false, aiNote: "Consistent with entry condition.", createdAt: daysAgo(150) })),
  });
  await prisma.routineInspection.create({
    data: { leaseId: hinterlandLease.id, scheduledFor: daysAgo(150), noticeGivenAt: daysAgo(157), status: "COMPLETED", conditionReportId: hinterlandRoutine1.id, createdAt: daysAgo(160) },
  });
  // Most recent inspection — one flagged room, left unreviewed on purpose
  // so the compliance dashboard's "Flagged" bucket has a real case, and
  // the next due date (30+90=60 days out) is a genuine, not-yet-scheduled
  // AI-scheduler proposal for two months out.
  const hinterlandRoutine2 = await prisma.conditionReport.create({ data: { leaseId: hinterlandLease.id, type: "ROUTINE", createdAt: daysAgo(30) } });
  await prisma.conditionRoomCheck.createMany({
    data: [
      { conditionReportId: hinterlandRoutine2.id, room: "LIVING_ROOM", photoUrl: "/images/room-living.svg", matchPercent: 93, flagged: false, aiNote: "Consistent with entry condition.", createdAt: daysAgo(30) },
      { conditionReportId: hinterlandRoutine2.id, room: "BEDROOM", photoUrl: "/images/room-bedroom.svg", matchPercent: 80, flagged: true, aiNote: "Scuff marks on the wall not present at entry.", createdAt: daysAgo(30) },
      { conditionReportId: hinterlandRoutine2.id, room: "KITCHEN", photoUrl: "/images/room-kitchen.svg", matchPercent: 91, flagged: false, aiNote: "Consistent with entry condition.", createdAt: daysAgo(30) },
      { conditionReportId: hinterlandRoutine2.id, room: "BATHROOM", photoUrl: "/images/room-bathroom.svg", matchPercent: 95, flagged: false, aiNote: "Consistent with entry condition.", createdAt: daysAgo(30) },
    ],
  });
  await prisma.routineInspection.create({
    data: { leaseId: hinterlandLease.id, scheduledFor: daysAgo(30), noticeGivenAt: daysAgo(37), status: "COMPLETED", conditionReportId: hinterlandRoutine2.id, createdAt: daysAgo(40) },
  });

  const morganUser = await prisma.user.create({
    data: { email: "morgan.ellis@example.com", passwordHash: leaseTenantPasswordHash, name: "Morgan Ellis", role: "TENANT", tenantId: morganEllis.id },
  });
  await prisma.workOrder.create({
    data: {
      propertyId: hinterlandBarn.id,
      leaseId: hinterlandLease.id,
      raisedByTenantId: morganEllis.id,
      title: "Ceiling fan noisy in main bedroom",
      description: "Been rattling for about a week, especially on the higher speed settings.",
      status: "DONE",
      priority: "MEDIUM",
      createdAt: daysAgo(20),
    },
  });

  // --- Fern Gully Cottage: converted, taking applications, no lease yet -
  await prisma.propertyModeChange.create({
    data: { propertyId: fernGullyCottage.id, fromMode: "SHORT_TERM", toMode: "LONG_TERM", changedByUserId: nadia.id, changedAt: daysAgo(20), note: "Testing the long-term market in Bangalow" },
  });
  await prisma.property.update({ where: { id: fernGullyCottage.id }, data: { lettingMode: "LONG_TERM" } });
  await prisma.tenantApplication.createMany({
    data: [
      {
        propertyId: fernGullyCottage.id,
        name: "Ben Carter",
        email: "ben.carter@example.com",
        phone: "+61491570191",
        moveInDate: daysFromNow(14),
        note: "Relocating for work, references available.",
        status: "APPROVED",
        reviewedAt: daysAgo(5),
        reviewedBy: nadia.name,
        reviewNote: "References checked out, income verified.",
        createdAt: daysAgo(10),
      },
      {
        propertyId: fernGullyCottage.id,
        name: "Jess Okafor",
        email: "jess.okafor@example.com",
        phone: "+61491570192",
        moveInDate: daysFromNow(21),
        note: "Quiet professional couple, no pets.",
        status: "PENDING",
        createdAt: daysAgo(4),
      },
    ],
  });

  return { morganUser };
}
