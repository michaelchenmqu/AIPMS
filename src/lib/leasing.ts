// Long-term leasing — Phase 1 of the "Dual-Mode Property Architecture"
// design: a Property can be SHORT_TERM (nightly bookings, OTA-synced) or
// LONG_TERM (leased), never ambiguously both. Switching between them is a
// guarded action, not a field edit — see switchToLongTerm/switchToShortTerm
// below — so a property never ends up with open business on both sides at
// once. Everything a Lease generates (rent, commission) posts into the
// same TrustLedgerEntry table and three-way reconciliation short-stay
// bookings already use; that engine needed zero changes for this.

import { prisma } from "@/lib/prisma";
import type { Lease, RentFrequency } from "@prisma/client";

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
