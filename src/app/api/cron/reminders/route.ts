// Scheduled entry point for the guest check-in and gas-bottle reminders —
// see lib/reminders.ts for what each actually does. AIPMS has no background
// job runner, so point a real scheduler at this route once a day (a Railway
// Cron Job hitting this URL is the natural fit alongside the rest of
// staging's infra; any external cron works the same way).
//
// Protected by CRON_SECRET so this can't be triggered by a stranger who
// finds the URL — pass it either as `Authorization: Bearer <secret>` (most
// schedulers) or `?secret=<secret>` (for ones that can only hit a plain
// URL). 404s with no CRON_SECRET set, same "not configured" shape as every
// other gated route in this app.

import { NextResponse } from "next/server";
import {
  sendCheckinReminders,
  sendReviewRequests,
  sendGasBottleReminders,
  sendRentDueReminders,
  sendArrearsWarnings,
  sendLeaseRenewalReminders,
} from "@/lib/reminders";

export async function POST(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const provided = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? url.searchParams.get("secret");
  if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [checkin, reviewRequest, gasBottle, rentDue, arrears, renewal] = await Promise.all([
    sendCheckinReminders(),
    sendReviewRequests(),
    sendGasBottleReminders(),
    sendRentDueReminders(),
    sendArrearsWarnings(),
    sendLeaseRenewalReminders(),
  ]);
  return NextResponse.json({ checkin, reviewRequest, gasBottle, rentDue, arrears, renewal });
}
