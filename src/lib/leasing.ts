// Long-term leasing — Phase 1 of the "Dual-Mode Property Architecture"
// design: a Property can be SHORT_TERM (nightly bookings, OTA-synced) or
// LONG_TERM (leased), never ambiguously both. Switching between them is a
// guarded action, not a field edit — see switchToLongTerm/switchToShortTerm
// below — so a property never ends up with open business on both sides at
// once. Everything a Lease generates (rent, commission) posts into the
// same TrustLedgerEntry table and three-way reconciliation short-stay
// bookings already use; that engine needed zero changes for this.

import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { conditionCheckRoom } from "@/lib/ai";
import { sendInspectionNoticeMessage } from "@/lib/reminders";
import type { ConditionReport, ConditionReportType, Lease, RentFrequency, RoomKind, RoutineInspection } from "@prisma/client";

/** Thrown by the guarded switch actions — caught by the calling Server
 *  Action and turned into a friendly `?xError=` banner, same pattern as
 *  every other guarded action in this app (Basiq connect, WhatsApp send). */
export class LeasingError extends Error {}

/** Switches a property from short-stay to long-term leasing. Blocked
 *  while there's any open short-stay business — an UPCOMING or IN_STAY
 *  reservation — so a booked guest never arrives at a property that's
 *  quietly become a lease. Also drops the property's Channex connection:
 *  AIPMS just stops treating it as OTA-synced locally. It does not call
 *  Channex to unregister the property remotely — that's a real gap for a
 *  live account, flagged rather than silently assumed away. */
export async function switchToLongTerm(propertyId: string, userId: string, note?: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.lettingMode === "LONG_TERM") return;

  const openReservations = await prisma.reservation.count({
    where: { propertyId, status: { in: ["UPCOMING", "IN_STAY"] } },
  });
  if (openReservations > 0) {
    throw new LeasingError(
      `Can't switch — ${openReservations} upcoming/in-stay reservation${openReservations === 1 ? "" : "s"} still open. Let them complete, or cancel/relocate them first.`
    );
  }

  await prisma.$transaction([
    prisma.property.update({
      where: { id: propertyId },
      data: { lettingMode: "LONG_TERM", channexPropertyId: null },
    }),
    prisma.propertyModeChange.create({
      data: { propertyId, fromMode: "SHORT_TERM", toMode: "LONG_TERM", changedByUserId: userId, note },
    }),
  ]);
}

/** Switches a property back to short-stay. Blocked while a Lease is still
 *  ACTIVE or ENDING — the lease has to actually end first (bond
 *  refunded/claimed, tenant vacated), not just be forgotten about. */
export async function switchToShortTerm(propertyId: string, userId: string, note?: string) {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
  if (property.lettingMode === "SHORT_TERM") return;

  const openLeases = await prisma.lease.count({
    where: { propertyId, status: { in: ["ACTIVE", "ENDING"] } },
  });
  if (openLeases > 0) {
    throw new LeasingError("Can't switch — this property still has an active or ending lease. End it first.");
  }

  await prisma.$transaction([
    prisma.property.update({ where: { id: propertyId }, data: { lettingMode: "SHORT_TERM" } }),
    prisma.propertyModeChange.create({
      data: { propertyId, fromMode: "LONG_TERM", toMode: "SHORT_TERM", changedByUserId: userId, note },
    }),
  ]);
}

/** Staff action, "Add a lease" on a LONG_TERM property with none active.
 *  Creates the Tenant (or reuses one matching by email) and the Lease in
 *  one step — Phase 1 keeps this to a single primary tenant from the UI
 *  side, though LeaseTenant supports co-tenancy for when that's needed. */
