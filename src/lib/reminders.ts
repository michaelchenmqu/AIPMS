// Proactive WhatsApp reminders — the day-before check-in message to guests,
// the same-day post-checkout review request, and the same-day gas-bottle-
// check nudge to the housekeeper assigned to a turnover clean. All three are
// pull-based (something calls sendXReminders()), same shape as
// lib/basiq.ts#syncTransactions: there's no background job runner in
// AIPMS, so these are meant to be invoked either
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

function buildReviewRequestMessage(property: { id: string; name: string }): string {
  return [
    `Thanks for staying at ${property.name} — we hope you had a great time!`,
    `We'd love to hear how it went. You can leave a quick rating here: ${guestAppUrl(property.id)} (enter the last name on the booking + your arrival date, then tap "Leave a quick rating" on your stay page).`,
  ].join("\n");
}

/** Finds every reservation that checked out today with a guest phone on
 *  file and no review request sent yet, and WhatsApps each one. Not
 *  gated on reservation status (which isn't reliably flipped to
 *  CHECKED_OUT by anything in this codebase yet) — checkOut falling in
 *  today's window is the source of truth. */
export async function sendReviewRequests(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, failed: [] };
  if (!isWhatsAppConfigured()) return result;

  const { start, end } = dayWindow(0);
  const reservations = await prisma.reservation.findMany({
    where: {
      checkOut: { gte: start, lt: end },
      guestPhone: { not: null },
      reviewRequestSentAt: null,
    },
    include: { property: true },
  });

  for (const r of reservations) {
    try {
      const body = buildReviewRequestMessage(r.property);
      await sendWhatsAppMessage({ to: normalizePhone(r.guestPhone!), body });
      await prisma.reservation.update({ where: { id: r.id }, data: { reviewRequestSentAt: new Date() } });
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

// ---------------------------------------------------------------------------
// Long-term leasing reminders — the same idempotent, pull-based pattern as
// the short-stay ones above, repointed at tenants instead of guests. Rent
// due dates aren't tracked explicitly (Phase 1's rent ledger is manual
// entry, not a bank feed); they're computed from the lease's own cadence —
// see rentDueStatus below — which is a demo-grade approximation, not a
// substitute for real trust-accounting arrears tracking.
// ---------------------------------------------------------------------------

const CADENCE_DAYS: Record<"WEEKLY" | "FORTNIGHTLY" | "MONTHLY", number> = {
  WEEKLY: 7,
  FORTNIGHTLY: 14,
  MONTHLY: 30,
};

type LeaseForDueCheck = {
  startDate: Date;
  rentFrequency: "WEEKLY" | "FORTNIGHTLY" | "MONTHLY";
  ledgerEntries: { type: string; date: Date }[];
};

/** The most recent rent-collected date (or the lease start, if no rent's
 *  been recorded yet) plus one cadence period. Not a real recurring-
 *  schedule engine — it just asks "has a full cadence period passed since
 *  the last payment with nothing recorded since?" — good enough for a
 *  friendly nudge, not for anything a tribunal would need to see. */
function rentDueStatus(lease: LeaseForDueCheck): { dueDate: Date; daysOverdue: number } | null {
  const lastPayment = lease.ledgerEntries
    .filter((e) => e.type === "RENT_COLLECTED")
    .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  const anchor = lastPayment?.date ?? lease.startDate;
  const dueDate = new Date(anchor);
  dueDate.setDate(dueDate.getDate() + CADENCE_DAYS[lease.rentFrequency]);
  const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (24 * 60 * 60 * 1000));
  if (daysOverdue < 1) return null;
  return { dueDate, daysOverdue };
}

function tenantPhone(tenants: { tenant: { phone: string | null } }[]): string | null {
  return tenants.find((t) => t.tenant.phone)?.tenant.phone ?? null;
}

/** Exported so /portal/reminders can preview "who's due/overdue" with the
 *  exact same computation sendRentDueReminders/sendArrearsWarnings use,
 *  without duplicating rentDueStatus's logic on the page. */
export async function leaseRentStatuses() {
  const leases = await prisma.lease.findMany({
    where: { status: { in: ["ACTIVE", "ENDING"] } },
    include: { property: true, tenants: { include: { tenant: true } }, ledgerEntries: true },
    orderBy: { startDate: "asc" },
  });
  return leases
    .map((l) => ({ lease: l, due: rentDueStatus(l) }))
    .filter((x): x is { lease: (typeof leases)[number]; due: { dueDate: Date; daysOverdue: number } } => x.due !== null);
}

/** Same idea as leaseRentStatuses, for the 30-60 day renewal window. */
export async function upcomingRenewals() {
  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const leases = await prisma.lease.findMany({
    where: { status: { in: ["ACTIVE", "ENDING"] }, termType: "FIXED_TERM", endDate: { not: null } },
    include: { property: true, tenants: { include: { tenant: true } } },
    orderBy: { endDate: "asc" },
  });
  return leases
    .filter((l) => l.endDate && Math.floor((l.endDate.getTime() - now) / DAY) <= 60 && Math.floor((l.endDate.getTime() - now) / DAY) >= 0)
    .map((l) => ({ lease: l, daysToEnd: Math.floor((l.endDate!.getTime() - now) / DAY) }));
}

/** A warm nudge the day or two after rent was due — before any formal
 *  arrears notice clock starts, catching the honest-mistake cases without
 *  staff chasing. Gated to 1-6 days overdue; sendArrearsWarnings picks up
 *  from day 7. Idempotent per due date via rentReminderSentFor, so a lease
 *  that's chronically late gets reminded again each new cycle, not just
 *  once ever. */
export async function sendRentDueReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, failed: [] };
  if (!isWhatsAppConfigured()) return result;

  const leases = await prisma.lease.findMany({
    where: { status: { in: ["ACTIVE", "ENDING"] } },
    include: { property: true, tenants: { include: { tenant: true } }, ledgerEntries: true },
  });

  for (const l of leases) {
    const due = rentDueStatus(l);
    if (!due || due.daysOverdue > 6) continue;
    if (l.rentReminderSentFor && l.rentReminderSentFor.getTime() === due.dueDate.getTime()) continue;
    const phone = tenantPhone(l.tenants);
    if (!phone) {
      result.skipped++;
      continue;
    }
    try {
      const tenantName = l.tenants[0]?.tenant.name ?? "there";
      const body = `Hi ${tenantName}, just a friendly reminder that rent for ${l.property.name} was due on ${format(due.dueDate, "d MMM")}. If you've already paid, no need to do anything — otherwise please arrange payment when you can. Reply here if you have any questions!`;
      await sendWhatsAppMessage({ to: normalizePhone(phone), body });
      await prisma.lease.update({ where: { id: l.id }, data: { rentReminderSentFor: due.dueDate } });
      result.sent++;
    } catch (err) {
      result.failed.push({ id: l.id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}

/** A more formal warning once rent is a week or more overdue — still a
 *  WhatsApp message, not a statutory arrears notice (AIPMS doesn't draft
 *  or track those yet), but the point past which "friendly" stops being
 *  the right tone. */
export async function sendArrearsWarnings(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, failed: [] };
  if (!isWhatsAppConfigured()) return result;

  const leases = await prisma.lease.findMany({
    where: { status: { in: ["ACTIVE", "ENDING"] } },
    include: { property: true, tenants: { include: { tenant: true } }, ledgerEntries: true },
  });

  for (const l of leases) {
    const due = rentDueStatus(l);
    if (!due || due.daysOverdue < 7) continue;
    if (l.arrearsReminderSentFor && l.arrearsReminderSentFor.getTime() === due.dueDate.getTime()) continue;
    const phone = tenantPhone(l.tenants);
    if (!phone) {
      result.skipped++;
      continue;
    }
    try {
      const tenantName = l.tenants[0]?.tenant.name ?? "there";
      const body = `Hi ${tenantName}, rent for ${l.property.name} is now ${due.daysOverdue} days overdue (due ${format(due.dueDate, "d MMM")}). Please arrange payment as soon as possible, or get in touch if you're experiencing difficulty — we're happy to talk through options before this becomes a formal arrears matter.`;
      await sendWhatsAppMessage({ to: normalizePhone(phone), body });
      await prisma.lease.update({ where: { id: l.id }, data: { arrearsReminderSentFor: due.dueDate } });
      result.sent++;
    } catch (err) {
      result.failed.push({ id: l.id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}

/** Nudges staff/tenant ahead of a fixed-term lease's end date — a 30-60
 *  day window before endDate, once per lease (periodic tenancies have no
 *  endDate and are never in scope). */
export async function sendLeaseRenewalReminders(): Promise<ReminderResult> {
  const result: ReminderResult = { sent: 0, skipped: 0, failed: [] };
  if (!isWhatsAppConfigured()) return result;

  const now = Date.now();
  const DAY = 24 * 60 * 60 * 1000;
  const leases = await prisma.lease.findMany({
    where: {
      status: { in: ["ACTIVE", "ENDING"] },
      termType: "FIXED_TERM",
      endDate: { not: null },
      renewalReminderSentAt: null,
    },
    include: { property: true, tenants: { include: { tenant: true } } },
  });

  for (const l of leases) {
    if (!l.endDate) continue;
    const daysToEnd = Math.floor((l.endDate.getTime() - now) / DAY);
    if (daysToEnd > 60 || daysToEnd < 30) continue;
    const phone = tenantPhone(l.tenants);
    if (!phone) {
      result.skipped++;
      continue;
    }
    try {
      const tenantName = l.tenants[0]?.tenant.name ?? "there";
      const body = `Hi ${tenantName}, your lease at ${l.property.name} is due to end on ${format(l.endDate, "d MMM yyyy")}. We'd love to have you stay on — let us know if you'd like to discuss renewing, or if you have any questions about next steps.`;
      await sendWhatsAppMessage({ to: normalizePhone(phone), body });
      await prisma.lease.update({ where: { id: l.id }, data: { renewalReminderSentAt: new Date() } });
      result.sent++;
    } catch (err) {
      result.failed.push({ id: l.id, error: err instanceof Error ? err.message : "Unknown error" });
    }
  }

  return result;
}

/** Called synchronously from lib/leasing.ts#sendInspectionNotice — not a
 *  batched pull-based reminder like the four above, since it fires exactly
 *  once, at the moment staff record that notice, rather than on a daily
 *  sweep. isWhatsAppConfigured()/no-phone-on-file both fail silently
 *  (return false) since the inspection's own status change is the thing
 *  that must not be blocked by a missing integration or a missing phone
 *  number — this is a best-effort courtesy on top of it. */
export async function sendInspectionNoticeMessage(inspection: {
  scheduledFor: Date;
  lease: { property: { name: string }; tenants: { tenant: { name: string; phone: string | null } }[] };
}): Promise<boolean> {
  if (!isWhatsAppConfigured()) return false;
  const phone = tenantPhone(inspection.lease.tenants);
  if (!phone) return false;

  const tenantName = inspection.lease.tenants[0]?.tenant.name ?? "there";
  const body = `Hi ${tenantName}, this is notice of a routine inspection at ${inspection.lease.property.name} scheduled for ${format(inspection.scheduledFor, "EEEE d MMM")}. If this time doesn't work, please get in touch to arrange an alternative.`;
  try {
    await sendWhatsAppMessage({ to: normalizePhone(phone), body });
    return true;
  } catch {
    return false;
  }
}
