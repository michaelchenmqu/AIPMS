import type { PrismaClient, Channel } from "@prisma/client";

/** Extra short-stay bookings for 2026 (remainder) and 2027, so the
 *  short-term calendar always has real-looking content ahead of "today"
 *  instead of just the handful of bookings the original seed created
 *  (which go stale the moment "today" moves past them — see
 *  run-reservations-2026-2027-seed.ts for the standalone entry point).
 *
 *  Only covers properties still in SHORT_TERM mode — Coastal Cabin,
 *  Lighthouse View, Hinterland Barn and Fern Gully Cottage converted to
 *  LONG_TERM in the leasing seed, so new OTA-style bookings don't belong
 *  on them. */

type PropertyKey = "islandOasis" | "bayRetreat" | "hilltopHideaway";

type Entry = { property: PropertyKey; guestName: string; channel: Channel; checkIn: string; nights: number };

const ENTRIES: Entry[] = [
  // Island Oasis — basePrice 285
  { property: "islandOasis", guestName: "The Hendersons", channel: "AIRBNB", checkIn: "2026-12-05", nights: 4 },
  { property: "islandOasis", guestName: "Zoe Carmichael", channel: "DIRECT", checkIn: "2026-12-20", nights: 3 },
  { property: "islandOasis", guestName: "The Kowalskis", channel: "BOOKING_COM", checkIn: "2027-01-10", nights: 5 },
  { property: "islandOasis", guestName: "Liam O'Donnell", channel: "STAYZ", checkIn: "2027-02-14", nights: 3 },
  { property: "islandOasis", guestName: "The Singhs", channel: "AIRBNB", checkIn: "2027-03-22", nights: 6 },
  { property: "islandOasis", guestName: "Noah Fitzpatrick", channel: "WHATSAPP", checkIn: "2027-04-18", nights: 2 },
  { property: "islandOasis", guestName: "The Fitzgeralds", channel: "AIRBNB", checkIn: "2027-06-05", nights: 7 },
  { property: "islandOasis", guestName: "Amara Chukwu", channel: "BOOKING_COM", checkIn: "2027-07-12", nights: 4 },
  { property: "islandOasis", guestName: "The Marshalls", channel: "DIRECT", checkIn: "2027-09-25", nights: 3 },
  { property: "islandOasis", guestName: "Mateo Alvarez", channel: "AIRBNB", checkIn: "2027-11-15", nights: 5 },

  // Bay Retreat — basePrice 240
  { property: "bayRetreat", guestName: "The Doyles", channel: "BOOKING_COM", checkIn: "2026-12-12", nights: 3 },
  { property: "bayRetreat", guestName: "Freya Lindgren", channel: "DIRECT", checkIn: "2027-01-03", nights: 4 },
  { property: "bayRetreat", guestName: "The Petrovs", channel: "AIRBNB", checkIn: "2027-02-08", nights: 2 },
  { property: "bayRetreat", guestName: "Oliver Pryce", channel: "STAYZ", checkIn: "2027-03-15", nights: 5 },
  { property: "bayRetreat", guestName: "The Quinns", channel: "AIRBNB", checkIn: "2027-04-30", nights: 4 },
  { property: "bayRetreat", guestName: "Grace Okonkwo", channel: "WHATSAPP", checkIn: "2027-05-22", nights: 3 },
  { property: "bayRetreat", guestName: "The Whitfields", channel: "BOOKING_COM", checkIn: "2027-07-04", nights: 6 },
  { property: "bayRetreat", guestName: "Felix Barrington", channel: "AIRBNB", checkIn: "2027-08-19", nights: 3 },
  { property: "bayRetreat", guestName: "The Lindqvists", channel: "DIRECT", checkIn: "2027-10-10", nights: 4 },
  { property: "bayRetreat", guestName: "Harper Voss", channel: "AIRBNB", checkIn: "2027-12-01", nights: 5 },

  // Hilltop Hideaway — basePrice 310
  { property: "hilltopHideaway", guestName: "Isla Thornbury", channel: "AIRBNB", checkIn: "2026-12-28", nights: 5 },
  { property: "hilltopHideaway", guestName: "The Brennans", channel: "STAYZ", checkIn: "2027-01-20", nights: 4 },
  { property: "hilltopHideaway", guestName: "Leo Castellano", channel: "BOOKING_COM", checkIn: "2027-02-25", nights: 3 },
  { property: "hilltopHideaway", guestName: "The Alaouis", channel: "AIRBNB", checkIn: "2027-04-08", nights: 6 },
  { property: "hilltopHideaway", guestName: "Mia Thackeray", channel: "DIRECT", checkIn: "2027-05-16", nights: 2 },
  { property: "hilltopHideaway", guestName: "The Osei-Danquahs", channel: "AIRBNB", checkIn: "2027-06-21", nights: 7 },
  { property: "hilltopHideaway", guestName: "Ethan Malherbe", channel: "WHATSAPP", checkIn: "2027-08-02", nights: 3 },
  { property: "hilltopHideaway", guestName: "The Bergstroms", channel: "BOOKING_COM", checkIn: "2027-09-14", nights: 4 },
  { property: "hilltopHideaway", guestName: "Sienna Blackwood", channel: "AIRBNB", checkIn: "2027-10-29", nights: 5 },
  { property: "hilltopHideaway", guestName: "The Nakamuras", channel: "DIRECT", checkIn: "2027-12-18", nights: 6 },

  // Island Oasis — peak-season top-up (Dec/Jan/Apr weighted)
  { property: "islandOasis", guestName: "The Blythes", channel: "BOOKING_COM", checkIn: "2026-12-11", nights: 7 },
  { property: "islandOasis", guestName: "The Odumosus", channel: "BOOKING_COM", checkIn: "2026-12-24", nights: 3 },
  { property: "islandOasis", guestName: "The Okonkwos", channel: "AIRBNB", checkIn: "2027-01-04", nights: 4 },
  { property: "islandOasis", guestName: "Lachlan Ferris", channel: "BOOKING_COM", checkIn: "2027-01-19", nights: 6 },
  { property: "islandOasis", guestName: "Kofi Asante", channel: "BOOKING_COM", checkIn: "2027-01-27", nights: 3 },
  { property: "islandOasis", guestName: "The Langstons", channel: "DIRECT", checkIn: "2027-02-21", nights: 7 },
  { property: "islandOasis", guestName: "Cassia Lindqvist", channel: "BOOKING_COM", checkIn: "2027-03-06", nights: 6 },
  { property: "islandOasis", guestName: "Willow Hargrave", channel: "STAYZ", checkIn: "2027-04-02", nights: 5 },
  { property: "islandOasis", guestName: "Priyanka Rao", channel: "AIRBNB", checkIn: "2027-04-10", nights: 7 },
  { property: "islandOasis", guestName: "Soren Lindahl", channel: "DIRECT", checkIn: "2027-04-22", nights: 6 },
  { property: "islandOasis", guestName: "Lior Ben-David", channel: "WHATSAPP", checkIn: "2027-05-02", nights: 7 },
  { property: "islandOasis", guestName: "The Mancinis", channel: "DIRECT", checkIn: "2027-05-10", nights: 3 },
  { property: "islandOasis", guestName: "Hugo Lindberg", channel: "DIRECT", checkIn: "2027-05-22", nights: 6 },
  { property: "islandOasis", guestName: "The Sinclaire", channel: "AIRBNB", checkIn: "2027-06-21", nights: 2 },
  { property: "islandOasis", guestName: "Elodie Rousseau", channel: "AIRBNB", checkIn: "2027-07-03", nights: 6 },
  { property: "islandOasis", guestName: "The Nakashimas", channel: "AIRBNB", checkIn: "2027-07-22", nights: 3 },
  { property: "islandOasis", guestName: "The Odunsis", channel: "DIRECT", checkIn: "2027-09-16", nights: 7 },
  { property: "islandOasis", guestName: "The Harringtons", channel: "AIRBNB", checkIn: "2027-10-11", nights: 5 },
  { property: "islandOasis", guestName: "The Haddads", channel: "BOOKING_COM", checkIn: "2027-10-23", nights: 5 },
  { property: "islandOasis", guestName: "The Ashworths", channel: "BOOKING_COM", checkIn: "2027-11-09", nights: 5 },
  { property: "islandOasis", guestName: "Freya Solheim", channel: "AIRBNB", checkIn: "2027-12-05", nights: 4 },
  { property: "islandOasis", guestName: "Theo Brandt", channel: "DIRECT", checkIn: "2027-12-12", nights: 4 },
  { property: "islandOasis", guestName: "Arjun Mehta", channel: "STAYZ", checkIn: "2027-12-20", nights: 4 },
  { property: "islandOasis", guestName: "The Thorncliffs", channel: "AIRBNB", checkIn: "2027-12-25", nights: 5 },

  // Bay Retreat — peak-season top-up (Dec/Jan/Apr weighted)
  { property: "bayRetreat", guestName: "The Vasquez", channel: "DIRECT", checkIn: "2026-12-01", nights: 3 },
  { property: "bayRetreat", guestName: "Niamh Gallagher", channel: "AIRBNB", checkIn: "2026-12-05", nights: 6 },
  { property: "bayRetreat", guestName: "Tobias Renner", channel: "BOOKING_COM", checkIn: "2026-12-18", nights: 5 },
  { property: "bayRetreat", guestName: "The Okoyes", channel: "BOOKING_COM", checkIn: "2026-12-25", nights: 6 },
  { property: "bayRetreat", guestName: "Ravi Subramaniam", channel: "STAYZ", checkIn: "2027-01-10", nights: 3 },
  { property: "bayRetreat", guestName: "The Fairweathers", channel: "DIRECT", checkIn: "2027-01-14", nights: 5 },
  { property: "bayRetreat", guestName: "Imogen Sterling", channel: "AIRBNB", checkIn: "2027-01-22", nights: 2 },
  { property: "bayRetreat", guestName: "The Santoros", channel: "STAYZ", checkIn: "2027-01-25", nights: 3 },
  { property: "bayRetreat", guestName: "The Ferreiras", channel: "BOOKING_COM", checkIn: "2027-01-29", nights: 2 },
  { property: "bayRetreat", guestName: "Aisling Keane", channel: "STAYZ", checkIn: "2027-02-12", nights: 7 },
  { property: "bayRetreat", guestName: "The Delacroix", channel: "DIRECT", checkIn: "2027-02-25", nights: 2 },
  { property: "bayRetreat", guestName: "The Castellanos", channel: "STAYZ", checkIn: "2027-03-21", nights: 2 },
  { property: "bayRetreat", guestName: "The Nkemelus", channel: "STAYZ", checkIn: "2027-04-03", nights: 6 },
  { property: "bayRetreat", guestName: "Priya Chandran", channel: "BOOKING_COM", checkIn: "2027-04-12", nights: 5 },
  { property: "bayRetreat", guestName: "Nia Blackwell", channel: "DIRECT", checkIn: "2027-04-22", nights: 2 },
  { property: "bayRetreat", guestName: "Amadi Okonjo", channel: "BOOKING_COM", checkIn: "2027-04-25", nights: 3 },
  { property: "bayRetreat", guestName: "The Larkspurs", channel: "STAYZ", checkIn: "2027-05-14", nights: 4 },
  { property: "bayRetreat", guestName: "The Caldwells", channel: "DIRECT", checkIn: "2027-08-12", nights: 6 },
  { property: "bayRetreat", guestName: "Clementine Hale", channel: "STAYZ", checkIn: "2027-08-24", nights: 2 },
  { property: "bayRetreat", guestName: "Kai Tanaka-Reed", channel: "BOOKING_COM", checkIn: "2027-09-02", nights: 7 },
  { property: "bayRetreat", guestName: "The Westbrooks", channel: "BOOKING_COM", checkIn: "2027-10-02", nights: 6 },
  { property: "bayRetreat", guestName: "Stellan Kristoffersen", channel: "DIRECT", checkIn: "2027-11-04", nights: 4 },
  { property: "bayRetreat", guestName: "Bodhi Yamamoto", channel: "DIRECT", checkIn: "2027-12-21", nights: 5 },

  // Hilltop Hideaway — peak-season top-up (Dec/Jan/Apr weighted)
  { property: "hilltopHideaway", guestName: "The Vukovics", channel: "STAYZ", checkIn: "2026-12-07", nights: 5 },
  { property: "hilltopHideaway", guestName: "Declan Pryce", channel: "AIRBNB", checkIn: "2026-12-16", nights: 7 },
  { property: "hilltopHideaway", guestName: "The Abernathys", channel: "DIRECT", checkIn: "2027-01-06", nights: 2 },
  { property: "hilltopHideaway", guestName: "Finnegan Doyle", channel: "AIRBNB", checkIn: "2027-01-10", nights: 5 },
  { property: "hilltopHideaway", guestName: "The Oduyas", channel: "AIRBNB", checkIn: "2027-01-16", nights: 3 },
  { property: "hilltopHideaway", guestName: "The Carringtons", channel: "STAYZ", checkIn: "2027-01-27", nights: 2 },
  { property: "hilltopHideaway", guestName: "The Covingtons", channel: "DIRECT", checkIn: "2027-02-18", nights: 5 },
  { property: "hilltopHideaway", guestName: "The Wrenfields", channel: "DIRECT", checkIn: "2027-03-15", nights: 4 },
  { property: "hilltopHideaway", guestName: "Zara Whitfield", channel: "STAYZ", checkIn: "2027-03-27", nights: 2 },
  { property: "hilltopHideaway", guestName: "The Pemberton-Vales", channel: "BOOKING_COM", checkIn: "2027-04-16", nights: 3 },
  { property: "hilltopHideaway", guestName: "Mateusz Kowal", channel: "BOOKING_COM", checkIn: "2027-04-25", nights: 2 },
  { property: "hilltopHideaway", guestName: "Saskia van der Berg", channel: "WHATSAPP", checkIn: "2027-05-01", nights: 2 },
  { property: "hilltopHideaway", guestName: "Tahlia Munro", channel: "STAYZ", checkIn: "2027-05-04", nights: 6 },
  { property: "hilltopHideaway", guestName: "Saoirse Quigley", channel: "AIRBNB", checkIn: "2027-06-04", nights: 7 },
  { property: "hilltopHideaway", guestName: "The Beaumonts", channel: "DIRECT", checkIn: "2027-07-03", nights: 4 },
  { property: "hilltopHideaway", guestName: "Rafael Esposito", channel: "STAYZ", checkIn: "2027-07-16", nights: 2 },
  { property: "hilltopHideaway", guestName: "The Varga-Hills", channel: "AIRBNB", checkIn: "2027-07-23", nights: 6 },
  { property: "hilltopHideaway", guestName: "The Delarosas", channel: "DIRECT", checkIn: "2027-08-13", nights: 4 },
  { property: "hilltopHideaway", guestName: "Isobel Thackeray", channel: "BOOKING_COM", checkIn: "2027-08-27", nights: 2 },
  { property: "hilltopHideaway", guestName: "The Marchettis", channel: "STAYZ", checkIn: "2027-09-20", nights: 4 },
  { property: "hilltopHideaway", guestName: "The Okafor-Smiths", channel: "BOOKING_COM", checkIn: "2027-12-03", nights: 7 },
  { property: "hilltopHideaway", guestName: "Marisol Castillo", channel: "BOOKING_COM", checkIn: "2027-12-11", nights: 2 },
  { property: "hilltopHideaway", guestName: "Odalys Marquez", channel: "AIRBNB", checkIn: "2027-12-25", nights: 3 },
];