export async function createLease(params: {
  propertyId: string;
  tenantName: string;
  tenantEmail?: string;
  tenantPhone?: string;
  startDate: Date;
  endDate?: Date;
  rentAmount: number;
  rentFrequency: RentFrequency;
  bondAmount?: number;
}): Promise<Lease> {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: params.propertyId } });
  if (property.lettingMode !== "LONG_TERM") {
    throw new LeasingError("This property isn't in long-term leasing mode.");
  }
  const openLease = await prisma.lease.findFirst({
    where: { propertyId: params.propertyId, status: { in: ["ACTIVE", "ENDING"] } },
  });
  if (openLease) {
    throw new LeasingError("This property already has an active lease.");
  }

  const tenant = params.tenantEmail
    ? await prisma.tenant.upsert({
        where: { email: params.tenantEmail },
        create: { name: params.tenantName, email: params.tenantEmail, phone: params.tenantPhone },
        update: { name: params.tenantName, phone: params.tenantPhone },
      })
    : await prisma.tenant.create({
        data: { name: params.tenantName, phone: params.tenantPhone },
      });

  return prisma.lease.create({
    data: {
      propertyId: params.propertyId,
      startDate: params.startDate,
      endDate: params.endDate,
      rentAmount: params.rentAmount,
      rentFrequency: params.rentFrequency,
      bondAmount: params.bondAmount,
      tenants: { create: { tenantId: tenant.id } },
    },
  });
}

/** Staff action, "Record rent payment" on an active lease — Phase 1's
 *  bare-bones ledger: manual entry, not a bank feed (that's short-stay's
 *  Basiq integration; leasing rent reconciliation is a later phase). Posts
 *  two TrustLedgerEntry rows — the rent collected and the agency's
 *  commission on it — same shape as a short-stay booking settlement, so
 *  the existing three-way reconciliation and owner statements pick it up
 *  with no changes of their own. */
export async function recordRentPayment(leaseId: string, params: { amount: number; date: Date; memo?: string }) {
  const lease = await prisma.lease.findUniqueOrThrow({
    where: { id: leaseId },
    include: { property: true },
  });
  if (lease.status !== "ACTIVE" && lease.status !== "ENDING") {
    throw new LeasingError("This lease isn't active.");
  }

  const commission = params.amount * lease.managementFeeRate;
  await prisma.$transaction([
    prisma.trustLedgerEntry.create({
      data: {
        ownerId: lease.property.ownerId,
        leaseId,
        type: "RENT_COLLECTED",
        amount: params.amount,
        memo: params.memo ?? "Rent payment",
        date: params.date,
      },
    }),
    prisma.trustLedgerEntry.create({
      data: {
        ownerId: lease.property.ownerId,
        leaseId,
        type: "COMMISSION",
        amount: -commission,
        memo: `Management fee (${Math.round(lease.managementFeeRate * 100)}%)`,
        date: params.date,
      },
    }),
  ]);
}

/** Staff action, "End lease" — marks it ENDED so the property becomes
 *  eligible to switch back to short-stay. Doesn't touch the bond; that's
 *  tracked/updated separately (bondStatus/bondReference on the lease) as
 *  its own real-world process. */
export async function endLease(leaseId: string) {
  await prisma.lease.update({
    where: { id: leaseId },
    data: { status: "ENDED", endedAt: new Date() },
  });
}

/** Staff action, "Create portal login" on a tenant's lease card —
 *  provisions the User (role TENANT) that lets them sign into /tenant.
 *  Requires an email on file (Tenant.email is what User.email will be,
 *  and that column is unique) and refuses to silently overwrite an
 *  existing login for the same address. The temp password matches every
 *  other seeded demo account (demo1234) — real deployments would send a
 *  reset link instead, but there's no email-sending integration in AIPMS
 *  to hang that off yet. */
export async function createTenantLogin(tenantId: string): Promise<{ email: string; tempPassword: string }> {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  if (!tenant.email) {
    throw new LeasingError("This tenant needs an email on file before a portal login can be created.");
  }
  const existing = await prisma.user.findUnique({ where: { email: tenant.email } });
  if (existing) {
    throw new LeasingError("A portal login already exists for this email.");
  }

  const tempPassword = "demo1234";
  const passwordHash = bcrypt.hashSync(tempPassword, 10);
  await prisma.user.create({
    data: { email: tenant.email, passwordHash, name: tenant.name, role: "TENANT", tenantId: tenant.id },
  });
  return { email: tenant.email, tempPassword };
}

// ---------------------------------------------------------------------------
// Condition reports — Phase 2. The AI clean-check pipeline, repointed: an
// ENTRY report just documents each room (it IS the baseline); an EXIT or
// ROUTINE report compares its photo against that lease's own entry photo
// for the same room, via conditionCheckRoom in lib/ai.ts.
// ---------------------------------------------------------------------------

