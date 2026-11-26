// Smart Promotion — built-in dynamic pricing, no revenue-management system
// required. See the "AIPMS Dynamic Pricing" options doc for the full
// build-vs-integrate reasoning; this is Phase 1 of that plan: AIPMS computes
// its own rate from staff-set rules, using only AIPMS's own booking
// history. It never sees comp-set/market data the way a real RMS
// (PriceLabs, Wheelhouse, Beyond) would — suggestPricingRules below is
// explicit about that limit rather than pretending otherwise.
//
// Nothing here pushes a rate anywhere yet: the outbound Channex ARI sync
// (Phase 2) doesn't exist. Until then, a computed rate is advisory — shown
// to staff so they can act on it (update a listing, adjust a quote), not
// applied automatically anywhere a guest sees it.

import Anthropic from "@anthropic-ai/sdk";
import type { PricingRule, PricingSeason, Reservation } from "@prisma/client";

const MODEL = "claude-sonnet-5";

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// ---------------------------------------------------------------------------
// Rate computation — pure functions, no I/O, so they're trivial to preview
// and to unit-test against a hand-picked date.
// ---------------------------------------------------------------------------

export function isWeekendNight(date: Date): boolean {
  const day = date.getUTCDay();
  return day === 5 || day === 6; // a night's weekend-ness is its check-in day: Fri or Sat
}

/** A season band's multiplier for `date`, or null if none covers it.
 *  startMonth/Day..endMonth/Day wraps the year boundary when the end is
 *  earlier than the start (e.g. Dec 15 -> Feb 5 for a summer peak). */
export function seasonMultiplierFor(date: Date, seasons: PricingSeason[]): number | null {
  const month = date.getUTCMonth() + 1;
  const day = date.getUTCDate();
  const key = month * 100 + day;

  for (const s of seasons) {
    const startKey = s.startMonth * 100 + s.startDay;
    const endKey = s.endMonth * 100 + s.endDay;
    const inRange = startKey <= endKey ? key >= startKey && key <= endKey : key >= startKey || key <= endKey;
    if (inRange) return s.multiplier;
  }
  return null;
}

export function computeNightlyRate(basePrice: number, date: Date, rule: PricingRule, seasons: PricingSeason[]): number {
  if (!rule.enabled) return basePrice;

  const seasonMultiplier = seasonMultiplierFor(date, seasons) ?? 1;
  const weekendMultiplier = isWeekendNight(date) ? rule.weekendMultiplier : 1;
  const rate = basePrice * seasonMultiplier * weekendMultiplier;
  return rule.minPrice != null ? Math.max(rate, rule.minPrice) : rate;
}

export type StayQuote = {
  nights: number;
  perNight: { date: Date; rate: number }[];
  subtotal: number;
  longStayDiscount: number;
  total: number;
};

