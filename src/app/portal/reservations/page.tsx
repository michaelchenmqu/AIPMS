import Link from "next/link";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, ScrollTable, Button } from "@/components/ui";
import { formatDate, formatDateTime, formatMoney } from "@/lib/format";
import { approveGuestRequest, declineGuestRequest } from "./actions";

const TABS = [
  { key: "arrivals", label: "Arrivals" },
  { key: "departures", label: "Departures" },
  { key: "in-stay", label: "In-stay" },
  { key: "requests", label: "Requests" },
];

const CHANNEL_LABEL: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  STAYZ: "Stayz",
  DIRECT: "Direct",
};

const REQUEST_TYPE_LABEL: Record<string, string> = {
  EXTEND_STAY: "Extend stay",
  REDUCE_STAY: "Reduce stay",
  EARLY_CHECKIN: "Early check-in",
  LATE_CHECKOUT: "Late check-out",
  EXTRA_CLEANING: "Mid-stay clean",
  EXTRA_BED: "Extra bed / crib",
  AIRPORT_TRANSFER: "Airport transfer",
  SPECIAL_OCCASION: "Special occasion",
  OTHER: "Other",
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "arrivals" } = await searchParams;
  const pendingRequestCount = await prisma.guestRequest.count({ where: { status: "PENDING" } });

  if (tab === "requests") {
    const requests = await prisma.guestRequest.findMany({
      include: { reservation: { include: { property: true } } },
      orderBy: { createdAt: "desc" },
    });

    return (
      <div>
        <PageHeader title="Reservations" subtitle="Arrivals, departures, and current stays across the portfolio" />
        <ReservationTabs tab={tab} pendingRequestCount={pendingRequestCount} />

        <Card className="p-0 overflow-hidden">
          <ScrollTable>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)] bg-[var(--color-sand-100)]">
                  <th className="px-5 py-3 font-semibold">Guest</th>
                  <th className="px-5 py-3 font-semibold">Property</th>
                  <th className="px-5 py-3 font-semibold">Request</th>
                  <th className="px-5 py-3 font-semibold">Detail</th>
                  <th className="px-5 py-3 font-semibold">Submitted</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody>
                {requests.map((r) => {
                  const detail = r.requestedCheckOut
                    ? `New checkout: ${formatDate(r.requestedCheckOut)}${r.estimatedPrice ? ` (${formatMoney(r.estimatedPrice)})` : ""}`
                    : r.requestedTime
                    ? `Time: ${r.requestedTime}`
                    : r.quantity
                    ? `Qty: ${r.quantity}`
                    : r.note ?? "—";
                  return (
                    <tr key={r.id} className="border-t border-[var(--color-sand-200)]">
                      <td className="px-5 py-3 font-medium text-[var(--color-navy)]">{r.reservation.guestName}</td>
                      <td className="px-5 py-3">{r.reservation.property.name}</td>
                      <td className="px-5 py-3">{REQUEST_TYPE_LABEL[r.type] ?? r.type}</td>
                      <td className="px-5 py-3 text-[var(--color-muted)] max-w-[240px] truncate">{detail}</td>
                      <td className="px-5 py-3 text-[var(--color-muted)]">{formatDateTime(r.createdAt)}</td>
                      <td className="px-5 py-3">
                        <Badge tone={r.status === "APPROVED" ? "success" : r.status === "DECLINED" ? "error" : "info"}>
                          {r.status}
                        </Badge>
                      </td>
                      <td className="px-5 py-3">
                        {r.status === "PENDING" && (
                          <div className="flex gap-2">
                            <form action={approveGuestRequest.bind(null, r.id)}>
                              <Button type="submit" variant="accent" className="px-3 py-1.5 text-xs">
                                Approve
                              </Button>
                            </form>
                            <form action={declineGuestRequest.bind(null, r.id)}>
                              <Button type="submit" variant="outline" className="px-3 py-1.5 text-xs">
                                Decline
                              </Button>
                            </form>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
                {requests.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-10 text-center text-[var(--color-muted)]">
                      No guest requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </ScrollTable>
        </Card>
      </div>
    );
  }

  const reservations = await prisma.reservation.findMany({
    include: { property: { include: { owner: true } } },
    orderBy: { checkIn: "asc" },
  });

  const filtered =
    tab === "departures"
      ? reservations.filter((r) => r.status === "IN_STAY").sort((a, b) => a.checkOut.getTime() - b.checkOut.getTime())
      : tab === "in-stay"
      ? reservations.filter((r) => r.status === "IN_STAY")
      : reservations.filter((r) => r.status === "UPCOMING");

  return (
    <div>
      <PageHeader title="Reservations" subtitle="Arrivals, departures, and current stays across the portfolio" />
      <ReservationTabs tab={tab} pendingRequestCount={pendingRequestCount} />

      <Card className="p-0 overflow-hidden">
        <ScrollTable>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)] bg-[var(--color-sand-100)]">
              <th className="px-5 py-3 font-semibold">Guest</th>
              <th className="px-5 py-3 font-semibold">Property</th>
              <th className="px-5 py-3 font-semibold">Owner</th>
              <th className="px-5 py-3 font-semibold">Channel</th>
              <th className="px-5 py-3 font-semibold">Check-in</th>
              <th className="px-5 py-3 font-semibold">Check-out</th>
              <th className="px-5 py-3 font-semibold">Total</th>
              <th className="px-5 py-3 font-semibold">Status</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-t border-[var(--color-sand-200)]">
                <td className="px-5 py-3 font-medium text-[var(--color-navy)]">{r.guestName}</td>
                <td className="px-5 py-3">{r.property.name}</td>
                <td className="px-5 py-3 text-[var(--color-muted)]">{r.property.owner.name}</td>
                <td className="px-5 py-3">{CHANNEL_LABEL[r.channel]}</td>
                <td className="px-5 py-3">{formatDate(r.checkIn)}</td>
                <td className="px-5 py-3">{formatDate(r.checkOut)}</td>
                <td className="px-5 py-3 font-mono">{formatMoney(r.totalAmount)}</td>
                <td className="px-5 py-3">
                  <Badge tone={r.status === "IN_STAY" ? "success" : r.status === "UPCOMING" ? "info" : "neutral"}>
                    {r.status.replace("_", " ")}
                  </Badge>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-5 py-10 text-center text-[var(--color-muted)]">
                  No reservations in this view.
                </td>
              </tr>
            )}
          </tbody>
        </table>
        </ScrollTable>
      </Card>
    </div>
  );
}

function ReservationTabs({ tab, pendingRequestCount }: { tab: string; pendingRequestCount: number }) {
  return (
    <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 w-fit shadow-[var(--shadow-card)]">
      {TABS.map((t) => (
        <Link
          key={t.key}
          href={`/portal/reservations?tab=${t.key}`}
          className={clsx(
            "flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold",
            tab === t.key ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-sand-100)]"
          )}
        >
          {t.label}
          {t.key === "requests" && pendingRequestCount > 0 && (
            <span className="min-w-[18px] h-[18px] px-1 text-[10px] font-bold text-white bg-[var(--color-error)] rounded-full flex items-center justify-center">
              {pendingRequestCount > 99 ? "99+" : pendingRequestCount}
            </span>
          )}
        </Link>
      ))}
    </div>
  );
}
