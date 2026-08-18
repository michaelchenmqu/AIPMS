"use client";

import { useState } from "react";
import { formatMoney } from "@/lib/format";

const W = 480;
const H = 160;
const PAD = { l: 6, r: 6, t: 14, b: 18 };

function scalePoints(values: number[], min: number, max: number) {
  const innerW = W - PAD.l - PAD.r;
  const innerH = H - PAD.t - PAD.b;
  const range = max - min || 1;
  const stepX = values.length > 1 ? innerW / (values.length - 1) : 0;
  return values.map((v, i) => ({
    x: PAD.l + i * stepX,
    y: PAD.t + innerH - ((v - min) / range) * innerH,
  }));
}

function fmt(v: number, format: "money" | "number") {
  return format === "money" ? formatMoney(v) : v.toLocaleString("en-AU");
}

/** Single-series line + area chart with a hover tooltip on each point. */
export function LineAreaChart({
  data,
  format = "number",
  color = "#128577",
  fill = "#1fb8ac",
}: {
  data: { label: string; value: number }[];
  format?: "money" | "number";
  color?: string;
  fill?: string;
}) {
  const [hover, setHover] = useState<number | null>(null);
  const values = data.map((d) => d.value);
  const max = Math.max(...values, 1);
  const min = Math.min(...values) * 0.85;
  const pts = scalePoints(values, min, max);
  const baseY = H - PAD.b;
  const areaD = `M${pts[0].x},${baseY} ${pts.map((p) => `L${p.x},${p.y}`).join(" ")} L${pts[pts.length - 1].x},${baseY} Z`;
  const polyline = pts.map((p) => `${p.x},${p.y}`).join(" ");
  const hovered = hover != null ? data[hover] : null;
  const hoveredPt = hover != null ? pts[hover] : null;
  const gradId = "lac-" + color.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" preserveAspectRatio="none">
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={fill} stopOpacity="0.3" />
            <stop offset="100%" stopColor={fill} stopOpacity="0" />
          </linearGradient>
        </defs>
        <path d={areaD} fill={`url(#${gradId})`} stroke="none" />
        <polyline points={polyline} fill="none" stroke={color} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
        {pts.map((p, i) => (
          <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
            <circle cx={p.x} cy={p.y} r={9} fill="transparent" className="cursor-pointer" />
            <circle cx={p.x} cy={p.y} r={hover === i ? 5.5 : 3} fill="#fff" stroke={color} strokeWidth={2} style={{ pointerEvents: "none" }} />
          </g>
        ))}
      </svg>
      {hovered && hoveredPt && (
        <div
          className="absolute -translate-x-1/2 -translate-y-[125%] bg-[var(--color-navy)] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-[var(--shadow-lift)] whitespace-nowrap pointer-events-none z-10"
          style={{ left: `${(hoveredPt.x / W) * 100}%`, top: `${(hoveredPt.y / H) * 100}%` }}
        >
          {hovered.label} · {fmt(hovered.value, format)}
        </div>
      )}
    </div>
  );
}

/** Two-series line chart with the gap between them shaded — used to show
 *  "actual" tracking under an "estimate" line (e.g. cost savings). */
export function DualLineChart({
  data,
  aLabel,
  bLabel,
  format = "money",
}: {
  data: { label: string; a: number; b: number }[];
  aLabel: string;
  bLabel: string;
  format?: "money" | "number";
}) {
  const [hover, setHover] = useState<number | null>(null);
  const allVals = data.flatMap((d) => [d.a, d.b]);
  const max = Math.max(...allVals) * 1.05;
  const min = Math.min(...allVals) * 0.9;
  const aPts = scalePoints(data.map((d) => d.a), min, max);
  const bPts = scalePoints(data.map((d) => d.b), min, max);
  const aPoly = aPts.map((p) => `${p.x},${p.y}`).join(" ");
  const bPoly = bPts.map((p) => `${p.x},${p.y}`).join(" ");
  const bandD = `M${aPts.map((p) => `${p.x},${p.y}`).join(" L")} L${[...bPts].reverse().map((p) => `${p.x},${p.y}`).join(" L")} Z`;
  const hovered = hover != null ? data[hover] : null;
  const hoveredPt = hover != null ? bPts[hover] : null;

  return (
    <div>
      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto block" preserveAspectRatio="none">
          <path d={bandD} fill="#137a4f" fillOpacity="0.14" stroke="none" />
          <polyline points={aPoly} fill="none" stroke="#9aa6ac" strokeWidth={2} strokeDasharray="5 4" strokeLinecap="round" />
          <polyline points={bPoly} fill="none" stroke="#128577" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
          {bPts.map((p, i) => (
            <g key={i} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              <circle cx={p.x} cy={p.y} r={9} fill="transparent" className="cursor-pointer" />
              <circle cx={p.x} cy={p.y} r={hover === i ? 5.5 : 3} fill="#fff" stroke="#128577" strokeWidth={2} style={{ pointerEvents: "none" }} />
            </g>
          ))}
        </svg>
        {hovered && hoveredPt && (
          <div
            className="absolute -translate-x-1/2 -translate-y-[125%] bg-[var(--color-navy)] text-white text-[11px] font-semibold px-2.5 py-1.5 rounded-lg shadow-[var(--shadow-lift)] whitespace-nowrap pointer-events-none z-10"
            style={{ left: `${(hoveredPt.x / W) * 100}%`, top: `${(hoveredPt.y / H) * 100}%` }}
          >
            {hovered.label} · saved {fmt(hovered.a - hovered.b, format)}
          </div>
        )}
      </div>
      <div className="flex gap-5 mt-3.5">
        <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-muted)]">
          <span className="w-3.5 h-[3px] rounded-sm" style={{ background: "repeating-linear-gradient(90deg,#9aa6ac 0 4px,transparent 4px 7px)" }} />
          {aLabel}
        </span>
        <span className="flex items-center gap-1.5 text-[11.5px] text-[var(--color-muted)]">
          <span className="w-3.5 h-[3px] rounded-sm bg-[#128577]" />
          {bLabel}
        </span>
      </div>
    </div>
  );
}
