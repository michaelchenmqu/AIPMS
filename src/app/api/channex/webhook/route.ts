// Inbound webhook Channex calls whenever a booking is created, changed, or
// cancelled on a connected OTA. See lib/channex.ts for the outbound half
// (registering a property) and the idempotent upsert this delegates to.
//
// 404s when CHANNEX_API_KEY isn't set, same as every other gated
// integration — there's nothing to receive without a Channex account.
// Optionally verify a shared secret (CHANNEX_WEBHOOK_SECRET) once Channex's
// real signing scheme is confirmed against docs.channex.io.

import { NextResponse } from "next/server";
import { isChannexConfigured, upsertReservationFromWebhook, type ChannexBookingPayload } from "@/lib/channex";

export async function POST(req: Request) {
  if (!isChannexConfigured()) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const secret = process.env.CHANNEX_WEBHOOK_SECRET;
  if (secret && req.headers.get("x-channex-webhook-secret") !== secret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: ChannexBookingPayload;
  try {
    payload = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  try {
    const result = await upsertReservationFromWebhook(payload);
    return NextResponse.json(result);
  } catch (err) {
    // Non-2xx makes Channex retry — fine for a transient DB error, but a
    // malformed/unmapped payload will retry forever, so log loudly.
    console.error("[channex:webhook]", err);
    return NextResponse.json({ error: err instanceof Error ? err.message : "Webhook processing failed" }, { status: 400 });
  }
}
