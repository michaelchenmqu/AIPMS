import { notFound } from "next/navigation";
import Link from "next/link";
import { headers } from "next/headers";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, KpiTile } from "@/components/ui";
import { formatMoney, formatDate } from "@/lib/format";
import { isChannexConfigured } from "@/lib/channex";
import { connectPropertyToChannex } from "../actions";

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

  const hdrs = await headers();
  const host = hdrs.get("host") ?? "localhost:3000";
  const proto = host.startsWith("localhost") ? "http" : "https";
  const guestUrl = `${proto}://${host}/guest?propertyId=${property.id}`;
  const guestQrDataUrl = await QRCode.toDataURL(guestUrl, { margin: 1, width: 160, color: { dark: "#0b2b33" } });

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

      <Card className="p-6 mt-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Guest App access</div>
        <div className="text-xs text-[var(--color-muted)] mb-4">
          Print this on a welcome card — guests scan it, verify with their last name and arrival date, and get their
          stay info plus an AI concierge for questions.
        </div>
        <div className="flex items-center gap-5 flex-wrap">
          {/* eslint-disable-next-line @next/next/no-img-element -- generated QR code data URI */}
          <img src={guestQrDataUrl} alt="Guest App QR code" className="w-[120px] h-[120px] rounded-lg border border-[var(--color-sand-300)]" />
          <div className="min-w-0">
            <div className="text-xs text-[var(--color-muted)] mb-1">Guest link</div>
            <div className="text-xs font-mono text-[var(--color-navy)] break-all bg-[var(--color-sand-100)] rounded-lg px-3 py-2">
              {guestUrl}
            </div>
          </div>
        </div>
      </Card>

      {isChannexConfigured() && (
        <Card className="p-6 mt-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Channel manager</div>
          <div className="text-xs text-[var(--color-muted)] mb-4">
            Connects this property to Airbnb, Booking.com, and Stayz through Channex — rates and availability sync
            out, bookings sync back in automatically.
          </div>
          {property.channexPropertyId ? (
            <Badge tone="success">Connected · {property.channexPropertyId}</Badge>
          ) : (
            <form action={connectPropertyToChannex.bind(null, property.id)}>
              <button className="tap text-sm font-semibold text-[var(--color-teal-dark)] hover:underline">
                Connect to Channex →
              </button>
            </form>
          )}
        </Card>
      )}
    </div>
  );
}