/** Staff action, "+ Entry report" / "+ Exit report" on a lease's condition
 *  reports card. Only one ENTRY report per lease — it's the baseline every
 *  later report compares against, so a second one would be ambiguous.
 *  EXIT (and ROUTINE, created via startInspectionReport below) can recur. */
export async function createConditionReport(leaseId: string, type: "ENTRY" | "EXIT"): Promise<ConditionReport> {
  if (type === "ENTRY") {
    const existing = await prisma.conditionReport.findFirst({ where: { leaseId, type: "ENTRY" } });
    if (existing) {
      throw new LeasingError("This lease already has an entry condition report — it's the baseline, not repeatable.");
    }
  }
  return prisma.conditionReport.create({ data: { leaseId, type } });
}

/** Staff action, the photo upload on a condition report's room card.
 *  Looks up the lease's ENTRY report's photo for the same room as the
 *  baseline (none, on the ENTRY report itself, or if no entry photo has
 *  been captured for that room yet), then runs the AI comparison and
 *  upserts the room's check — same idempotent-per-room pattern as
 *  room-check/route.ts uses for JobRoomCheck. */
export async function recordConditionRoomPhoto(reportId: string, room: RoomKind, photoDataUrl: string) {
  const report = await prisma.conditionReport.findUniqueOrThrow({ where: { id: reportId } });

  let baselinePhotoDataUrl: string | null = null;
  if (report.type !== "ENTRY") {
    const entryReport = await prisma.conditionReport.findFirst({
      where: { leaseId: report.leaseId, type: "ENTRY" },
      orderBy: { createdAt: "asc" },
    });
    if (entryReport) {
      const baselineCheck = await prisma.conditionRoomCheck.findFirst({ where: { conditionReportId: entryReport.id, room } });
      baselinePhotoDataUrl = baselineCheck?.photoUrl ?? null;
    }
  }

  const result = await conditionCheckRoom({
    reportId,
    room,
    mode: report.type === "ENTRY" ? "document" : "compare",
    photoDataUrl,
    baselinePhotoDataUrl,
  });

  const existing = await prisma.conditionRoomCheck.findFirst({ where: { conditionReportId: reportId, room } });
  return existing
    ? prisma.conditionRoomCheck.update({
        where: { id: existing.id },
        data: {
          photoUrl: photoDataUrl,
          matchPercent: result.matchPercent,
          flagged: result.flagged,
          aiNote: result.note,
          reviewedAt: null,
          reviewedBy: null,
          reviewNote: null,
          reviewStatus: null,
        },
      })
    : prisma.conditionRoomCheck.create({
        data: {
          conditionReportId: reportId,
          room,
          photoUrl: photoDataUrl,
          matchPercent: result.matchPercent,
          flagged: result.flagged,
          aiNote: result.note,
        },
      });
}

// ---------------------------------------------------------------------------
// Routine inspections — Phase 2. A simple statutory-notice-aware lifecycle:
// SCHEDULED -> NOTICE_SENT -> IN_PROGRESS (once a ConditionReport exists to
// hold the room photos) -> COMPLETED, or CANCELLED at any point before
// completion. The AI inspection scheduler/QA batch-proposal design (see the
// Dual-Mode Property Architecture doc) builds on top of this lifecycle
// rather than replacing it.
// ---------------------------------------------------------------------------

export async function scheduleInspection(leaseId: string, scheduledFor: Date): Promise<RoutineInspection> {
  const lease = await prisma.lease.findUniqueOrThrow({ where: { id: leaseId } });
  if (lease.status !== "ACTIVE" && lease.status !== "ENDING") {
    throw new LeasingError("This lease isn't active.");
  }
  return prisma.routineInspection.create({ data: { leaseId, scheduledFor } });
}

/** Staff action, "Send notice" — records that the statutory notice period
 *  has started, and WhatsApps the tenant the notice itself via
 *  lib/reminders.ts#sendInspectionNoticeMessage. AIPMS doesn't yet enforce
 *  each state's specific notice window (see the Long-Term Leasing
 *  Requirements research); this records the fact for the audit trail
 *  without validating a minimum lead time. A missing WhatsApp config or
 *  tenant phone number is a real, expected gap (sendInspectionNoticeMessage
 *  just returns false) — it never blocks recording the notice itself. */
