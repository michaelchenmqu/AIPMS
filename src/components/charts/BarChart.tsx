"use client";

import { useState } from "react";

const FORMATTERS: Record<string, (v: number) => string> = {
  money: (v) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }),
  number: (v) => v.toLocaleString("en-AU"),
};

/** Two-series horizontal bar chart, one row per period — used for the
 *  short<->long conversion trend (switches to long-term vs. back to
 *  short-term, per month). Bars are drawn side by side rather than
 *  stacked so a month with both directions (a re-let after an ended
 *  lease) still reads as two distinct counts, not one merged total. */
export function DualBarChart({
  data,
  aLabel,
  bLabel,
  aColor = "var(--color-teal)",
  bColor = "var(--color-warning)",
}: {
  data: { label: string; a: number; b: number }[];
  aLabel: string;
  bLabel: string;
  aColor?: string;
  bColor?: string;
}) {
  const max = Math.max(1, ...data.map((d) => Math.max(d.a, d.b)));
  return (
    <div>
      <div className="flex flex-col gap-2.5">
        {data.map((d) => (
          <div key={d.label} className="grid grid-cols-[56px_1fr] items-center gap-3">
            <div className="text-[11px] text-[var(--color-muted)] text-right">{d.label}</div>
            <div className="flex flex-col gap-1">
              <div className="h-2.5 rounded-full bg-[var(--color-sand-200)] relative overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(d.a / max) * 100}%`, background: aColor, minWidth: d.a > 0 ? "3px" : 0 }} />
              </div>
              <div className="h-2.5 rounded-full bg-[var(--color-sand-200)] relative overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${(d.b / max) * 100}%`, background: bColor, minWidth: d.b > 0 ? "3px" : 0 }} />
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="flex gap-5 mt-3.5">
        <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-muted)]">
          <span className="w-3.5 h-[3px] rounded-sm" style={{ background: aColor }} />
          {aLabel}
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-muted)]">
          <span className="w-3.5 h-[3px] rounded-sm" style={{ background: bColor }} />
          {bLabel}
        </span>
      </div>
    </div>
  );
}

export function HorizontalBarChart({
  data,
  format = "number",
  color = "var(--color-teal)",
}: {
  data: { label: string; value: number }[];
  format?: "money" | "number";
  color?: string;
}) {
  const formatValue = FORMATTERS[format];
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="flex flex-col gap-3">
      {data.map((d, i) => {
        const pct = Math.max(2, (d.value / max) * 100);
        const active = hover === i;
        return (
          <div
            key={d.label}
            className="grid grid-cols-[120px_1fr_72px] items-center gap-3 group"
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
          >
            <div
              className="text-xs text-[var(--color-muted)] truncate text-right"
              title={d.label}
            >
              {d.label}
            </div>
            <div className="h-3 rounded-full bg-[var(--color-sand-200)] relative overflow-hidden">
              <div
                className="h-full rounded-full transition-[width] duration-200"
                style={{
                  width: `${pct}%`,
                  background: color,
                  opacity: active ? 1 : 0.85,
                }}
              />
            </div>
            <div
              className={`text-xs font-mono tabular-nums ${
                active ? "text-[var(--color-navy)] font-semibold" : "text-[var(--color-muted)]"
              }`}
            >
              {formatValue(d.value)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
