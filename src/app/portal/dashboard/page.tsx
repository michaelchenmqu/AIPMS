import { prisma } from "@/lib/prisma";
import { PageHeader, KpiTile, Card, Badge } from "@/components/ui";
import { HorizontalBarChart } from "@/components/charts/BarChart";
import { formatMoney, timeAgo, nowMs } from "@/lib/format";

export default async function DashboardPage() {
  const [properties, reservations, jobs, openWorkOrders, recentJobs, recentInbox] = await Promise.all([
    prisma.property.findMany({ include: { owner: true } }),
    prisma.reservation.findMany(),
    prisma.job.findMany({ where: { status: "DONE" } }),
    prisma.workOrder.count({ where: { status: { in: ["OPEN", "IN_PROGRESS"] } } }),
    prisma.job.findMany({
      where: { status: "DONE" },
      orderBy: { departureAt: "desc" },
      take: 5,
      include: { property: true, assignedUser: true },
    }),
    prisma.inboxMessage.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { property: true } }),
  ]);

  const totalRevenue = reservations.reduce((sum, r) => sum + r.totalAmount, 0);
  const inStay = reservations.filter((r) => r.status === "IN_STAY").length;
  const thirtyDaysMs = 30 * 24 * 60 * 60 * 1000;
  const now = nowMs();
  const nightsBooked = reservations.reduce((sum, r) => {
    const start = Math.max(r.checkIn.getTime(), now - thirtyDaysMs);
    const end = Math.min(r.checkOut.getTime(), now);
    return sum + Math.max(0, (end - start) / (24 * 60 * 60 * 1000));
  }, 0);
  const occupancy = Math.min(100, Math.round((nightsBooked / (properties.length * 30)) * 100));
  const avgRating = properties.length
    ? (properties.reduce((s, p) => s + p.airbnbScore + p.bookingScore + p.stayzScore, 0) / (properties.length * 3) / 20).toFixed(1)
    : "—";

  const revenueByProperty = properties
    .map((p) => ({
      label: p.name,
      value: reservations.filter((r) => r.propertyId === p.id).reduce((s, r) => s + r.totalAmount, 0),
    }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 7);

  const topProperties = [...properties]
    .map((p) => ({
      ...p,
      revenue: reservations.filter((r) => r.propertyId === p.id).reduce((s, r) => s + r.totalAmount, 0),
      rating: ((p.airbnbScore + p.bookingScore + p.stayzScore) / 3 / 20).toFixed(1),
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  return (
    <div>
      <PageHeader title="Dashboard" subtitle="Portfolio overview across all owners and properties" />

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <KpiTile label="Revenue booked" value={formatMoney(totalRevenue)} sub={`${reservations.length} reservations`} />
        <KpiTile label="Occupancy (30d)" value={`${occupancy}%`} sub={`${inStay} in-stay now`} />
        <KpiTile label="Jobs completed" value={String(jobs.length)} sub="Usage-based billed" />
        <KpiTile label="Avg. rating" value={`${avgRating}★`} sub="Across channels" tone="success" />
        <KpiTile
          label="Open work orders"
          value={String(openWorkOrders)}
          sub="Needs attention"
          tone={openWorkOrders > 0 ? "warning" : "success"}
        />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <Card className="lg:col-span-3 p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Revenue by property</div>
          <HorizontalBarChart data={revenueByProperty} format="money" />
        </Card>

        <Card className="lg:col-span-2 p-6">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Recent activity</div>
          <div className="flex flex-col gap-3">
            {recentJobs.map((j) => (
              <div key={j.id} className="text-xs">
                <span className="font-semibold text-[var(--color-navy)]">{j.property.name}</span>{" "}
                <span className="text-[var(--color-muted)]">
                  turnover completed by {j.assignedUser?.name ?? "—"} · {timeAgo(j.departureAt!)}
                </span>
              </div>
            ))}
            {recentInbox.map((m) => (
              <div key={m.id} className="text-xs">
                <span className="font-semibold text-[var(--color-navy)]">{m.fromName}</span>{" "}
                <span className="text-[var(--color-muted)]">
                  — {m.subject} · {timeAgo(m.createdAt)}
                </span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card className="mt-6 p-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Top properties</div>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)]">
              <th className="pb-2 font-semibold">Property</th>
              <th className="pb-2 font-semibold">Owner</th>
              <th className="pb-2 font-semibold">Revenue</th>
              <th className="pb-2 font-semibold">Rating</th>
            </tr>
          </thead>
          <tbody>
            {topProperties.map((p) => (
              <tr key={p.id} className="border-t border-[var(--color-sand-200)]">
                <td className="py-2.5 font-medium text-[var(--color-navy)]">{p.name}</td>
                <td className="py-2.5 text-[var(--color-muted)]">{p.owner.name}</td>
                <td className="py-2.5 font-mono">{formatMoney(p.revenue)}</td>
                <td className="py-2.5">
                  <Badge tone="success">{p.rating}★</Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