export async function sendInspectionNotice(inspectionId: string): Promise<RoutineInspection> {
  const inspection = await prisma.routineInspection.findUniqueOrThrow({
    where: { id: inspectionId },
    include: { lease: { include: { property: true, tenants: { include: { tenant: true } } } } },
  });
  if (inspection.status !== "SCHEDULED") {
    throw new LeasingError("Notice has already been given for this inspection.");
  }
  await sendInspectionNoticeMessage(inspection);
  return prisma.routineInspection.update({
    where: { id: inspectionId },
    data: { noticeGivenAt: new Date(), status: "NOTICE_SENT" },
  });
}

/** Staff action, "Start inspection" — creates the ROUTINE ConditionReport
 *  that holds this inspection's room photos, and links it. */
export async function startInspectionReport(inspectionId: string): Promise<RoutineInspection> {
  const inspection = await prisma.routineInspection.findUniqueOrThrow({ where: { id: inspectionId } });
  if (inspection.status !== "NOTICE_SENT") {
    throw new LeasingError("Give notice before starting the inspection.");
  }
  const report = await prisma.conditionReport.create({
    data: { leaseId: inspection.leaseId, type: "ROUTINE" as ConditionReportType },
  });
  return prisma.routineInspection.update({
    where: { id: inspectionId },
    data: { conditionReportId: report.id, status: "IN_PROGRESS" },
  });
}

/** Staff action, "Mark complete" on an in-progress inspection. */
export async function completeInspection(inspectionId: string): Promise<RoutineInspection> {
  const inspection = await prisma.routineInspection.findUniqueOrThrow({ where: { id: inspectionId } });
  if (inspection.status !== "IN_PROGRESS") {
    throw new LeasingError("Start the inspection report before marking it complete.");
  }
  return prisma.routineInspection.update({ where: { id: inspectionId }, data: { status: "COMPLETED" } });
}

/** Staff action, "Cancel" — available any time before COMPLETED. */
export async function cancelInspection(inspectionId: string): Promise<RoutineInspection> {
  const inspection = await prisma.routineInspection.findUniqueOrThrow({ where: { id: inspectionId } });
  if (inspection.status === "COMPLETED") {
    throw new LeasingError("Can't cancel a completed inspection.");
  }
  return prisma.routineInspection.update({ where: { id: inspectionId }, data: { status: "CANCELLED" } });
}

// ---------------------------------------------------------------------------
// AI inspection scheduler + portfolio compliance — the efficiency-at-scale
// features from the Dual-Mode Property Architecture doc's Phase 2 section.
// A manager running 100+ properties isn't beaten by the cadence math,
// they're beaten by driving to the same suburb three times in a month —
// so proposals are grouped by property.region ("geographic clustering"
// without needing real geocoding) and approved as one batch rather than
// one lease at a time.
// ---------------------------------------------------------------------------

/** Quarterly, same cadence used across the leasing research — real
 *  per-state caps (see the Long-Term Leasing Requirements research) are a
 *  later refinement, not a blocker for proposing sensible dates now. */
const INSPECTION_CADENCE_DAYS = 90;

type LeaseForSchedule = {
  id: string;
  propertyId: string;
  startDate: Date;
  property: { name: string; region: string };
  inspections: { status: string; scheduledFor: Date }[];
};

function hasOpenInspection(lease: Pick<LeaseForSchedule, "inspections">): boolean {
  return lease.inspections.some((i) => i.status === "SCHEDULED" || i.status === "NOTICE_SENT" || i.status === "IN_PROGRESS");
}

function nextInspectionDueDate(lease: Pick<LeaseForSchedule, "startDate" | "inspections">): Date {
  const lastCompleted = lease.inspections
    .filter((i) => i.status === "COMPLETED")
    .sort((a, b) => b.scheduledFor.getTime() - a.scheduledFor.getTime())[0];
  const baseline = lastCompleted?.scheduledFor ?? lease.startDate;
  const due = new Date(baseline);
  due.setDate(due.getDate() + INSPECTION_CADENCE_DAYS);
  return due;
}

export type InspectionProposal = {
  leaseId: string;
  propertyId: string;
  propertyName: string;
  region: string;
  dueDate: Date;
  overdue: boolean;
};

/** Every ACTIVE/ENDING lease with no inspection currently open (nothing
 *  scheduled/notice-sent/in-progress) whose next inspection is due this
 *  month or earlier — grouped by region so staff can see the clustering
 *  before approving. This is the read-only "propose" half; nothing is
 *  written until approveInspectionBatch runs. */
