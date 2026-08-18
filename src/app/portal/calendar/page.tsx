import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { computeVacancies } from "@/lib/marketing";
import { PageHeader, Card } from "@/components/ui";
import { differenceInCalendarDays, addDays, format } from "date-fns";

const DAYS = 14;

const CHANNEL_META: Record<string, { label: string; bg: string; text: string; letter: string }> = {
  DIRECT: { label: "Direct", bg: "var(--color-teal)", text: "var(--color-navy)", letter: "D" },
  AIRBNB: { label: "Airbnb", bg: "#e8615a", text: "#fff", letter: "A" },
  BOOKING_COM: { label: "Booking.com", bg: "var(--color-info-2)", text: "#fff", letter: "B" },
  STAYZ: { label: "Stayz", bg: "#8b6fd8", text: "#fff", letter: "S" },
};

function startOfDay(d: Date) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ offset?: string }>;
}) {
  const { offset: offsetParam } = await searchParams;
  const offset = Math.max(0, parseInt(offsetParam ?? "0", 10) || 0);

  const rangeStart = addDays(startOfDay(new Date()), -2 + offset * DAYS);
  const rangeEnd = addDays(rangeStart, DAYS);

  const properties = await prisma.property.findMany({
    orderBy: { name: "asc" },
    include: {
      reservations: {
        where: { checkOut: { gt: rangeStart }, checkIn: { lt: rangeEnd } },
        orderBy: { checkIn: "asc" },
      },
    },
  });

  const dayCols = Array.from({ length: DAYS }, (_, i) => addDays(rangeStart, i));

  function pct(d: Date) {
    const clamped = d < rangeStart ? rangeStart : d > rangeEnd ? rangeEnd : d;
    return (differenceInCalendarDays(clamped, rangeStart) / DAYS) * 100;
  }

  return (
    <div>
      <PageHeader
        title="Calendar"
        subtitle="Unified availability across every channel — Airbnb, Booking.com &amp; Stayz alongside direct bookings"
      />

      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-5 flex-wrap">
          {Object.values(CHANNEL_META).map((c) => (
            <span key={c.label} className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: c.bg }} />
              {c.label}
            </span>
          ))}
          <span className="flex items-center gap-1.5 text-xs text-[var(--color-muted)]">
            <span className="w-3.5 h-2.5 rounded-[3px] border border-dashed border-[var(--color-sand-400)]" />
            Vacant
          </span>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href={`/portal/calendar?offset=${Math.max(0, offset - 1)}`}
            className="tap w-8 h-8 rounded-lg border border-[var(--color-sand-300)] bg-white flex items-center justify-center text-[var(--color-navy)]"
          >
            ‹
          </Link>
          <span className="text-sm font-semibold text-[var(--color-navy)] whitespace-nowrap">
            {format(rangeStart, "d MMM")} – {format(addDays(rangeEnd, -1), "d MMM yyyy")}
          </span>
          <Link
            href={`/portal/calendar?offset=${offset + 1}`}
            className="tap w-8 h-8 rounded-lg border border-[var(--color-sand-300)] bg-white flex items-center justify-center text-[var(--color-navy)]"
          >
            ›
          </Link>
        </div>
      </div>

      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          <div
            className="grid bg-[var(--color-sand-100)]"
            style={{ gridTemplateColumns: `200px repeat(${DAYS}, 1fr)` }}
          >
            <div className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-2)]">
              Property
            </div>
            {dayCols.map((d) => {
              const isWeekend = d.getDay() === 0 || d.getDay() === 6;
              return (
                <div
                  key={d.toISOString()}
                  className={`py-2 text-center border-l border-[var(--color-sand-200)] ${isWeekend ? "bg-[var(--color-sand-200)]" : ""}`}
                >
                  <div className="text-[10px] font-semibold uppercase tracking-wide text-[var(--color-muted-2)]">
                    {format(d, "EEE")}
                  </div>
                  <div className="text-sm font-semibold text-[var(--color-navy)] mt-0.5">{format(d, "d")}</div>
                </div>
              );
            })}
          </div>

          {properties.map((p) => {
            const vacancies = computeVacancies(
              p.reservations.map((r) => ({ checkIn: r.checkIn, checkOut: r.checkOut })),
              rangeStart,
              rangeEnd
            );
            return (
              <div
                key={p.id}
                className="grid border-t border-[var(--color-sand-200)]"
                style={{ gridTemplateColumns: `200px repeat(${DAYS}, 1fr)`, height: "64px" }}
              >
                <div className="px-4 flex items-center gap-2.5 min-w-0">
                  {/* eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration */}
                  <img src={p.heroImage} alt="" className="w-9 h-7 rounded-md object-cover flex-none" />
                  <div className="min-w-0">
                    <div className="text-[13px] font-semibold text-[var(--color-navy)] truncate">{p.name}</div>
                    <div className="text-[11px] text-[var(--color-muted)] truncate">{p.region}</div>
                  </div>
                </div>
                <div className="relative" style={{ gridColumn: `2 / -1` }}>
                  {p.reservations.map((r) => {
                    const meta = CHANNEL_META[r.channel];
                    const left = pct(r.checkIn);
                    const width = pct(r.checkOut) - left;
                    if (width <= 0) return null;
                    return (
                      <Link
                        key={r.id}
                        href={`/portal/reservations`}
                        className="absolute top-2.5 bottom-2.5 rounded-lg flex items-center gap-1.5 px-2.5 overflow-hidden"
                        style={{ left: `${left}%`, width: `${width}%`, background: meta.bg, color: meta.text }}
                        title={`${r.guestName} · ${meta.label}`}
                      >
                        <span
                          className="w-4 h-4 rounded-full flex items-center justify-center text-[8.5px] font-bold flex-none"
                          style={{ background: "rgba(255,255,255,0.28)" }}
                        >
                          {meta.letter}
                        </span>
                        <span className="text-[11.5px] font-semibold whitespace-nowrap overflow-hidden text-ellipsis">
                          {r.guestName}
                        </span>
                      </Link>
                    );
                  })}
                  {vacancies.map((v, i) => {
                    const left = pct(v.start);
                    const width = pct(v.end) - left;
                    if (width <= 0) return null;
                    const nights = differenceInCalendarDays(v.end, v.start);
                    return (
                      <div
                        key={i}
                        className="absolute top-2.5 bottom-2.5 rounded-lg border-[1.5px] border-dashed border-[var(--color-sand-400)] flex items-center justify-center"
                        style={{
                          left: `${left}%`,
                          width: `${width}%`,
                          backgroundImage:
                            "repeating-linear-gradient(45deg, transparent, transparent 6px, rgba(108,122,134,0.07) 6px, rgba(108,122,134,0.07) 12px)",
                        }}
                      >
                        {nights >= 1 && width > 6 && (
                          <Link
                            href={`/portal/marketing/new?propertyId=${p.id}&start=${v.start.toISOString()}&end=${v.end.toISOString()}`}
                            className="tap inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white border border-[var(--color-teal)] text-[var(--color-teal-dark)] text-[11px] font-bold shadow-[var(--shadow-card)]"
                          >
                            + Promote
                          </Link>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
        </div>
      </Card>
    </div>
  );
}
