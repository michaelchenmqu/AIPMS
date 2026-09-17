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
  const [nadia, , , , maria, tom] = await Promise.all([
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
        // ACMA-reserved fictional mobile (04 91 57 0xxx block) — lets the
        // gas-bottle-check reminder (lib/reminders.ts) have a real target
        // in the demo without using anyone's actual number.
        phone: "+61491570157",
      },
    }),
    prisma.user.create({
      data: {
        email: "tom@aipms.demo",
        passwordHash,
        name: "Tom Reid",
        role: "HOUSEKEEPER",
        contractorId: coastalClean.id,
        phone: "+61491570158",
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
      {
        name: "Island Oasis",
        address: "14 Ferry Rd, Huskisson NSW",
        basePrice: 285,
        bedrooms: 3,
        bathrooms: 2,
        airbnbScore: 96,
        bookingScore: 88,
        stayzScore: 91,
        wifiNetwork: "IslandOasis_5G",
        wifiPassword: "SunsetJetty22",
        checkoutTime: "10:00 AM",
        houseManual:
          "Bins are around the side of the garage — general waste and recycling both collected Tuesdays. The BBQ gas bottle is under the deck; spare key for the shed is in the lockbox. Beach access is a 5-minute walk down Ferry Rd.",
        binDay: "General & recycling: Tuesday",
        hasGasBottle: true,
        latitude: -35.0206,
        longitude: 150.6906,
      },
      {
        name: "Bay Retreat",
        address: "8 Elizabeth Dr, Vincentia NSW",
        basePrice: 240,
        bedrooms: 3,
        bathrooms: 1,
        airbnbScore: 93,
        bookingScore: 90,
        stayzScore: 89,
        wifiNetwork: "BayRetreat_WiFi",
        wifiPassword: "VincentiaSands7",
        checkoutTime: "10:00 AM",
        houseManual: "Parking is in the driveway — please don't block the neighbour's gate. Pool towels are in the laundry cupboard.",
        latitude: -35.0714,
        longitude: 150.7086,
      },
      {
        name: "Hilltop Hideaway",
        address: "22 Ridge Rd, Mollymook NSW",
        basePrice: 310,
        bedrooms: 4,
        bathrooms: 2,
        airbnbScore: 97,
        bookingScore: 92,
        stayzScore: 94,
        wifiNetwork: "HilltopHideaway",
        wifiPassword: "RidgeView2026",
        checkoutTime: "10:30 AM",
        houseManual: "Pool filter runs automatically, no need to touch it. Firewood for the pit is stacked under the carport.",
        latitude: -35.3389,
        longitude: 150.4875,
      },
      {
        name: "Coastal Cabin",
        address: "3 Dowling St, Ulladulla NSW",
        basePrice: 195,
        bedrooms: 2,
        bathrooms: 1,
        airbnbScore: 90,
        bookingScore: 85,
        stayzScore: 88,
        latitude: -35.3597,
        longitude: 150.4712,
      },
      {
        name: "Lighthouse View",
        address: "56 Cave Beach Rd, Jervis Bay NSW",
        basePrice: 265,
        bedrooms: 3,
        bathrooms: 2,
        airbnbScore: 95,
        bookingScore: 89,
        stayzScore: 92,
        latitude: -35.105,
        longitude: 150.6975,
      },
    ].map((p) =>
      prisma.property.create({
        data: { ...p, ownerId: james.id, region: "Shoalhaven & South Coast", referencePhotos },
      })
    )
  );
  const [islandOasis, bayRetreat, hilltopHideaway, coastalCabin, lighthouseView] = jamesProps;

  const priyaProps = await Promise.all(
    [
      {
        name: "Fern Gully Cottage",
        address: "19 Rainforest Way, Bangalow NSW",
        basePrice: 255,
        bedrooms: 2,
        bathrooms: 1,
        airbnbScore: 94,
        bookingScore: 87,
        stayzScore: 90,
        wifiNetwork: "FernGully_Cottage",
        wifiPassword: "RainforestWalk9",
        checkoutTime: "10:00 AM",
        houseManual: "Watch for the resident water dragon by the creek — friendly, just don't feed it. Umbrellas are by the front door.",
        latitude: -28.6883,
        longitude: 153.5225,
      },
      {
        name: "Hinterland Barn",
        address: "77 Federal Dr, Federal NSW",
        basePrice: 320,
        bedrooms: 4,
        bathrooms: 3,
        airbnbScore: 98,
        bookingScore: 93,
        stayzScore: 95,
        latitude: -28.6333,
        longitude: 153.4667,
      },
    ].map((p) =>
      prisma.property.create({
        data: { ...p, ownerId: priya.id, region: "Byron Hinterland", referencePhotos },
      })
    )
  );
  const [fernGullyCottage, hinterlandBarn] = priyaProps;

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
  // Historical reservations + completed turnovers — gives the Dashboard's
  // revenue trend and usage-based savings charts several months of real
  // data to aggregate instead of a single current snapshot.
  // ---------------------------------------------------------------------
  const monthsAgo = (n: number) => new Date(Date.now() - n * 30 * 24 * 60 * 60 * 1000);
  const historyProps = [islandOasis, bayRetreat, hilltopHideaway, priyaProps[0], priyaProps[1]];
  const historyGuests = [
    "The Whitfields", "M. Alvarez", "R. Novak", "S. Okafor", "K. Lindqvist",
    "T. Reyes", "The Chens", "L. Fontaine", "P. Shah", "The Kowalskis",
  ];
  const historyChannels = ["AIRBNB", "BOOKING_COM", "STAYZ", "DIRECT"] as const;

  let guestIdx = 0;
  for (let m = 5; m >= 1; m--) {
    for (let k = 0; k < 2; k++) {
      const prop = historyProps[(m + k) % historyProps.length];
      const nights = 3 + ((m + k) % 4);
      const checkIn = new Date(monthsAgo(m).getTime() + k * 9 * 24 * 60 * 60 * 1000);
      const checkOut = new Date(checkIn.getTime() + nights * 24 * 60 * 60 * 1000);
      const baseAmount = 700 + (5 - m) * 220 + k * 340; // trends upward toward the present

      const reservation = await prisma.reservation.create({
        data: {
          propertyId: prop.id,
          guestName: historyGuests[guestIdx % historyGuests.length],
          channel: historyChannels[guestIdx % historyChannels.length],
          checkIn,
          checkOut,
          totalAmount: baseAmount,
          status: "CHECKED_OUT",
        },
      });
      guestIdx++;

      await createCompletedJob({
        propertyId: prop.id,
        reservationId: reservation.id,
        assignedUserId: k % 2 === 0 ? maria.id : tom.id,
        contractorId: coastalClean.id,
        arrivalHoursAgo: m * 30 * 24 - k * 9 * 24 - 4,
        durationHours: 1 + ((m + k) % 3) * 0.4,
        linen: [
          { item: "QUEEN", quantity: 1 + (k % 2) },
          { item: "SINGLE", quantity: 1 },
          { item: "BATH", quantity: 2 + (m % 2) },
        ],
      });
    }
  }

  // ---------------------------------------------------------------------
  // Marketing campaigns — AI-promoted vacancies, a mix of scheduled,
  // posted (with simulated results), and one flagged for review.
  // ---------------------------------------------------------------------
  await prisma.campaign.createMany({
    data: [
      {
        propertyId: islandOasis.id,
        vacancyStart: daysFromNow(5),
        vacancyEnd: daysFromNow(8),
        caption: "3 nights just opened up at Island Oasis 🌊 Book direct and skip the platform fees — link in bio.",
        hashtags: JSON.stringify(["#IslandOasis", "#ShoalhavenEscape", "#WeekendGetaway", "#DirectBooking"]),
        platforms: JSON.stringify(["INSTAGRAM", "FACEBOOK"]),
        status: "SCHEDULED",
        scheduledAt: daysFromNow(1),
      },
      {
        propertyId: bayRetreat.id,
        vacancyStart: daysFromNow(12),
        vacancyEnd: daysFromNow(15),
        caption: "A rare gap at Bay Retreat — 3 nights, up for grabs. Book direct and skip the platform fees.",
        hashtags: JSON.stringify(["#BayRetreat", "#VincentiaEscape", "#WeekendGetaway", "#DirectBooking"]),
        platforms: JSON.stringify(["INSTAGRAM"]),
        status: "SCHEDULED",
        scheduledAt: daysFromNow(2),
      },
      {
        propertyId: bayRetreat.id,
        vacancyStart: daysAgo(19),
        vacancyEnd: daysAgo(16),
        caption: "3 nights just opened up at Bay Retreat. Book direct and skip the platform fees — link in bio.",
        hashtags: JSON.stringify(["#BayRetreat", "#VincentiaEscape", "#WeekendGetaway", "#DirectBooking"]),
        platforms: JSON.stringify(["INSTAGRAM", "FACEBOOK", "X"]),
        status: "POSTED",
        postedAt: daysAgo(21),
        reach: 3850,
        clicks: 140,
        bookingsAttributed: 2,
        revenueAttributed: 1480,
      },
      {
        propertyId: hilltopHideaway.id,
        vacancyStart: daysAgo(46),
        vacancyEnd: daysAgo(43),
        caption: "Hilltop Hideaway has 3 free nights this week. Book direct and skip the platform fees — link in bio.",
        hashtags: JSON.stringify(["#HilltopHideaway", "#MollymookEscape", "#WeekendGetaway", "#DirectBooking"]),
        platforms: JSON.stringify(["INSTAGRAM"]),
        status: "POSTED",
        postedAt: daysAgo(48),
        reach: 2900,
        clicks: 98,
        bookingsAttributed: 1,
        revenueAttributed: 890,
      },
      {
        propertyId: priyaProps[0].id,
        vacancyStart: daysAgo(75),
        vacancyEnd: daysAgo(72),
        caption: "A rare gap at Fern Gully Cottage — 3 nights, up for grabs. Book direct and skip the platform fees.",
        hashtags: JSON.stringify(["#FernGullyCottage", "#BangalowEscape", "#WeekendGetaway", "#DirectBooking"]),
        platforms: JSON.stringify(["FACEBOOK"]),
        status: "POSTED",
        postedAt: daysAgo(77),
        reach: 2150,
        clicks: 61,
        bookingsAttributed: 1,
        revenueAttributed: 650,
      },
      {
        propertyId: islandOasis.id,
        vacancyStart: daysAgo(103),
        vacancyEnd: daysAgo(99),
        caption: "4 nights just opened up at Island Oasis 🌊 Book direct and skip the platform fees — link in bio.",
        hashtags: JSON.stringify(["#IslandOasis", "#ShoalhavenEscape", "#WeekendGetaway", "#DirectBooking"]),
        platforms: JSON.stringify(["INSTAGRAM", "FACEBOOK"]),
        status: "POSTED",
        postedAt: daysAgo(105),
        reach: 4200,
        clicks: 165,
        bookingsAttributed: 3,
        revenueAttributed: 2100,
      },
      {
        propertyId: priyaProps[1].id,
        vacancyStart: daysAgo(134),
        vacancyEnd: daysAgo(131),
        caption: "Hinterland Barn has 3 free nights this week. Book direct and skip the platform fees — link in bio.",
        hashtags: JSON.stringify(["#HinterlandBarn", "#FederalEscape", "#WeekendGetaway", "#DirectBooking"]),
        platforms: JSON.stringify(["INSTAGRAM", "FACEBOOK"]),
        status: "POSTED",
        postedAt: daysAgo(136),
        reach: 1700,
        clicks: 44,
        bookingsAttributed: 1,
        revenueAttributed: 360,
      },
      {
        propertyId: hilltopHideaway.id,
        vacancyStart: daysFromNow(20),
        vacancyEnd: daysFromNow(23),
        caption:
          "Big news! Hilltop Hideaway just had 3 incredible nights open up on the calendar and we could not be more excited to share this rare opportunity with everyone following along — book direct and skip the platform fees, link in bio, message us with any questions!",
        hashtags: JSON.stringify(["#HilltopHideaway", "#MollymookEscape", "#WeekendGetaway", "#DirectBooking"]),
        platforms: JSON.stringify(["INSTAGRAM"]),
        status: "NEEDS_REVIEW",
        reviewNote: "Caption exceeds recommended length for Instagram — trim before scheduling.",
      },
    ],
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
  // Long-term leasing — gives the /portal/leasing scheduler/compliance
  // dashboard, the tenant portal, and the reporting charts (lease
  // calendar, short<->long conversion trend, rent revenue, AI scheduler
  // forecast) real history to show instead of an empty state. Four
  // properties get a long-term story; the rest (Island Oasis, Bay
  // Retreat, Hilltop Hideaway) stay pure short-stay flagships.
  //
  // Deliberately hand-built rather than routed through lib/leasing.ts —
  // a seed script wants exact, reproducible numbers (a guaranteed
  // flagged room, a guaranteed overdue lease, a guaranteed
  // already-scheduled one), not whatever the guarded functions or the
  // AI mock's seeded-random would happen to produce.
  // ---------------------------------------------------------------------
  const ROOMS = ["LIVING_ROOM", "BEDROOM", "KITCHEN", "BATHROOM"] as const;

  /** Every 7 days from startDaysAgo down to (but not including) endDaysAgo,
   *  paired RENT_COLLECTED + COMMISSION ledger rows at whatever rent was
   *  in effect at that point (rentAt walks the RentReview history). */
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

  const leaseTenantPasswordHash = hash("demo1234");

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
      reviewedBy: "Nadia Hoang",
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
  // Most recent inspection — one flagged room, left unreviewed on
  // purpose so the compliance dashboard's "Flagged" bucket has a real
  // case, and the next due date (30+90=60 days out) is a genuine,
  // not-yet-scheduled AI-scheduler proposal for two months out.
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
        reviewedBy: "Nadia Hoang",
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
    {
      propertyId: islandOasis.id,
      fromName: "Sarah Mitchell",
      // ACMA-reserved fictional mobile number (04 91 57 0xxx block, set aside
      // for drama/demo use) — not a real guest's number.
      fromPhone: "+61491570156",
      channel: "WHATSAPP" as const,
      subject: "WhatsApp message",
      body: "Hi! We're loving our stay at Island Oasis so far 🌴 Would it be possible to check out an hour later on Sunday, around 11am instead of 10am?",
    },
  ];

  for (const seed of inboxSeeds) {
    const ai = await classifyInboxMessage({ subject: seed.subject, body: seed.body });
    await prisma.inboxMessage.create({
      data: {
        propertyId: seed.propertyId,
        fromName: seed.fromName,
        fromEmail: "fromEmail" in seed ? seed.fromEmail : null,
        fromPhone: "fromPhone" in seed ? seed.fromPhone : null,
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

  // ---------------------------------------------------------------------
  // Trust bank reconciliation — a demo Basiq sandbox connection with bank
  // lines matched against the ledger entries above, so the reconciliation
  // view has something real to show without a live Basiq connection. One
  // line (the cleaning invoice) is deliberately left unmatched to
  // demonstrate the manual-match flow.
  // ---------------------------------------------------------------------
  const ledgerByMemo = await prisma.trustLedgerEntry.findMany();
  const findEntry = (ownerId: string, type: string) =>
    ledgerByMemo.find((e) => e.ownerId === ownerId && e.type === type)!.id;

  const bankConnection = await prisma.bankConnection.create({
    data: {
      basiqUserId: "demo-basiq-user",
      basiqConnectionId: "demo-basiq-connection",
      institutionName: "Demo Trust Account (Basiq sandbox)",
      status: "ACTIVE",
    },
  });
  await prisma.bankTransaction.createMany({
    data: [
      { connectionId: bankConnection.id, basiqTransactionId: "demo-tx-jf-rent", date: daysAgo(14), description: "EFT RECEIPT - OTA SETTLEMENT JF", amount: 14985, matchedLedgerEntryId: findEntry(james.id, "RENT_COLLECTED") },
      { connectionId: bankConnection.id, basiqTransactionId: "demo-tx-pa-rent", date: daysAgo(14), description: "EFT RECEIPT - OTA SETTLEMENT PA", amount: 4360, matchedLedgerEntryId: findEntry(priya.id, "RENT_COLLECTED") },
      { connectionId: bankConnection.id, basiqTransactionId: "demo-tx-jf-comm", date: daysAgo(14), description: "TRANSFER TO OPERATING A/C - COMMISSION", amount: -1498.5, matchedLedgerEntryId: findEntry(james.id, "COMMISSION") },
      { connectionId: bankConnection.id, basiqTransactionId: "demo-tx-pa-comm", date: daysAgo(14), description: "TRANSFER TO OPERATING A/C - COMMISSION", amount: -436, matchedLedgerEntryId: findEntry(priya.id, "COMMISSION") },
      { connectionId: bankConnection.id, basiqTransactionId: "demo-tx-jf-clean", date: daysAgo(10), description: "COASTAL CLEAN CO - INVOICE PAYMENT", amount: -145.85, matchedLedgerEntryId: null },
      { connectionId: bankConnection.id, basiqTransactionId: "demo-tx-jf-payout", date: daysAgo(7), description: "EFT PAYOUT - J FLETCHER", amount: -13340.65, matchedLedgerEntryId: findEntry(james.id, "OWNER_PAYOUT") },
      { connectionId: bankConnection.id, basiqTransactionId: "demo-tx-pa-payout", date: daysAgo(7), description: "EFT PAYOUT - P ANAND", amount: -3924, matchedLedgerEntryId: findEntry(priya.id, "OWNER_PAYOUT") },
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
  console.log(`  ${morganUser.email}  TENANT       — tenant portal (Hinterland Barn, 240-day lease)`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
