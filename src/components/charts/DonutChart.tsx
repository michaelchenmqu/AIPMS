"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

export type DonutDatum = { key: string; label: string; value: number; color: string };

/** Click-to-isolate donut chart with a legend, used for revenue/reach
 *  breakdowns (e.g. by marketing platform). */
export function DonutChart({
  data,
  centerLabel,
  format = "number",
}: {
  data: DonutDatum[];
  centerLabel?: string;
  format?: "money" | "number";
}) {
  const [selected, setSelected] = useState<string | null>(null);
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = 64;
  const cx = 90;
  const cy = 90;
  const circ = 2 * Math.PI * r;
  const fmt = (v: number) => (format === "money" ? formatMoney(v) : v.toLocaleString("en-AU"));
  const toggle = (key: string) => setSelected((s) => (s === key ? null : key));

  const { segments } = data.reduce<{ segments: Array<DonutDatum & { dasharray: string; dashoffset: number }>; cum: number }>(
    (acc, d) => {
      const len = (d.value / total) * circ;
      acc.segments.push({ ...d, dasharray: `${len} ${circ - len}`, dashoffset: -acc.cum });
      return { segments: acc.segments, cum: acc.cum + len };
    },
    { segments: [], cum: 0 }
  );
  const selectedDatum = data.find((d) => d.key === selected) ?? null;

  return (
    <div className="flex items-center gap-5">
      <div className="relative w-[180px] h-[180px] flex-none">
        <svg width="180" height="180" viewBox="0 0 180 180">
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="var(--color-sand-200)" strokeWidth={24} />
          {segments.map((d) => {
            const isSel = selected === d.key;
            const dimmed = selected != null && !isSel;
            return (
              <circle
                key={d.key}
                cx={cx}
                cy={cy}
                r={r}
                fill="none"
                stroke={d.color}
                strokeWidth={isSel ? 28 : 24}
                strokeDasharray={d.dasharray}
                strokeDashoffset={d.dashoffset}
                transform={`rotate(-90 ${cx} ${cy})`}
                style={{ opacity: dimmed ? 0.32 : 1, cursor: "pointer", transition: "opacity .15s ease, stroke-width .15s ease" }}
                onClick={() => toggle(d.key)}
              />
            );
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <div className="font-[family-name:var(--font-serif)] text-[19px] font-bold text-[var(--color-navy)]">{fmt(total)}</div>
          {centerLabel && <div className="text-[9.5px] text-[var(--color-muted-2)] mt-0.5 text-center">{centerLabel}</div>}
        </div>
        {selectedDatum && (
          <div className="absolute left-1/2 -top-1.5 -translate-x-1/2 -translate-y-full bg-[var(--color-navy)] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-[var(--shadow-lift)] whitespace-nowrap pointer-events-none z-10">
            {selectedDatum.label} · {fmt(selectedDatum.value)} ({Math.round((selectedDatum.value / total) * 100)}%)
          </div>
        )}
      </div>
      <div className="flex-1 flex flex-col gap-1.5 min-w-0">
        {data.map((d) => {
          const isSel = selected === d.key;
          return (
            <div
              key={d.key}
              onClick={() => toggle(d.key)}
              className="tap flex items-center gap-2.5 px-2 py-1.5 rounded-lg"
              style={{ background: isSel ? `${d.color}17` : undefined }}
            >
              <span className="w-2.5 h-2.5 rounded-[3px] flex-none" style={{ background: d.color }} />
              <span className="text-[12.5px] font-semibold text-[var(--color-navy)] flex-1 truncate">{d.label}</span>
              <span className="text-xs text-[var(--color-muted)] font-mono">{fmt(d.value)}</span>
              <span className="text-[11px] text-[var(--color-muted-2)] w-9 text-right">{Math.round((d.value / total) * 100)}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
