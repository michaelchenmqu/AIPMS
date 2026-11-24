// Scheduled entry point for the reservation/housekeeping time-sync — see
// lib/lifecycle.ts for what each step does. Point a scheduler at this route
// every 15-30 minutes (more often than /api/cron/reminders' once-a-day
// cadence, since a stay's check-in/check-out should flip promptly rather
// than once a day) — a Railway Cron Job hitting this URL is the natural
// fit; any external cron works the same way.
//
// Shares CRON_SECRET with /api/cron/reminders. Pass it either as
// `Authorization: Bearer <secret>` (most schedulers) or `?secret=<secret>`
// (for ones that can only hit a plain URL). 404s with no CRON_SECRET set,
// same "not configured" shape as every other gated route in this app.

import { NextResponse } from "next/server";
import { syncReservationStatuses, completeTurnoverCleaning } from "@/lib/lifecycle";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const reservations = await syncReservationStatuses();
  const housekeeping = await completeTurnoverCleaning();
  return NextResponse.json({ reservations, housekeeping });
}
