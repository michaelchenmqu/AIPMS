import { requireOwnerScope } from "@/lib/owner";
import { prisma } from "@/lib/prisma";
import { LineAreaChart } from "@/components/charts/TrendChart";
import { DonutChart } from "@/components/charts/DonutChart";
import { formatMoney, formatDate, nowMs } from "@/lib/format";
import { format } from "date-fns";

const PALETTE = ["#1fb8ac", "#3d7ee8", "#e8615a", "#8b6fd8", "#c98a1a", "#137a4f"];

export default async function OwnerAppHomePage() {
  const { owner } = await requireOwnerScope();
  const propertyIds = owner.properties.map((p) => p.id);

  const [reservations, inStay, latestJob] = await Promise.all([
    prisma.reservation.findMany({ where: { propertyId: { in: propertyIds } } }),
    prisma.reservation.findFirst({
      where: { propertyId: { in: propertyIds }, status: "IN_STAY" },
      include: { property: true },
    }),
    prisma.job.findFirst({
      where: { propertyId: { in: propertyIds }, status: "DONE" },
      orderBy: { departureAt: "desc" },
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

  const nightOfStay = inStay
    ? Math.max(1, Math.ceil((now - inStay.checkIn.getTime()) / (24 * 60 * 60 * 1000)))
    : 0;
  const totalNights = inStay
    ? Math.ceil((inStay.checkOut.getTime() - inStay.checkIn.getTime()) / (24 * 60 * 60 * 1000))
    : 0;

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
    <div className="pb-4">
      <div className="bg-gradient-to-br from-[#0b2b33] to-[#20507a] px-5 pt-8 pb-5 text-white">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-[#9fb8cc]">Welcome back</div>
        <div className="font-[family-name:var(--font-serif)] text-2xl font-bold mt-1">{owner.name.split(" ")[0]}</div>
        <div className="text-xs text-[#bcd0e0] mt-0.5">
          {owner.properties.length} homes · {owner.region}
        </div>
      </div>

      <div className="px-5 pt-3.5 grid grid-cols-2 gap-2.5">
        <div className="bg-white rounded-[13px] p-3.5">
          <div className="text-[10.5px] text-[var(--color-muted)]">Earnings MTD</div>
          <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">
            {formatMoney(earningsMtd)}
          </div>
        </div>
        <div className="bg-white rounded-[13px] p-3.5">
          <div className="text-[10.5px] text-[var(--color-muted)]">Occupancy</div>
          <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">{occupancy}%</div>
        </div>
      </div>

      {revenueTrend.length >= 2 && (
        <div className="px-5 pt-2.5">
          <div className="bg-white rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-[var(--color-navy)]">Earnings trend</div>
            <div className="text-[10.5px] text-[var(--color-muted)] mb-2.5">By month — tap a point</div>
            <LineAreaChart data={revenueTrend} format="money" />
          </div>
        </div>
      )}

      {revenueByProperty.length >= 2 && (
        <div className="px-5 pt-2.5">
          <div className="bg-white rounded-2xl p-3.5">
            <div className="text-[11px] font-bold text-[var(--color-navy)]">Revenue by property</div>
            <div className="text-[10.5px] text-[var(--color-muted)] mb-2.5">Tap a slice or a property to isolate it</div>
            <DonutChart data={revenueByProperty} centerLabel="total revenue" format="money" />
          </div>
        </div>
      )}

      {inStay && (
        <div className="px-5 pt-2.5">
          <div className="bg-white rounded-2xl p-3.5 flex gap-3 items-center">
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration */}
            <img src={inStay.property.heroImage} className="w-[52px] h-11 object-cover rounded-lg flex-none" alt="" />
            <div className="flex-1 min-w-0">
              <div className="text-[13px] font-bold text-[var(--color-navy)] truncate">{inStay.property.name}</div>
              <div className="text-[11px] text-[var(--color-muted)]">
                {inStay.guestName} · night {nightOfStay} of {totalNights}
              </div>
            </div>
            <span className="text-[10px] font-bold text-[var(--color-success)] bg-[var(--color-success-bg)] px-2.5 py-1 rounded-full">
              In stay
            </span>
          </div>
        </div>
      )}

      {latestJob && (
        <div className="px-5 pt-4">
          <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2">
            Latest turnover — usage-based
          </div>
          <div className="bg-[var(--color-navy)] rounded-2xl p-3.5">
            {latestJob.linenUsage.length > 0 && (
              <div className="flex justify-between text-xs text-[#bcd0e0] py-1.5 border-b border-white/12">
                <span>Linen used</span>
                <span className="font-bold text-white">{formatMoney(latestJob.linenCost ?? 0)}</span>
              </div>
            )}
            <div className="flex justify-between text-xs text-[#bcd0e0] py-1.5">
              <span>Cleaning · time on site</span>
              <span className="font-bold text-white">{formatMoney(latestJob.laborCost ?? 0)}</span>
            </div>
            <div className="flex justify-between items-center mt-2 pt-2 border-t border-white/20">
              <span className="text-[12.5px] font-bold text-white">Total — not a flat rate</span>
              <span className="font-[family-name:var(--font-serif)] text-[17px] font-bold text-[var(--color-teal)]">
                {formatMoney(latestJob.totalCost ?? 0)}
              </span>
            </div>
          </div>
          {latestJob.departureAt && (
            <div className="text-[10px] text-[var(--color-muted-2)] mt-1.5">
              {latestJob.property.name} · {formatDate(latestJob.departureAt)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
