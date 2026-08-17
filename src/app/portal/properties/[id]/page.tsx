import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";

export default async function PropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      owner: true,
      reservations: { orderBy: { checkIn: "desc" } },
      jobs: { where: { status: "DONE" }, orderBy: { departureAt: "desc" }, take: 10 },
    },
  });
  if (!property) notFound();

  const revenue = property.reservations.reduce((s, r) => s + r.totalAmount, 0);
  const rating = ((property.airbnbScore + property.bookingScore + property.stayzScore) / 3 / 20).toFixed(1);
  const avgJobCost = property.jobs.length
    ? property.jobs.reduce((s, j) => s + (j.totalCost ?? 0), 0) / property.jobs.length
    : 0;

  return (
    <div>
      <Link href="/portal/properties" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← Property performance
      </Link>
      <PageHeader
        title={property.name}
        subtitle={`${property.address} · ${property.region}`}
        actions={
          <Link
            href={`/portal/owners/${property.ownerId}`}
            className="text-sm font-semibold text-[var(--color-teal-dark)] hover:underline"
          >
            View owner →
          </Link>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Total revenue" value={formatMoney(revenue)} sub={`${property.reservations.length} bookings`} />
        <KpiTile label="Rating" value={`${rating}★`} sub="Blended across channels" tone="success" />
        <KpiTile label="Avg. turnover cost" value={formatMoney(avgJobCost)} sub="Usage-based" />
        <KpiTile
          label="Channel health"
          value={`${Math.round((property.airbnbScore + property.bookingScore + property.stayzScore) / 3)}`}
          sub={`Airbnb ${property.airbnbScore} · Booking ${property.bookingScore} · Stayz ${property.stayzScore}`}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card className="p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Recent reservations</div>
          <div className="flex flex-col gap-3">
            {property.reservations.slice(0, 8).map((r) => (
              <div key={r.id} className="flex items-center justify-between text-sm">
                <div>
                  <div className="font-medium text-[var(--color-navy)]">{r.guestName}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {formatDate(r.checkIn)} – {formatDate(r.checkOut)}
                  </div>
                </div>
                <Badge tone={r.status === "IN_STAY" ? "success" : r.status === "UPCOMING" ? "info" : "neutral"}>
                  {r.status.replace("_", " ")}
                </Badge>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Recent turnovers</div>
          <div className="flex flex-col gap-3">
            {property.jobs.map((j) => (
              <Link
                key={j.id}
                href={`/portal/housekeeping/${j.id}`}
                className="tap flex items-center justify-between text-sm"
              >
                <div>
                  <div className="font-medium text-[var(--color-navy)]">
                    {j.departureAt ? formatDate(j.departureAt) : "—"}
                  </div>
                  <div className="text-xs text-[var(--color-muted)]">{j.computedHours}h on-site</div>
                </div>
                <div className="font-mono text-sm">{formatMoney(j.totalCost ?? 0)}</div>
              </Link>
            ))}
            {property.jobs.length === 0 && <div className="text-sm text-[var(--color-muted)]">No completed turnovers yet.</div>}
          </div>
        </Card>
      </div>
    </div>
  );
}
