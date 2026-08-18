import { prisma } from "@/lib/prisma";
import { PageHeader, Card, KpiTile, ScrollTable } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { MarketingTabs } from "../MarketingTabs";
import { DonutChart } from "@/components/charts/DonutChart";
import { LineAreaChart } from "@/components/charts/TrendChart";
import { format } from "date-fns";

const PLATFORM_META: Record<string, { label: string; short: string; color: string }> = {
  INSTAGRAM: { label: "Instagram", short: "IG", color: "#c8395a" },
  FACEBOOK: { label: "Facebook", short: "FB", color: "#3d7ee8" },
  X: { label: "X", short: "X", color: "#14232e" },
};

export default async function MarketingPerformancePage() {
  const posted = await prisma.campaign.findMany({
    where: { status: "POSTED" },
    include: { property: true },
    orderBy: { postedAt: "asc" },
  });

  const totalReach = posted.reduce((s, c) => s + c.reach, 0);
  const totalClicks = posted.reduce((s, c) => s + c.clicks, 0);
  const totalBookings = posted.reduce((s, c) => s + c.bookingsAttributed, 0);
  const totalRevenue = posted.reduce((s, c) => s + c.revenueAttributed, 0);
  const ctr = totalReach > 0 ? ((totalClicks / totalReach) * 100).toFixed(1) : "0.0";

  const byPlatform = new Map<string, number>();
  for (const c of posted) {
    const platforms = JSON.parse(c.platforms) as string[];
    if (platforms.length === 0) continue;
    const revShare = c.revenueAttributed / platforms.length;
    const reachShare = c.reach / platforms.length;
    for (const p of platforms) {
      byPlatform.set(p, (byPlatform.get(p) ?? 0) + (totalRevenue > 0 ? revShare : reachShare));
    }
  }
  const donutData = Array.from(byPlatform.entries()).map(([key, value]) => ({
    key,
    label: PLATFORM_META[key]?.label ?? key,
    value: Math.round(value),
    color: PLATFORM_META[key]?.color ?? "#9aa6ac",
  }));

  const byMonth = new Map<string, number>();
  for (const c of posted) {
    if (!c.postedAt) continue;
    const label = format(c.postedAt, "MMM");
    byMonth.set(label, (byMonth.get(label) ?? 0) + c.revenueAttributed);
  }
  const trendData = Array.from(byMonth.entries()).map(([label, value]) => ({ label, value }));

  const table = [...posted].sort((a, b) => b.revenueAttributed - a.revenueAttributed);
  const maxRevenue = Math.max(1, ...table.map((c) => c.revenueAttributed));

  return (
    <div>
      <PageHeader title="Campaign performance" subtitle="Reach, engagement, and bookings attributed to AI-promoted vacancies" />
      <MarketingTabs active="performance" />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <KpiTile label="Reach" value={totalReach.toLocaleString("en-AU")} sub={`across ${posted.length} campaign${posted.length === 1 ? "" : "s"}`} />
        <KpiTile label="Clicks" value={totalClicks.toLocaleString("en-AU")} sub={`${ctr}% CTR`} />
        <KpiTile label="Bookings attributed" value={String(totalBookings)} tone="success" sub="lifetime" />
        <KpiTile label="Revenue recovered" value={formatMoney(totalRevenue)} tone="success" sub="from promoted vacancies" />
      </div>

      {posted.length === 0 ? (
        <Card className="p-10 text-center text-sm text-[var(--color-muted)]">
          No campaigns posted yet — mark one posted from the Queue tab to see performance here.
        </Card>
      ) : (
        <>
          <div className="grid lg:grid-cols-2 gap-4 mb-6">
            <Card className="p-6">
              <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">
                {totalRevenue > 0 ? "Revenue by platform" : "Reach by platform"}
              </div>
              <div className="text-xs text-[var(--color-muted)] mb-4">Click a slice or a platform to isolate it</div>
              <DonutChart
                data={donutData}
                centerLabel={totalRevenue > 0 ? "total revenue" : "total reach"}
                format={totalRevenue > 0 ? "money" : "number"}
              />
            </Card>
            <Card className="p-6">
              <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Revenue trend</div>
              <div className="text-xs text-[var(--color-muted)] mb-4">Revenue recovered from promoted vacancies — click a point</div>
              {trendData.length >= 2 ? (
                <LineAreaChart data={trendData} format="money" />
              ) : (
                <div className="text-xs text-[var(--color-muted)] py-8 text-center">Not enough posted history yet for a trend.</div>
              )}
            </Card>
          </div>

          <Card className="p-6">
            <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Campaigns by revenue attributed</div>
            <ScrollTable>
              <table className="w-full text-sm min-w-[640px]">
                <thead>
                  <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)]">
                    <th className="pb-2 font-semibold">Campaign</th>
                    <th className="pb-2 font-semibold">Platforms</th>
                    <th className="pb-2 font-semibold">Reach</th>
                    <th className="pb-2 font-semibold">Clicks</th>
                    <th className="pb-2 font-semibold">Bookings</th>
                    <th className="pb-2 font-semibold">Revenue</th>
                    <th className="pb-2 font-semibold"></th>
                  </tr>
                </thead>
                <tbody>
                  {table.map((c) => {
                    const platforms = JSON.parse(c.platforms) as string[];
                    return (
                      <tr key={c.id} className="border-t border-[var(--color-sand-200)]">
                        <td className="py-2.5">
                          <div className="font-medium text-[var(--color-navy)]">{c.property.name}</div>
                          <div className="text-[11px] text-[var(--color-muted)]">
                            {formatDate(c.vacancyStart)} – {formatDate(c.vacancyEnd)}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <div className="flex gap-1.5">
                            {platforms.map((p) => (
                              <span
                                key={p}
                                className="w-[19px] h-[19px] rounded-md flex items-center justify-center text-[8.5px] font-bold text-white"
                                style={{ background: PLATFORM_META[p]?.color ?? "#9aa6ac" }}
                              >
                                {PLATFORM_META[p]?.short ?? p.slice(0, 2).toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td className="py-2.5 font-mono">{c.reach.toLocaleString("en-AU")}</td>
                        <td className="py-2.5 font-mono">{c.clicks.toLocaleString("en-AU")}</td>
                        <td className="py-2.5 font-mono">{c.bookingsAttributed}</td>
                        <td className="py-2.5 font-mono">{formatMoney(c.revenueAttributed)}</td>
                        <td className="py-2.5">
                          <div className="w-[70px] h-[7px] rounded-full bg-[var(--color-sand-200)] overflow-hidden">
                            <div
                              className="h-full rounded-full bg-[var(--color-teal)]"
                              style={{ width: `${Math.max(2, (c.revenueAttributed / maxRevenue) * 100)}%` }}
                            />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </ScrollTable>
          </Card>
        </>
      )}
    </div>
  );
}
