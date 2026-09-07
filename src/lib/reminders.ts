// Proactive WhatsApp reminders — the day-before check-in message to guests,
// and the same-day gas-bottle-check nudge to the housekeeper assigned to a
// turnover clean. Both are pull-based (something calls sendXReminders()),
// same shape as lib/basiq.ts#syncTransactions: there's no background job
// runner in AIPMS, so these are meant to be invoked either
//   - on a schedule, via POST /api/cron/reminders (point a real scheduler —
//     e.g. a Railway Cron Job — at it once a day), or
//   - on demand, via the "Send" buttons on /portal/reminders, useful for
//     testing and for days nobody's set up a scheduler yet.
// Both are idempotent (guarded by a `*SentAt` column) so running them twice
// in the same day never double-messages anyone.

import { prisma } from "@/lib/prisma";
import { sendWhatsAppMessage, isWhatsAppConfigured } from "@/lib/whatsapp";
import { getWeatherForecast } from "@/lib/weather";
import { format } from "date-fns";

/** Exported so /portal/reminders can preview "who qualifies" with the exact
 *  same window the send functions use, without duplicating the logic. */
export function dayWindow(daysFromNow: number): { start: Date; end: Date } {
  const start = new Date();
  start.setDate(start.getDate() + daysFromNow);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return { start, end };
}

// Staff/seed-entered phone numbers are typed with a "+" (E.164, e.g.
// "+61491570156"); the Cloud API's own webhook payloads never carry one.
// Normalize to digits-only before sending so both sources work the same way.
function normalizePhone(phone: string): string {
  return phone.replace(/[^\d]/g, "");
}

function guestAppUrl(propertyId: string): string {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/guest?propertyId=${propertyId}`;
}

async function buildCheckinReminderMessage(
  property: { id: string; name: string; address: string; checkInTime: string; binDay: string | null; latitude: number | null; longitude: number | null },
  checkIn: Date
): Promise<string> {
  const lines = [
    `Hi! Just a reminder that your stay at ${property.name} starts tomorrow.`,
    `Check-in: ${property.checkInTime}, ${format(checkIn, "EEEE d MMM")}`,
    `Address: ${property.address}`,
  ];

  if (property.latitude != null && property.longitude != null) {
    const forecast = await getWeatherForecast(property.latitude, property.longitude);
    const tomorrow = forecast?.find((d) => d.date === format(checkIn, "yyyy-MM-dd"));
    if (tomorrow) {
      lines.push(`Weather: ${tomorrow.icon} ${tomorrow.label}, ${tomorrow.lowC}–${tomorrow.highC}°C`);
    }
  }

  if (property.binDay) {
    lines.push(`Bin day: ${property.binDay}`);
  }

  lines.push(
    `You can view your stay details, wifi, and chat with our AI concierge any time here: ${guestAppUrl(property.id)} (enter the last name on the booking + this arrival date). See you soon!`
  );

  return lines.join("\n");
}

export type ReminderResult = { sent: number; skipped: number; failed: { id: string; error: string }[] };

/** Finds every UPCOMING reservation checking in tomorrow with a guest phone
 *  on file and no reminder sent yet, and WhatsApps each one. Call this once
 *  a day (see the module comment above) — safe to call more than once, it
 *  only ever sends to a given reservation once. */
export async function sendCheckinReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, failed: [] };
  if (!isWhatsAppConfigured()) return result;

  const { start, end } = dayWindow(1);
  const reservations = await prisma.reservation.findMany({
    where: {
      status: "UPCOMING",
      checkIn: { gte: start, lt: end },
      guestPhone: { not: null },
      checkinReminderSentAt: null,
    },
    include: { property: true },
  });

  for (const r of reservations) {
    try {
      const body = await buildCheckinReminderMessage(r.property, r.checkIn);
      await sendWhatsAppMessage({ to: normalizePhone(r.guestPhone!), body });
      await prisma.reservation.update({ where: { id: r.id }, data: { checkinReminderSentAt: new Date() } });
      result.sent++;
    } catch (err) {
      result.failed.push({ id: r.id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}

/** Finds every pending/accepted cleaning job at a hasGasBottle property,
 *  where the linked reservation checks out today (a job with no
 *  reservation counts as "today" if created today), assigned to a
 *  housekeeper with a phone on file — and WhatsApps them a reminder to
 *  check the gas bottle and organise a refill if it's low. */
export async function sendGasBottleReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, failed: [] };
  if (!isWhatsAppConfigured()) return result;

  const { start, end } = dayWindow(0);
  const jobs = await prisma.job.findMany({
    where: {
      type: "CLEANING",
      status: { in: ["PENDING", "ACCEPTED"] },
      gasReminderSentAt: null,
      property: { hasGasBottle: true },
      assignedUserId: { not: null },
    },
    include: { property: true, assignedUser: true, reservation: true },
  });

  const todaysJobs = jobs.filter((j) => {
    const relevantDate = j.reservation?.checkOut ?? j.createdAt;
    return relevantDate >= start && relevantDate < end;
  });

  for (const j of todaysJobs) {
    const phone = j.assignedUser?.phone;
    if (!phone) {
      result.skipped++;
      continue;
    }
    try {
      const body = `Reminder for today's clean at ${j.property.name} (${j.property.address}): please check the gas bottle level and organise a refill if it's running low.`;
      await sendWhatsAppMessage({ to: normalizePhone(phone), body });
      await prisma.job.update({ where: { id: j.id }, data: { gasReminderSentAt: new Date() } });
      result.sent++;
    } catch (err) {
      result.failed.push({ id: j.id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}
