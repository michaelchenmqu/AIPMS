// Standalone entry point for adding the 2026/2027 short-stay reservations
// (reservations-2026-2027-seed.ts) to a database that's already been
// seeded — same pattern as run-longterm-leasing-seed.ts. Safe to re-run:
// each entry is skipped if it already exists.
//
// Usage: DATABASE_URL="<connection string>" npx tsx prisma/run-reservations-2026-2027-seed.ts

import { PrismaClient } from "@prisma/client";
import { seedUpcomingReservations } from "./reservations-2026-2027-seed";

const prisma = new PrismaClient();

async function main() {
  const [islandOasis, bayRetreat, hilltopHideaway] = await Promise.all([
    prisma.property.findFirstOrThrow({ where: { name: "Island Oasis" } }),
    prisma.property.findFirstOrThrow({ where: { name: "Bay Retreat" } }),
    prisma.property.findFirstOrThrow({ where: { name: "Hilltop Hideaway" } }),
  ]);

  const { created, total } = await seedUpcomingReservations(prisma, {
    islandOasis: { id: islandOasis.id, basePrice: islandOasis.basePrice },
    bayRetreat: { id: bayRetreat.id, basePrice: bayRetreat.basePrice },
    hilltopHideaway: { id: hilltopHideaway.id, basePrice: hilltopHideaway.basePrice },
  });

  console.log(`Created ${created} new reservation(s) out of ${total} total — the rest already existed.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
