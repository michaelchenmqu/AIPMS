import Link from "next/link";
import { requireOwnerScope } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, KpiTile, Badge } from "@/components/ui";
import { LineAreaChart } from "@/components/charts/TrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { formatMoney, formatDate, nowMs } from "@/lib/format";
import { format } from "date-fns";

const PALETTE = ["#1fb8ac", "#3d7ee8", "#e8615a", "#8b6fd8", "#c98a1a", "#137a4f"];

export default async function OwnerOverviewPage() {
  const { owner } = await requireOwnerScope();
  const propertyIds = owner.properties.map((p) => p.id);

  const [reservations, inStay, recentJobs] = await Promise.all([
    prisma.reservation.findMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.reservation.findMany({
      where: { propertyId: { in: propertyIds }, status: "IN_STAY" },
      include: { property: true },
    }),
    prisma.job.findMany({
      where: { propertyId: { in: propertyIds }, status: "DONE" },
      orderBy: { departureAt: "desc" },
      take: 1,
      include: { property: true, linenUsage: true },
    }),
  ]);

  const now = nowMs();
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).getTime();
  const earningsMtd = reservations
    .filter((r) => r.checkIn.getTime() >= monthStart && r.checkIn.getTime() <= now)
    .reduce((s, r) => s + r.totalAmount, 0);

  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const nightsBooked = reservations.reduce((sum, r) => {
    const start = Math.max(r.checkIn.getTime(), now - thirtyDaysMs);
    const end = Math.min(r.checkOut.getTime(), now);
    return sum + Math.max(0, (end - start) / (24 * 60 * 60 * 1000));
  }, 0);
  const occupancy = Math.min(100, Math.round((nightsBooked / (owner.properties.length * 30)) * 100));

  const latestJob = recentJobs[0];

  const revenueByMonth = new Map<string, { label: string; value: number }>();
  for (const r of reservations) {
    const key = format(r.checkIn, "yyyy-MM");
    const entry = revenueByMonth.get(key) ?? { label: format(r.checkIn, "MMM"), value: 0 };
    entry.value += r.totalAmount;
    revenueByMonth.set(key, entry);
  }
  const revenueTrend = Array.from(revenueByMonth.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([, v]) => v);
  const revDelta =
    revenueTrend.length >= 2 && revenueTrend[0].value > 0
      ? Math.round(((revenueTrend[revenueTrend.length - 1].value - revenueTrend[0].value) / revenueTrend[0].value) * 100)
      : null;

  const revenueByProperty = owner.properties
    .map((p, i) => ({
      key: p.id,
      label: p.name,
      value: reservations.filter((r) => r.propertyId === p.id).reduce((s, r) => s + r.totalAmount, 0),
      color: PALETTE[i % PALETTE.length],
    }))
    .filter((p) => p.value > 0)
    .sort((a, b) => b.value - a.value);

  return (
    <div>
      <PageHeader title={`Welcome back, ${owner.name.split(" ")[0]}`} subtitle={`${owner.properties.length} homes · ${owner.region}`} />

      <div className="grid grid-cols-2 gap-4 mb-6">
        <KpiTile label="Earnings MTD" value={formatMoney(earningsMtd)} />
        <KpiTile label="Occupancy (30d)" value={`${occupancy}%`} />
      </div>

      {(revenueTrend.length >= 2 || revenueByProperty.length >= 2) && (
        <div className="grid lg:grid-cols-2 gap-4 mb-6">
          {revenueTrend.length >= 2 && (
            <Card className="p-6">
              <div className="flex items-baseline justify-between mb-1">
                <div className="text-sm font-semibold text-[var(--color-navy)]">Earnings trend</div>
                {revDelta !== null && (
                  <span
                    className={`text-[11.5px] font-bold px-2 py-0.5 rounded-full ${
                      revDelta >= 0 ? "text-[var(--color-success)] bg-[var(--color-success-bg)]" : "text-[var(--color-error)] bg-[var(--color-error-bg)]"
                    }`}
                  >
                    {revDelta >= 0 ? "+" : ""}
                    {revDelta}% vs {revenueTrend[0].label}
                  </span>
                )}
              </div>
              <div className="text-xs text-[var(--color-muted)] mb-4">Booking revenue by month — click a point</div>
              <LineAreaChart data={revenueTrend} format="money" />
            </Card>
          )}
          {revenueByProperty.length >= 2 && (
            <Card className="p-6">
              <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Revenue by property</div>
              <div className="text-xs text-[var(--color-muted)] mb-4">Click a slice or a property to isolate it</div>
              <DonutChart data={revenueByProperty} centerLabel="total revenue" format="money" />
            </Card>
          )}
        </div>
      )}

      {inStay.length > 0 && (
        <Card className="p-5 mb-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-3">Current stays</div>
          <div className="flex flex-col gap-3">
            {inStay.map((r) => (
              <div key={r.id} className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[var(--color-navy)]">{r.property.name}</div>
                  <div className="text-xs text-[var(--color-muted)]">
                    {r.guestName} · {formatDate(r.checkIn)} – {formatDate(r.checkOut)}
                  </div>
                </div>
                <Badge tone="success">In stay</Badge>
              </div>
            ))}
          </div>
        </Card>
      )}

      {latestJob && (
        <Card className="p-6 !bg-[var(--color-navy)]">
          <div className="text-xs font-semibold uppercase tracking-wide text-[rgba(255,255,255,0.6)] mb-3">
            Latest turnover — usage-based · {latestJob.property.name}
          </div>
          <div className="flex flex-col gap-2">
            {latestJob.linenUsage.length > 0 && (
              <div className="flex justify-between text-sm text-[rgba(255,255,255,0.8)] py-1.5 border-b border-[rgba(255,255,255,0.12)]">
                <span>Linen used</span>
                <span className="font-semibold text-white font-mono">{formatMoney(latestJob.linenCost ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-[rgba(255,255,255,0.8)] py-1.5">
              <span>Cleaning · time on site</span>
              <span className="font-semibold text-white font-mono">{formatMoney(latestJob.laborCost ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center pt-2 mt-1 border-t border-[rgba(255,255,255,0.2)]">
              <span className="text-sm font-semibold text-white">Total — not a flat rate</span>
              <span className="font-[family-name:var(--font-serif)] text-lg font-bold text-[var(--color-teal)]">
                {formatMoney(latestJob.totalCost ?? 0)}
              </span>
            </div>
          </div>
        </Card>
      )}

      <div className="mt-6">
        <Link href="/owner/statements" className="text-sm font-semibold text-[var(--color-teal-dark)] hover:underline">
          View all statements →
        </Link>
      </div>
    </div>
  );
}
