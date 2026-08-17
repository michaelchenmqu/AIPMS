import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";
import { computeJobTotals, LINEN_UNIT_COST } from "../src/lib/billing";
import { cleanCheckRoom, classifyInboxMessage } from "../src/lib/ai";

const prisma = new PrismaClient();

const hash = (pw: string) => bcrypt.hashSync(pw, 10);
const daysAgo = (n: number) => new Date(Date.now() - n * 24 * 60 * 60 * 1000);
const daysFromNow = (n: number) => new Date(Date.now() + n * 24 * 60 * 60 * 1000);

async function main() {
  console.log("Seeding AIPMS demo data...");

  // ---------------------------------------------------------------------
  // Owners
  // ---------------------------------------------------------------------
  const james = await prisma.owner.create({
    data: { name: "James Fletcher", email: "james@aipms.demo", region: "Shoalhaven & South Coast" },
  });
  const priya = await prisma.owner.create({
    data: { name: "Priya Anand", email: "priya@aipms.demo", region: "Byron Hinterland" },
  });

  // ---------------------------------------------------------------------
  // Contractors
  // ---------------------------------------------------------------------
  const coastalClean = await prisma.contractor.create({
    data: { name: "Coastal Clean Co", type: "CLEANING", hourlyRate: 28 },
  });
  const southCoastMaint = await prisma.contractor.create({
    data: { name: "South Coast Maintenance", type: "MAINTENANCE", hourlyRate: 45 },
  });

  // ---------------------------------------------------------------------
  // Users (demo password for every account: demo1234)
  // ---------------------------------------------------------------------
  const passwordHash = hash("demo1234");
  const [, , , , maria, tom] = await Promise.all([
    prisma.user.create({
      data: { email: "staff@aipms.demo", passwordHash, name: "Nadia Hoang", role: "STAFF" },
    }),
    prisma.user.create({
      data: { email: "james@aipms.demo", passwordHash, name: "James Fletcher", role: "OWNER", ownerId: james.id },
    }),
    prisma.user.create({
      data: { email: "priya@aipms.demo", passwordHash, name: "Priya Anand", role: "OWNER", ownerId: priya.id },
    }),
    prisma.user.create({
      data: {
        email: "clean@aipms.demo",
        passwordHash,
        name: "Sarah Bell",
        role: "CONTRACTOR",
        contractorId: coastalClean.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "maria@aipms.demo",
        passwordHash,
        name: "Maria Lopez",
        role: "HOUSEKEEPER",
        contractorId: coastalClean.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "tom@aipms.demo",
        passwordHash,
        name: "Tom Reid",
        role: "HOUSEKEEPER",
        contractorId: coastalClean.id,
      },
    }),
    prisma.user.create({
      data: {
        email: "maint@aipms.demo",
        passwordHash,
        name: "Dave Wilson",
        role: "CONTRACTOR",
        contractorId: southCoastMaint.id,
      },
    }),
  ]);

  // ---------------------------------------------------------------------
  // Properties
  // ---------------------------------------------------------------------
  const referencePhotos = JSON.stringify({
    LIVING_ROOM: "/images/room-living.svg",
    BEDROOM: "/images/room-bedroom.svg",
    KITCHEN: "/images/room-kitchen.svg",
    BATHROOM: "/images/room-bathroom.svg",
  });

  const jamesProps = await Promise.all(
    [
      { name: "Island Oasis", address: "14 Ferry Rd, Huskisson NSW", basePrice: 285, bedrooms: 3, bathrooms: 2, airbnbScore: 96, bookingScore: 88, stayzScore: 91 },
      { name: "Bay Retreat", address: "8 Elizabeth Dr, Vincentia NSW", basePrice: 240, bedrooms: 3, bathrooms: 1, airbnbScore: 93, bookingScore: 90, stayzScore: 89 },
      { name: "Hilltop Hideaway", address: "22 Ridge Rd, Mollymook NSW", basePrice: 310, bedrooms: 4, bathrooms: 2, airbnbScore: 97, bookingScore: 92, stayzScore: 94 },
      { name: "Coastal Cabin", address: "3 Dowling St, Ulladulla NSW", basePrice: 195, bedrooms: 2, bathrooms: 1, airbnbScore: 90, bookingScore: 85, stayzScore: 88 },
      { name: "Lighthouse View", address: "56 Cave Beach Rd, Jervis Bay NSW", basePrice: 265, bedrooms: 3, bathrooms: 2, airbnbScore: 95, bookingScore: 89, stayzScore: 92 },
    ].map((p) =>
      prisma.property.create({
        data: { ...p, ownerId: james.id, region: "Shoalhaven & South Coast", referencePhotos },
      })
    )
  );
  const [islandOasis, bayRetreat, hilltopHideaway] = jamesProps;

  const priyaProps = await Promise.all(
    [
      { name: "Fern Gully Cottage", address: "19 Rainforest Way, Bangalow NSW", basePrice: 255, bedrooms: 2, bathrooms: 1, airbnbScore: 94, bookingScore: 87, stayzScore: 90 },
      { name: "Hinterland Barn", address: "77 Federal Dr, Federal NSW", basePrice: 320, bedrooms: 4, bathrooms: 3, airbnbScore: 98, bookingScore: 93, stayzScore: 95 },
    ].map((p) =>
      prisma.property.create({
        data: { ...p, ownerId: priya.id, region: "Byron Hinterland", referencePhotos },
      })
    )
  );

  // ---------------------------------------------------------------------
  // Reservations
  // ---------------------------------------------------------------------
  const patels = await prisma.reservation.create({
    data: {
      propertyId: islandOasis.id,
      guestName: "The Patels",
      channel: "AIRBNB",
      checkIn: daysAgo(3),
      checkOut: daysFromNow(4),
      totalAmount: 1995,
      status: "IN_STAY",
    },
  });
  await prisma.reservation.createMany({
    data: [
      { propertyId: bayRetreat.id, guestName: "The Nguyens", channel: "BOOKING_COM", checkIn: daysFromNow(1), checkOut: daysFromNow(5), totalAmount: 960, status: "UPCOMING" },
      { propertyId: hilltopHideaway.id, guestName: "Chloe Walsh", channel: "DIRECT", checkIn: daysFromNow(2), checkOut: daysFromNow(9), totalAmount: 2170, status: "UPCOMING" },
      { propertyId: islandOasis.id, guestName: "The Okafors", channel: "STAYZ", checkIn: daysAgo(9), checkOut: daysAgo(4), totalAmount: 1425, status: "CHECKED_OUT" },
      { propertyId: priyaProps[0].id, guestName: "Marcus Webb", channel: "AIRBNB", checkIn: daysAgo(1), checkOut: daysFromNow(2), totalAmount: 765, status: "IN_STAY" },
      { propertyId: priyaProps[1].id, guestName: "The Osei-Wards", channel: "DIRECT", checkIn: daysAgo(6), checkOut: daysAgo(1), totalAmount: 1600, status: "CHECKED_OUT" },
    ],
  });

  // ---------------------------------------------------------------------
  // Jobs — a mix of completed (with full billing + AI clean-check) and
  // pending/accepted jobs for the housekeeper app feed.
  // ---------------------------------------------------------------------
  async function createCompletedJob(opts: {
    propertyId: string;
    reservationId?: string;
    assignedUserId: string;
    contractorId: string;
    arrivalHoursAgo: number;
    durationHours: number;
    linen: { item: "QUEEN" | "SINGLE" | "BATH"; quantity: number }[];
  }) {
    const arrivalAt = new Date(Date.now() - opts.arrivalHoursAgo * 60 * 60 * 1000);
    const departureAt = new Date(arrivalAt.getTime() + opts.durationHours * 60 * 60 * 1000);
    const hourlyRate = coastalClean.hourlyRate;
    const linenLines = opts.linen.map((l) => ({ quantity: l.quantity, unitCost: LINEN_UNIT_COST[l.item] }));
    const totals = computeJobTotals({ arrivalAt, departureAt, hourlyRate, linen: linenLines });

    const job = await prisma.job.create({
      data: {
        propertyId: opts.propertyId,
        reservationId: opts.reservationId,
        contractorId: opts.contractorId,
        assignedUserId: opts.assignedUserId,
        type: "CLEANING",
        status: "DONE",
        arrivalAt,
        arrivalPhotoUrl: "/images/keybox-capture.svg",
        arrivalGeoLat: -35.0333,
        arrivalGeoLng: 150.6667,
        departureAt,
        departurePhotoUrl: "/images/keybox-capture.svg",
        hourlyRate,
        ...totals,
      },
    });

    await prisma.linenUsage.createMany({
      data: opts.linen.map((l) => ({ jobId: job.id, item: l.item, quantity: l.quantity, unitCost: LINEN_UNIT_COST[l.item] })),
    });

    const ROOM_IMAGE: Record<string, string> = {
      LIVING_ROOM: "/images/room-living.svg",
      BEDROOM: "/images/room-bedroom.svg",
      KITCHEN: "/images/room-kitchen.svg",
      BATHROOM: "/images/room-bathroom.svg",
    };

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

    return job;
  }

  // The featured Island Oasis turnover matching the Owner App statement
  // reference numbers: 1h 22m @ $28/hr = $38.25 labor, $18.40 linen.
  await createCompletedJob({
    propertyId: islandOasis.id,
    assignedUserId: maria.id,
    contractorId: coastalClean.id,
    arrivalHoursAgo: 24 * 30 + 3,
    durationHours: 1 + 22 / 60,
    linen: [
      { item: "QUEEN", quantity: 1 },
      { item: "SINGLE", quantity: 2 },
      { item: "BATH", quantity: 1 },
    ],
  });

  await createCompletedJob({
    propertyId: islandOasis.id,
    reservationId: patels.id,
    assignedUserId: tom.id,
    contractorId: coastalClean.id,
    arrivalHoursAgo: 24 * 3 + 2,
    durationHours: 1.6,
    linen: [
      { item: "QUEEN", quantity: 2 },
      { item: "SINGLE", quantity: 1 },
      { item: "BATH", quantity: 3 },
    ],
  });

  await createCompletedJob({
    propertyId: bayRetreat.id,
    assignedUserId: maria.id,
    contractorId: coastalClean.id,
    arrivalHoursAgo: 24 * 5,
    durationHours: 1.25,
    linen: [
      { item: "QUEEN", quantity: 1 },
      { item: "SINGLE", quantity: 2 },
      { item: "BATH", quantity: 2 },
    ],
  });

  await createCompletedJob({
    propertyId: hilltopHideaway.id,
    assignedUserId: tom.id,
    contractorId: coastalClean.id,
    arrivalHoursAgo: 24 * 8,
    durationHours: 2.1,
    linen: [
      { item: "QUEEN", quantity: 2 },
      { item: "SINGLE", quantity: 2 },
      { item: "BATH", quantity: 4 },
    ],
  });

  // Pending / accepted jobs -> populate the Maria's housekeeper feed.
  await prisma.job.create({
    data: {
      propertyId: bayRetreat.id,
      contractorId: coastalClean.id,
      assignedUserId: maria.id,
      type: "CLEANING",
      status: "PENDING",
      hourlyRate: coastalClean.hourlyRate,
    },
  });
  await prisma.job.create({
    data: {
      propertyId: hilltopHideaway.id,
      contractorId: coastalClean.id,
      assignedUserId: maria.id,
      type: "CLEANING",
      status: "PENDING",
      hourlyRate: coastalClean.hourlyRate,
    },
  });
  await prisma.job.create({
    data: {
      propertyId: islandOasis.id,
      contractorId: coastalClean.id,
      assignedUserId: tom.id,
      type: "CLEANING",
      status: "ACCEPTED",
      hourlyRate: coastalClean.hourlyRate,
      arrivalAt: new Date(),
      arrivalPhotoUrl: "/images/keybox-capture.svg",
      arrivalGeoLat: -35.0333,
      arrivalGeoLng: 150.6667,
    },
  });

  // ---------------------------------------------------------------------
  // Work orders
  // ---------------------------------------------------------------------
  await prisma.workOrder.createMany({
    data: [
      { propertyId: islandOasis.id, title: "AC unit not cooling — main bedroom", description: "Guest reports the split system in the main bedroom is running but not cooling. Needs a technician visit before next check-in.", status: "OPEN", priority: "HIGH" },
      { propertyId: bayRetreat.id, title: "Deck railing loose", description: "Housekeeper flagged a loose railing post on the back deck during turnover.", status: "IN_PROGRESS", priority: "MEDIUM" },
      { propertyId: hilltopHideaway.id, title: "Replace pool filter", description: "Scheduled quarterly filter replacement.", status: "DONE", priority: "LOW" },
      { propertyId: priyaProps[1].id, title: "Gutter clean before storm season", description: "Annual gutter clean ahead of summer storms.", status: "OPEN", priority: "MEDIUM" },
    ],
  });

  // ---------------------------------------------------------------------
  // Inbox messages — classified via the AI provider (mock fallback without
  // an API key, real Anthropic call if ANTHROPIC_API_KEY is set).
  // ---------------------------------------------------------------------
  const inboxSeeds = [
    {
      propertyId: islandOasis.id,
      fromName: "Priya Patel",
      fromEmail: "priya.patel@example.com",
      channel: "AIRBNB" as const,
      subject: "AC in the main bedroom isn't cooling",
      body: "Hi, we're currently staying at Island Oasis and the air conditioning in the main bedroom is running but the room isn't getting any cooler. Could someone take a look? Thanks!",
    },
    {
      propertyId: bayRetreat.id,
      fromName: "Linh Nguyen",
      fromEmail: "linh.nguyen@example.com",
      channel: "BOOKING_COM" as const,
      subject: "Question about early check-in",
      body: "We arrive on the 5-hour drive down and would love to check in a bit earlier than 3pm if possible, maybe around 12:30pm. Is that something you can accommodate for our upcoming stay?",
    },
    {
      propertyId: hilltopHideaway.id,
      fromName: "Chloe Walsh",
      fromEmail: "chloe.walsh@example.com",
      channel: "DIRECT" as const,
      subject: "Quote for an extra 2 nights",
      body: "Loving the look of Hilltop Hideaway for our upcoming trip — could you send a quote if we extended our booking by 2 extra nights at the end?",
    },
    {
      propertyId: islandOasis.id,
      fromName: "Marcus Webb",
      fromEmail: "marcus.webb@example.com",
      channel: "STAYZ" as const,
      subject: "Not happy with cleanliness on arrival",
      body: "We arrived last night and found the kitchen bench hadn't been wiped down and there was a used tea towel still hanging in the bathroom. Pretty disappointed given the price we paid.",
    },
    {
      propertyId: null,
      fromName: "James Fletcher",
      fromEmail: "james@aipms.demo",
      channel: "DIRECT" as const,
      subject: "When does my June statement come through?",
      body: "Just checking when the June statement for Island Oasis will be issued — want to reconcile against my own records.",
    },
  ];

  for (const seed of inboxSeeds) {
    const ai = await classifyInboxMessage({ subject: seed.subject, body: seed.body });
    await prisma.inboxMessage.create({
      data: {
        propertyId: seed.propertyId,
        fromName: seed.fromName,
        fromEmail: seed.fromEmail,
        channel: seed.channel,
        subject: seed.subject,
        body: seed.body,
        aiKind: ai.kind,
        aiConfidence: ai.confidence,
        aiPrimaryAction: ai.primaryAction,
        aiSecondaryAction: ai.secondaryAction,
      },
    });
  }

  // ---------------------------------------------------------------------
  // Statements — June statement for Island Oasis, matching the Owner App
  // design reference numbers exactly (linen $18.40, labor $38.25).
  // ---------------------------------------------------------------------
  const juneStatement = await prisma.statement.create({
    data: {
      ownerId: james.id,
      propertyId: islandOasis.id,
      periodLabel: "June statement",
      status: "ISSUED",
      linenTotal: 18.4,
      laborTotal: 38.25,
      totalAmount: 56.65,
    },
  });
  await prisma.statementLineItem.createMany({
    data: [
      { statementId: juneStatement.id, label: "Linen used (1×Q, 2×S, 1×B)", detail: "Turnover · 30 Jun", amount: 18.4 },
      { statementId: juneStatement.id, label: "Cleaning · 1h 22m @ $28/hr", detail: "Turnover · 30 Jun", amount: 38.25 },
    ],
  });

  for (const prop of [bayRetreat, hilltopHideaway]) {
    const stmt = await prisma.statement.create({
      data: {
        ownerId: james.id,
        propertyId: prop.id,
        periodLabel: "June statement",
        status: "ISSUED",
        linenTotal: 16.1,
        laborTotal: 35,
        totalAmount: 51.1,
      },
    });
    await prisma.statementLineItem.createMany({
      data: [
        { statementId: stmt.id, label: "Linen used", detail: "Turnover · 28 Jun", amount: 16.1 },
        { statementId: stmt.id, label: "Cleaning · 1h 15m @ $28/hr", detail: "Turnover · 28 Jun", amount: 35 },
      ],
    });
  }

  // ---------------------------------------------------------------------
  // Trust ledger
  // ---------------------------------------------------------------------
  await prisma.trustLedgerEntry.createMany({
    data: [
      { ownerId: james.id, type: "RENT_COLLECTED", amount: 14985, memo: "June bookings — 5 properties", date: daysAgo(14) },
      { ownerId: james.id, type: "COMMISSION", amount: -1498.5, memo: "Platform commission (10%)", date: daysAgo(14) },
      { ownerId: james.id, type: "EXPENSE", amount: -145.85, memo: "Housekeeping & linen (usage-based)", date: daysAgo(10) },
      { ownerId: james.id, type: "OWNER_PAYOUT", amount: -13340.65, memo: "June payout to James Fletcher", date: daysAgo(7) },
      { ownerId: priya.id, type: "RENT_COLLECTED", amount: 4360, memo: "June bookings — 2 properties", date: daysAgo(14) },
      { ownerId: priya.id, type: "COMMISSION", amount: -436, memo: "Platform commission (10%)", date: daysAgo(14) },
      { ownerId: priya.id, type: "OWNER_PAYOUT", amount: -3924, memo: "June payout to Priya Anand", date: daysAgo(7) },
    ],
  });

  console.log("Seed complete.");
  console.log("");
  console.log("Demo accounts (password for all: demo1234):");
  console.log("  staff@aipms.demo      STAFF        — web portal (back office)");
  console.log("  james@aipms.demo      OWNER        — owner portal + owner app (5 properties)");
  console.log("  priya@aipms.demo      OWNER        — owner portal + owner app (2 properties)");
  console.log("  clean@aipms.demo      CONTRACTOR   — contractor portal (Coastal Clean Co)");
  console.log("  maria@aipms.demo      HOUSEKEEPER  — housekeeper app (2 pending jobs)");
  console.log("  tom@aipms.demo        HOUSEKEEPER  — housekeeper app (1 accepted job)");
  console.log("  maint@aipms.demo      CONTRACTOR   — contractor portal (South Coast Maintenance)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
