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
