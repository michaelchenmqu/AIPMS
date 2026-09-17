"use client";

import { useState } from "react";
import { formatDate } from "@/lib/format";

export type LeaseTimelineRow = {
  propertyId: string;
  propertyName: string;
  region: string;
  leases: { id: string; startDate: string; endDate: string | null; status: string; tenantName: string }[];
};

const STATUS_COLOR: Record<string, string> = {
  ACTIVE: "var(--color-teal)",
  ENDING: "var(--color-warning)",
  ENDED: "var(--color-muted-2)",
};

/** Gantt-style lease calendar — one row per property, one bar per lease
 *  (a property re-let after an ended lease gets more than one bar), all
 *  positioned against a shared date axis so gaps and overlaps both read
 *  at a glance. DOM/percentage-positioned rather than SVG-scaled, same
 *  as the rest of this app's non-chart layout — simpler than date-scaling
 *  an SVG viewBox for what's fundamentally a set of horizontal bars.
 *  `now` comes from the server render (see lib/format.ts#nowMs) rather
 *  than calling Date.now() here — a client component's render must stay
 *  pure. */
export function LeaseTimelineChart({ rows, now }: { rows: LeaseTimelineRow[]; now: string }) {
  const [hover, setHover] = useState<string | null>(null);
  const nowDate = new Date(now);

  const allDates = rows.flatMap((r) => r.leases.flatMap((l) => [new Date(l.startDate), l.endDate ? new Date(l.endDate) : nowDate]));
  if (allDates.length === 0) {
    return <div className="text-sm text-[var(--color-muted)] py-6 text-center">No lease history yet.</div>;
  }
  const rangeStart = new Date(Math.min(...allDates.map((d) => d.getTime())));
  const rangeEnd = new Date(Math.max(...allDates.map((d) => d.getTime()), nowDate.getTime()));
  rangeStart.setDate(1);
  const totalMs = rangeEnd.getTime() - rangeStart.getTime() || 1;

  const pct = (d: Date) => ((d.getTime() - rangeStart.getTime()) / totalMs) * 100;
  const nowPct = pct(nowDate);

  // A handful of evenly-spaced month tick labels along the top.
  const tickCount = 6;
  const ticks = Array.from({ length: tickCount }, (_, i) => {
    const t = new Date(rangeStart.getTime() + (totalMs * i) / (tickCount - 1));
    return { pct: (i / (tickCount - 1)) * 100, label: t.toLocaleDateString("en-AU", { month: "short", year: "2-digit" }) };
  });

  return (
    <div>
      <div className="relative h-5 mb-2 ml-[132px]">
        {ticks.map((t, i) => (
          <span
            key={i}
            className="absolute text-[10px] text-[var(--color-muted-2)] -translate-x-1/2"
            style={{ left: `${t.pct}%` }}
          >
            {t.label}
          </span>
        ))}
      </div>
      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <div key={row.propertyId} className="flex items-center gap-3">
            <div className="w-[120px] flex-none text-xs font-semibold text-[var(--color-navy)] truncate" title={row.propertyName}>
              {row.propertyName}
            </div>
            <div className="relative flex-1 h-6 rounded-md bg-[var(--color-sand-100)]">
              <div className="absolute top-0 bottom-0 w-px bg-[var(--color-sand-400)]" style={{ left: `${nowPct}%` }} />
              {row.leases.map((l) => {
                const start = pct(new Date(l.startDate));
                const end = pct(l.endDate ? new Date(l.endDate) : nowDate);
                const width = Math.max(1, end - start);
                const isHover = hover === l.id;
                return (
                  <div
                    key={l.id}
                    onMouseEnter={() => setHover(l.id)}
                    onMouseLeave={() => setHover(null)}
                    className="absolute top-0.5 bottom-0.5 rounded cursor-pointer transition-opacity"
                    style={{
                      left: `${start}%`,
                      width: `${width}%`,
                      background: STATUS_COLOR[l.status] ?? "var(--color-muted-2)",
                      opacity: isHover ? 1 : 0.85,
                    }}
                  >
                    {isHover && (
                      <div className="absolute -translate-x-1/2 -translate-y-[125%] left-1/2 top-0 bg-[var(--color-navy)] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-[var(--shadow-lift)] whitespace-nowrap pointer-events-none z-10">
                        {l.tenantName} · {formatDate(new Date(l.startDate))} – {l.endDate ? formatDate(new Date(l.endDate)) : "now"}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--color-teal)" }} /> Active
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--color-warning)" }} /> Ending
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
          <span className="w-2.5 h-2.5 rounded-sm" style={{ background: "var(--color-muted-2)" }} /> Ended
        </span>
        <span className="flex items-center gap-1.5 text-[11px] text-[var(--color-muted)]">
          <span className="w-px h-2.5 bg-[var(--color-sand-400)]" /> Today
        </span>
      </div>
    </div>
  );
}
