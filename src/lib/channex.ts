// Channex.io channel manager client — the white-label connectivity layer
// AIPMS integrates against once, instead of certifying separately with
// Airbnb, Booking.com, and Vrbo/Stayz (see the Multi-Tenant Rollout plan
// for why). Two directions:
//
//   - Outbound: register a property with Channex once a staff member
//     connects it (connectProperty), then keep rates/availability in sync.
//   - Inbound: Channex calls our webhook (see
//     src/app/api/channex/webhook/route.ts) whenever a booking is created,
//     changed, or cancelled on a connected OTA — mapBookingPayload turns
//     that into the shape upsertReservationFromWebhook writes to the DB.
//
// Gated behind CHANNEX_API_KEY, same fallback shape as lib/ai.ts: without a
// key, connectProperty is a no-op and the webhook route 404s, so the app
// runs exactly as it does today (manually-entered / seeded reservations).
//
// NOTE ON ACCURACY: this is written against Channex's publicly documented
// request/response shape (JSON body, X-API-Key header, /v1 REST endpoints).
// It hasn't been exercised against a real Channex account — there isn't one
// yet. Confirm field names against a live account's API docs
// (docs.channex.io) during the first real integration test, and adjust
// mapBookingPayload if their webhook payload shape differs.

import { prisma } from "@/lib/prisma";
import type { Channel } from "@prisma/client";

const API_BASE = "https://app.channex.io/api/v1";

export function isChannexConfigured(): boolean {
  return Boolean(process.env.CHANNEX_API_KEY);
}

async function channexFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const apiKey = process.env.CHANNEX_API_KEY;
  if (!apiKey) throw new Error("CHANNEX_API_KEY is not set");

  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      "user-api-key": apiKey,
      ...init?.headers,
    },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Channex API error (${res.status}): ${body}`);
  }
  return res.json() as Promise<T>;
}

/** Registers a property with Channex so it can be mapped to OTA listings.
 *  Called once, when a staff member clicks "Connect" on a property — see
 *  the property detail page. Stores the returned Channex property ID on
 *  our own Property row so future syncs know which Channex property to
 *  talk to. */
export async function connectProperty(propertyId: string): Promise<string> {
  const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });

  const result = await channexFetch<{ data: { id: string } }>("/properties", {
    method: "POST",
    body: JSON.stringify({
      property: {
        title: property.name,
        address: property.address,
        currency: "AUD",
      },
    }),
  });

  await prisma.property.update({
    where: { id: propertyId },
    data: { channexPropertyId: result.data.id },
  });

  return result.data.id;
}

const CHANNEL_MAP: Record<string, Channel> = {
  airbnb: "AIRBNB",
  booking: "BOOKING_COM",
  "booking.com": "BOOKING_COM",
  expedia: "STAYZ",
  vrbo: "STAYZ",
  stayz: "STAYZ",
};

function mapOtaToChannel(otaName: string | undefined | null): Channel {
  if (!otaName) return "DIRECT";
  return CHANNEL_MAP[otaName.toLowerCase()] ?? "DIRECT";
}

/** Shape we expect Channex's booking webhook to send. Adjust field names
 *  here once tested against a real payload — everything downstream reads
 *  from this normalized type, not the raw webhook body. */
export type ChannexBookingPayload = {
  id: string; // Channex's booking ID — our idempotency key (Reservation.externalId)
  property_id: string; // maps back to Property.channexPropertyId
  ota_name?: string;
  guest_name: string;
  arrival_date: string; // ISO date
  departure_date: string; // ISO date
  amount: number;
  status: "new" | "modified" | "cancelled";
};

/** Upserts a Reservation from a Channex booking webhook. Idempotent on
 *  externalId, so a redelivered webhook (Channex retries on non-2xx) never
 *  creates a duplicate booking. Cancellations remove the reservation rather
 *  than leaving a stale row on the calendar. */
export async function upsertReservationFromWebhook(payload: ChannexBookingPayload) {
  const property = await prisma.property.findFirst({
    where: { channexPropertyId: payload.property_id },
  });
  if (!property) {
    throw new Error(`No property connected to Channex property ${payload.property_id}`);
  }

  if (payload.status === "cancelled") {
    await prisma.reservation.deleteMany({ where: { externalId: payload.id } });
    return { action: "cancelled" as const };
  }

  const data = {
    propertyId: property.id,
    guestName: payload.guest_name,
    channel: mapOtaToChannel(payload.ota_name),
    checkIn: new Date(payload.arrival_date),
    checkOut: new Date(payload.departure_date),
    totalAmount: payload.amount,
    externalId: payload.id,
  };

  await prisma.reservation.upsert({
    where: { externalId: payload.id },
    create: data,
    update: data,
  });
  return { action: "upserted" as const };
}
