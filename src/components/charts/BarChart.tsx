"use client";

import { useState } from "react";

const FORMATTERS: Record<string, (v: number) => string> = {
  money: (v) => v.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 }),
  number: (v) => v.toLocaleString("en-AU"),
};

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
