// Adds the long-term leasing sample data (see longterm-leasing-seed.ts)
// to a database that's already been through the original prisma/seed.ts
// once — e.g. Neon demo/staging, which per the README's documented
// workflow only ever gets seeded once from a laptop against
// DATABASE_PUBLIC_URL, never re-run wholesale. This looks up the
// existing owners/staff user/properties by their known seed values
// instead of creating them, so it's safe to run against a database that
// already has the original short-stay-only seed data.
//
// Usage (from a laptop, or anywhere with a direct Postgres connection —
// Railway's own README note about seeding applies here too: this can't
// run from inside a deployed container):
//   DATABASE_URL="<neon-connection-string>" npx tsx prisma/run-longterm-leasing-seed.ts
//
// Guarded against double-running: refuses if Coastal Cabin already has
// any Lease on record.

import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedLongTermLeasing } from "./longterm-leasing-seed";

const prisma = new PrismaClient();

async function main() {
  const james = await prisma.owner.findUniqueOrThrow({ where: { email: "james@aipms.demo" } });
  const priya = await prisma.owner.findUniqueOrThrow({ where: { email: "priya@aipms.demo" } });
  const nadia = await prisma.user.findUniqueOrThrow({ where: { email: "staff@aipms.demo" } });

  const coastalCabin = await prisma.property.findFirstOrThrow({ where: { name: "Coastal Cabin" } });
  const lighthouseView = await prisma.property.findFirstOrThrow({ where: { name: "Lighthouse View" } });
  const hinterlandBarn = await prisma.property.findFirstOrThrow({ where: { name: "Hinterland Barn" } });
  const fernGullyCottage = await prisma.property.findFirstOrThrow({ where: { name: "Fern Gully Cottage" } });

  const alreadySeeded = await prisma.lease.findFirst({ where: { propertyId: coastalCabin.id } });
  if (alreadySeeded) {
    console.log("Long-term leasing sample data already present (Coastal Cabin has a lease on record) — nothing to do.");
    return;
  }

  console.log("Adding long-term leasing sample data...");
  const { morganUser } = await seedLongTermLeasing(prisma, {
    james,
    priya,
    nadia,
    coastalCabin,
    lighthouseView,
    hinterlandBarn,
    fernGullyCottage,
    leaseTenantPasswordHash: bcrypt.hashSync("demo1234", 10),
  });

  console.log("Done.");
  console.log(`Tenant portal demo login: ${morganUser.email} / demo1234`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
