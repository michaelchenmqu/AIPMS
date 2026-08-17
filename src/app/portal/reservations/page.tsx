import Link from "next/link";
import clsx from "clsx";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, ScrollTable } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";

const TABS = [
  { key: "arrivals", label: "Arrivals" },
  { key: "departures", label: "Departures" },
  { key: "in-stay", label: "In-stay" },
];

const CHANNEL_LABEL: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  STAYZ: "Stayz",
  DIRECT: "Direct",
};

export default async function ReservationsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab = "arrivals" } = await searchParams;

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

      <div className="flex gap-1 mb-5 bg-white rounded-xl p-1 w-fit shadow-[var(--shadow-card)]">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/portal/reservations?tab=${t.key}`}
            className={clsx(
              "px-4 py-2 rounded-lg text-sm font-semibold",
              tab === t.key ? "bg-[var(--color-navy)] text-white" : "text-[var(--color-muted)] hover:bg-[var(--color-sand-100)]"
            )}
          >
            {t.label}
          </Link>
        ))}
      </div>

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