export function computeStayQuote(
  basePrice: number,
  checkIn: Date,
  checkOut: Date,
  rule: PricingRule,
  seasons: PricingSeason[]
): StayQuote {
  const perNight: { date: Date; rate: number }[] = [];
  const cursor = new Date(checkIn);
  while (cursor < checkOut) {
    perNight.push({ date: new Date(cursor), rate: computeNightlyRate(basePrice, cursor, rule, seasons) });
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  const nights = perNight.length;
  const subtotal = Math.round(perNight.reduce((s, n) => s + n.rate, 0) * 100) / 100;
  const qualifies = rule.enabled && rule.longStayNights > 0 && nights >= rule.longStayNights;
  const longStayDiscount = qualifies ? Math.round(subtotal * (rule.longStayDiscountPercent / 100) * 100) / 100 : 0;
  const total = Math.round((subtotal - longStayDiscount) * 100) / 100;

  return { nights, perNight, subtotal, longStayDiscount, total };
}

// ---------------------------------------------------------------------------
// AI-assisted rule drafting — reads a property's own booking history (the
// only data AIPMS actually has) and proposes a starting rule set + plain-
// language reasoning. Same shape as lib/ai.ts / lib/marketing.ts: a real
// Claude call behind ANTHROPIC_API_KEY, a deterministic mock otherwise.
// Always a draft — nothing is saved until a staff member applies it.
// ---------------------------------------------------------------------------

export type PricingSuggestion = {
  weekendMultiplier: number;
  longStayNights: number;
  longStayDiscountPercent: number;
  seasons: { label: string; startMonth: number; startDay: number; endMonth: number; endDay: number; multiplier: number }[];
  rationale: string;
};

type MonthStat = { month: number; nights: number; avgRate: number };

function summarizeHistory(basePrice: number, history: Pick<Reservation, "checkIn" | "checkOut" | "totalAmount">[]) {
  const byMonth = new Map<number, { nights: number; revenue: number }>();
  let weekendNights = 0;
  let weekendRevenue = 0;
  let weekdayNights = 0;
  let weekdayRevenue = 0;

  for (const r of history) {
    const nights = Math.max(1, Math.round((r.checkOut.getTime() - r.checkIn.getTime()) / 86_400_000));
    const perNight = r.totalAmount / nights;
    const cursor = new Date(r.checkIn);
    for (let i = 0; i < nights; i++) {
      const month = cursor.getUTCMonth() + 1;
      const bucket = byMonth.get(month) ?? { nights: 0, revenue: 0 };
      bucket.nights += 1;
      bucket.revenue += perNight;
      byMonth.set(month, bucket);

      if (isWeekendNight(cursor)) {
        weekendNights += 1;
        weekendRevenue += perNight;
      } else {
        weekdayNights += 1;
        weekdayRevenue += perNight;
      }
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
  }

  const monthStats: MonthStat[] = Array.from(byMonth.entries())
    .map(([month, b]) => ({ month, nights: b.nights, avgRate: b.revenue / b.nights }))
    .sort((a, b) => b.avgRate - a.avgRate);

  const weekendAvg = weekendNights ? weekendRevenue / weekendNights : basePrice;
  const weekdayAvg = weekdayNights ? weekdayRevenue / weekdayNights : basePrice;
  const longStays = history.filter((r) => (r.checkOut.getTime() - r.checkIn.getTime()) / 86_400_000 >= 7);

  return { monthStats, weekendAvg, weekdayAvg, weekdayNights, longStayCount: longStays.length, totalStays: history.length };
}

const MONTH_NAME = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function monthLastDay(month: number): number {
  return new Date(Date.UTC(2027, month, 0)).getUTCDate();
}

export async function suggestPricingRules(params: {
  propertyName: string;
  basePrice: number;
  history: Pick<Reservation, "checkIn" | "checkOut" | "totalAmount">[];
}): Promise<PricingSuggestion> {
  const stats = summarizeHistory(params.basePrice, params.history);

  // Not enough history for the pattern to mean anything — say so plainly
  // rather than dressing up a guess as an analysis.
  if (stats.totalStays < 5) {
    return {
      weekendMultiplier: 1.1,
      longStayNights: 7,
      longStayDiscountPercent: 10,
      seasons: [],
      rationale: `Only ${stats.totalStays} past stay${stats.totalStays === 1 ? "" : "s"} on file for ${params.propertyName} — too few to read a real seasonal pattern from. Starting with a conservative 10% weekend premium and a standard weekly discount; revisit once more bookings land.`,
    };
  }

  const weekendMultiplier = Math.round((stats.weekendAvg / stats.weekdayAvg) * 100) / 100 || 1.1;
  const topMonths = stats.monthStats.filter((m) => m.avgRate > stats.weekdayAvg * 1.15).slice(0, 3);
  const seasons = topMonths.map((m) => ({
    label: `${MONTH_NAME[m.month - 1]} peak`,
    startMonth: m.month,
    startDay: 1,
    endMonth: m.month,
    endDay: monthLastDay(m.month),
    multiplier: Math.round((m.avgRate / stats.weekdayAvg) * 100) / 100,
  }));
  const longStayNights = 7;
  const longStayDiscountPercent = stats.longStayCount > 0 ? 10 : 0;

  const c = client();
  if (c) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 250,
        messages: [
          {
            role: "user",
            content: `You are a revenue-management assistant for a holiday-letting platform, explaining a pricing suggestion to a property manager. The property is "${params.propertyName}", base nightly rate $${params.basePrice}. Its own booking history shows: average weekend-night rate achieved $${stats.weekendAvg.toFixed(0)} vs weekday $${stats.weekdayAvg.toFixed(0)} (suggesting a ${weekendMultiplier}x weekend multiplier), and its highest-earning months are ${topMonths.map((m) => MONTH_NAME[m.month - 1]).join(", ") || "not yet distinct from the rest of the year"}. Write 2-3 short sentences explaining this suggestion in plain language a property manager would find useful, noting this is based only on this property's own past bookings, not external market data. No greeting, no sign-off.`,
          },
        ],
      });
      const rationale = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("").trim();
      if (rationale) return { weekendMultiplier, longStayNights, longStayDiscountPercent, seasons, rationale };
    } catch {
      // fall through to the mock rationale below
    }
  }

  const seasonLine = topMonths.length
    ? `${topMonths.map((m) => MONTH_NAME[m.month - 1]).join(" and ")} earned ${Math.round((topMonths[0].avgRate / stats.weekdayAvg - 1) * 100)}% more per night than the rest of the year`
    : "no month stood out clearly enough yet to call it a peak season";
  const rationale = [
    `Based on ${stats.totalStays} past ${params.propertyName} stays: weekend nights averaged $${stats.weekendAvg.toFixed(0)} against $${stats.weekdayAvg.toFixed(0)} on weekdays, suggesting a ${weekendMultiplier}x Friday/Saturday premium.`,
    `${seasonLine}.`,
    stats.longStayCount > 0
      ? `${stats.longStayCount} week-plus stay${stats.longStayCount === 1 ? "" : "s"} on record, so a standard 10% weekly discount is included to keep encouraging those.`
      : `No week-plus stays on record yet, so no long-stay discount is suggested for now.`,
    `This reads only this property's own bookings — it has no visibility into nearby comparable listings the way a dedicated revenue-management tool would.`,
  ].join(" ");

  return { weekendMultiplier, longStayNights, longStayDiscountPercent, seasons, rationale };
}
