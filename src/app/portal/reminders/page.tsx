import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { formatDate, formatDateTime } from "@/lib/format";
import { isWhatsAppConfigured } from "@/lib/whatsapp";
import { dayWindow } from "@/lib/reminders";
import { runCheckinReminders, runReviewRequests, runGasBottleReminders, setGuestPhone } from "./actions";

export default async function RemindersPage({
  searchParams,
}: {
  searchParams: Promise<{ checkin?: string; review?: string; gas?: string }>;
}) {
  const { checkin, review, gas } = await searchParams;
  const checkinResult = checkin ? (JSON.parse(checkin) as { sent: number; failed: number }) : null;
  const reviewResult = review ? (JSON.parse(review) as { sent: number; failed: number }) : null;
  const gasResult = gas ? (JSON.parse(gas) as { sent: number; failed: number }) : null;

  const { start: tomorrowStart, end: tomorrowEnd } = dayWindow(1);
  const { start: todayStart, end: todayEnd } = dayWindow(0);

  const [arrivals, departures, jobs] = await Promise.all([
    prisma.reservation.findMany({
      where: { status: "UPCOMING", checkIn: { gte: tomorrowStart, lt: tomorrowEnd } },
      include: { property: true },
      orderBy: { checkIn: "asc" },
    }),
    prisma.reservation.findMany({
      where: { checkOut: { gte: todayStart, lt: todayEnd } },
      include: { property: true },
      orderBy: { checkOut: "asc" },
    }),
    prisma.job.findMany({
      where: { type: "CLEANING", status: { in: ["PENDING", "ACCEPTED"] }, property: { hasGasBottle: true } },
      include: { property: true, assignedUser: true, reservation: true },
    }),
  ]);

  const gasJobsToday = jobs.filter((j) => {
    const relevantDate = j.reservation?.checkOut ?? j.createdAt;
    return relevantDate >= todayStart && relevantDate < todayEnd;
  });

  const configured = isWhatsAppConfigured();
  const cronUrl = `${process.env.SITE_URL ?? "https://your-deployment"}/api/cron/reminders`;

  return (
    <div>
      <PageHeader title="Reminders" subtitle="Proactive WhatsApp nudges — check-in details, review requests, and gas-bottle checks for cleaners" />

      {!configured && (
        <div className="text-sm text-[var(--color-warning)] bg-[var(--color-warning-bg)] rounded-lg px-4 py-3 mb-5">
          WhatsApp isn&apos;t configured — set WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID to send real reminders.
        </div>
      )}
      {checkinResult && (
        <div className="text-sm bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-lg px-4 py-3 mb-5">
          Sent {checkinResult.sent} check-in reminder{checkinResult.sent === 1 ? "" : "s"}
          {checkinResult.failed > 0 ? ` — ${checkinResult.failed} failed` : ""}.
        </div>
      )}
      {reviewResult && (
        <div className="text-sm bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-lg px-4 py-3 mb-5">
          Sent {reviewResult.sent} review request{reviewResult.sent === 1 ? "" : "s"}
          {reviewResult.failed > 0 ? ` — ${reviewResult.failed} failed` : ""}.
        </div>
      )}
      {gasResult && (
        <div className="text-sm bg-[var(--color-success-bg)] text-[var(--color-success)] rounded-lg px-4 py-3 mb-5">
          Sent {gasResult.sent} gas-bottle reminder{gasResult.sent === 1 ? "" : "s"}
          {gasResult.failed > 0 ? ` — ${gasResult.failed} failed` : ""}.
        </div>
      )}

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold text-[var(--color-navy)]">Tomorrow&apos;s check-in reminders</div>
          <form action={runCheckinReminders}>
            <Button type="submit" variant="accent" disabled={!configured}>
              Send now →
            </Button>
          </form>
        </div>
        <p className="text-xs text-[var(--color-muted)] mb-4">
          Check-in time, address, weather, bin day, and how to reach the Guest App — sent the day before arrival.
        </p>

        <div className="flex flex-col gap-2.5">
          {arrivals.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--color-sand-200)] pb-2.5">
              <div className="min-w-0">
                <div className="font-medium text-[var(--color-navy)]">{r.guestName}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  {r.property.name} · {formatDate(r.checkIn)}
                </div>
              </div>
              {r.checkinReminderSentAt ? (
                <Badge tone="success">Sent {formatDateTime(r.checkinReminderSentAt)}</Badge>
              ) : r.guestPhone ? (
                <Badge tone="info">Queued — {r.guestPhone}</Badge>
              ) : (
                <form action={setGuestPhone.bind(null, r.id)} className="flex items-center gap-1.5 shrink-0">
                  <input
                    name="phone"
                    required
                    placeholder="+61…"
                    className="w-32 text-xs border border-[var(--color-sand-400)] rounded-lg px-2 py-1"
                  />
                  <button className="tap text-xs font-semibold text-[var(--color-teal-dark)]">Save</button>
                </form>
              )}
            </div>
          ))}
          {arrivals.length === 0 && <div className="text-sm text-[var(--color-muted)] py-4">No arrivals tomorrow.</div>}
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold text-[var(--color-navy)]">Today&apos;s post-checkout review requests</div>
          <form action={runReviewRequests}>
            <Button type="submit" variant="accent" disabled={!configured}>
              Send now →
            </Button>
          </form>
        </div>
        <p className="text-xs text-[var(--color-muted)] mb-4">
          A thank-you and a link to leave a quick rating — sent to guests checking out today.
        </p>

        <div className="flex flex-col gap-2.5">
          {departures.map((r) => (
            <div key={r.id} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--color-sand-200)] pb-2.5">
              <div className="min-w-0">
                <div className="font-medium text-[var(--color-navy)]">{r.guestName}</div>
                <div className="text-xs text-[var(--color-muted)]">
                  {r.property.name} · {formatDate(r.checkOut)}
                </div>
              </div>
              {r.reviewRequestSentAt ? (
                <Badge tone="success">Sent {formatDateTime(r.reviewRequestSentAt)}</Badge>
              ) : r.guestPhone ? (
                <Badge tone="info">Queued — {r.guestPhone}</Badge>
              ) : (
                <form action={setGuestPhone.bind(null, r.id)} className="flex items-center gap-1.5 shrink-0">
                  <input
                    name="phone"
                    required
                    placeholder="+61…"
                    className="w-32 text-xs border border-[var(--color-sand-400)] rounded-lg px-2 py-1"
                  />
                  <button className="tap text-xs font-semibold text-[var(--color-teal-dark)]">Save</button>
                </form>
              )}
            </div>
          ))}
          {departures.length === 0 && <div className="text-sm text-[var(--color-muted)] py-4">No departures today.</div>}
        </div>
      </Card>

      <Card className="p-6 mb-6">
        <div className="flex items-center justify-between mb-1">
          <div className="text-sm font-semibold text-[var(--color-navy)]">Today&apos;s gas-bottle check reminders</div>
          <form action={runGasBottleReminders}>
            <Button type="submit" variant="accent" disabled={!configured}>
              Send now →
            </Button>
          </form>
        </div>
        <p className="text-xs text-[var(--color-muted)] mb-4">
          For properties flagged as having a gas bottle — sent to the housekeeper assigned to today&apos;s clean.
        </p>

        <div className="flex flex-col gap-2.5">
          {gasJobsToday.map((j) => (
            <div key={j.id} className="flex items-center justify-between gap-3 text-sm border-b border-[var(--color-sand-200)] pb-2.5">
              <div className="min-w-0">
                <div className="font-medium text-[var(--color-navy)]">{j.property.name}</div>
                <div className="text-xs text-[var(--color-muted)]">{j.assignedUser?.name ?? "Unassigned"}</div>
              </div>
              {j.gasReminderSentAt ? (
                <Badge tone="success">Sent {formatDateTime(j.gasReminderSentAt)}</Badge>
              ) : j.assignedUser?.phone ? (
                <Badge tone="info">Queued — {j.assignedUser.phone}</Badge>
              ) : (
                <Badge tone="warning">No phone on file for {j.assignedUser?.name ?? "this housekeeper"}</Badge>
              )}
            </div>
          ))}
          {gasJobsToday.length === 0 && (
            <div className="text-sm text-[var(--color-muted)] py-4">No gas-bottle properties being cleaned today.</div>
          )}
        </div>
      </Card>

      <Card className="p-5">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Automate this</div>
        <p className="text-xs text-[var(--color-muted)]">
          All three reminders above run once, on demand. To send them automatically every day, set{" "}
          <code>CRON_SECRET</code> and point a scheduler (a Railway Cron Job, or any external cron) at:
        </p>
        <div className="mt-2 text-xs font-mono bg-[var(--color-sand-100)] rounded-lg px-3 py-2 break-all">
          POST {cronUrl}
          <br />
          Authorization: Bearer &lt;CRON_SECRET&gt;
        </div>
      </Card>
    </div>
  );
}