function statusFor(checkIn: Date, checkOut: Date, now: Date): "UPCOMING" | "IN_STAY" | "CHECKED_OUT" {
  if (checkOut.getTime() < now.getTime()) return "CHECKED_OUT";
  if (checkIn.getTime() <= now.getTime()) return "IN_STAY";
  return "UPCOMING";
}

export type ReservationSeedProperties = Record<PropertyKey, { id: string; basePrice: number }>;

/** Creates every entry not already present (matched on property + guest name
 *  + check-in date), so re-running this after new entries are added above
 *  only inserts the new ones. Status is computed against the real clock at
 *  call time, so it's always correct whenever this actually runs. */
export async function seedUpcomingReservations(prisma: PrismaClient, properties: ReservationSeedProperties) {
  const now = new Date();
  let created = 0;

  for (const entry of ENTRIES) {
    const property = properties[entry.property];
    const checkIn = new Date(`${entry.checkIn}T15:00:00`);
    const checkOut = new Date(checkIn.getTime() + entry.nights * 24 * 60 * 60 * 1000);

    const existing = await prisma.reservation.findFirst({
      where: { propertyId: property.id, guestName: entry.guestName, checkIn },
    });
    if (existing) continue;

    await prisma.reservation.create({
      data: {
        propertyId: property.id,
        guestName: entry.guestName,
        channel: entry.channel,
        checkIn,
        checkOut,
        totalAmount: property.basePrice * entry.nights,
        status: statusFor(checkIn, checkOut, now),
      },
    });
    created++;
  }

  return { created, total: ENTRIES.length };
}