export async function proposeInspectionBatch(): Promise<InspectionProposal[]> {
  const leases = await prisma.lease.findMany({
    where: { status: { in: ["ACTIVE", "ENDING"] } },
    include: { property: true, inspections: true },
  });

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  return leases
    .filter((l) => !hasOpenInspection(l))
    .map((l) => ({ lease: l, due: nextInspectionDueDate(l) }))
    .filter(({ due }) => due <= endOfMonth)
    .map(({ lease, due }) => ({
      leaseId: lease.id,
      propertyId: lease.propertyId,
      propertyName: lease.property.name,
      region: lease.property.region,
      dueDate: due,
      overdue: due < now,
    }))
    .sort((a, b) => a.region.localeCompare(b.region) || a.dueDate.getTime() - b.dueDate.getTime());
}

/** Staff action, "Approve batch" — books each proposed lease's inspection
 *  for the given date and immediately sends the statutory notice (which,
 *  via lib/reminders.ts, WhatsApps the tenant directly) — the one-click
 *  step the design doc describes. A lease that's become ineligible since
 *  the proposal was generated (e.g. it ended in the meantime) is skipped
 *  rather than failing the whole batch. */
export async function approveInspectionBatch(leaseIds: string[], scheduledFor: Date): Promise<{ scheduled: number; skipped: number }> {
  let scheduled = 0;
  let skipped = 0;
  for (const leaseId of leaseIds) {
    try {
      const inspection = await scheduleInspection(leaseId, scheduledFor);
      await sendInspectionNotice(inspection.id);
      scheduled++;
    } catch {
      skipped++;
    }
  }
  return { scheduled, skipped };
}

export type ComplianceLease = {
  leaseId: string;
  propertyId: string;
  propertyName: string;
  tenantName: string;
  dueDate: Date;
};

export type ComplianceFlagged = ComplianceLease & { flaggedRooms: number; reportId: string };

/** Feeds the "12 due this month, 3 overdue, 45 clear, 2 flagged" dashboard
 *  — due/overdue come from the same due-date math the scheduler proposes
 *  from; flagged comes from the most recent COMPLETED inspection's
 *  condition report having a room check that's flagged and not yet
 *  reviewed. A lease can be both e.g. "clear" and unrelated to "flagged"
 *  from an older cycle — these are independent signals, not one taxonomy. */
export async function portfolioComplianceSummary(): Promise<{
  dueThisMonth: ComplianceLease[];
  overdue: ComplianceLease[];
  clear: ComplianceLease[];
  flagged: ComplianceFlagged[];
}> {
  const leases = await prisma.lease.findMany({
    where: { status: { in: ["ACTIVE", "ENDING"] } },
    include: {
      property: true,
      tenants: { include: { tenant: true } },
      inspections: {
        orderBy: { scheduledFor: "desc" },
        include: { conditionReport: { include: { roomChecks: true } } },
      },
    },
  });

  const now = new Date();
  const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const dueThisMonth: ComplianceLease[] = [];
  const overdue: ComplianceLease[] = [];
  const clear: ComplianceLease[] = [];
  const flagged: ComplianceFlagged[] = [];

  for (const lease of leases) {
    const base: ComplianceLease = {
      leaseId: lease.id,
      propertyId: lease.propertyId,
      propertyName: lease.property.name,
      tenantName: lease.tenants.map((t) => t.tenant.name).join(", ") || "No tenant on record",
      dueDate: nextInspectionDueDate(lease),
    };

    const open = hasOpenInspection(lease);
    if (!open) {
      if (base.dueDate < now) overdue.push(base);
      else if (base.dueDate <= endOfMonth) dueThisMonth.push(base);
    }

    const lastCompleted = lease.inspections.find((i) => i.status === "COMPLETED" && i.conditionReport);
    if (lastCompleted?.conditionReport) {
      const flaggedRooms = lastCompleted.conditionReport.roomChecks.filter((rc) => rc.flagged && !rc.reviewedAt);
      if (flaggedRooms.length > 0) {
        flagged.push({ ...base, flaggedRooms: flaggedRooms.length, reportId: lastCompleted.conditionReport.id });
      } else if (!open) {
        clear.push(base);
      }
    }
  }

  return { dueThisMonth, overdue, clear, flagged };
}
