// AI-assisted social promotion of vacant nights.
//
// Same shape as lib/ai.ts: a real Anthropic call gated behind
// ANTHROPIC_API_KEY, falling back to a deterministic seeded mock so the
// Marketing module demos end-to-end without a key.

import Anthropic from "@anthropic-ai/sdk";
import { differenceInCalendarDays } from "date-fns";

const MODEL = "claude-sonnet-5";

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

function seededRandom(seed: string): number {
  let h = 1779033703 ^ seed.length;
  for (let i = 0; i < seed.length; i++) {
    h = Math.imul(h ^ seed.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  h ^= h >>> 16;
  return (h >>> 0) / 4294967296;
}

// ---------------------------------------------------------------------------
// Unified calendar — merges every channel's reservations for a property into
// one timeline and returns the gaps ("vacancies") within a date range.
// ---------------------------------------------------------------------------
export type DateRange = { start: Date; end: Date };

export function computeVacancies(
  reservations: { checkIn: Date; checkOut: Date }[],
  rangeStart: Date,
  rangeEnd: Date
): DateRange[] {
  const booked = reservations
    .filter((r) => r.checkOut > rangeStart && r.checkIn < rangeEnd)
    .sort((a, b) => a.checkIn.getTime() - b.checkIn.getTime());

  const gaps: DateRange[] = [];
  let cursor = rangeStart;
  for (const b of booked) {
    const start = b.checkIn < rangeStart ? rangeStart : b.checkIn;
    if (start.getTime() > cursor.getTime()) {
      gaps.push({ start: cursor, end: start });
    }
    const end = b.checkOut > rangeEnd ? rangeEnd : b.checkOut;
    if (end.getTime() > cursor.getTime()) cursor = end;
  }
  if (cursor.getTime() < rangeEnd.getTime()) {
    gaps.push({ start: cursor, end: rangeEnd });
  }
  return gaps;
}

// ---------------------------------------------------------------------------
// AI campaign draft — caption + hashtags for a vacancy, ready to review and
// schedule from the campaign builder.
// ---------------------------------------------------------------------------
export async function draftCampaignCopy(params: {
  propertyId: string;
  propertyName: string;
  region: string;
  vacancyStart: Date;
  vacancyEnd: Date;
}): Promise<{ caption: string; hashtags: string[] }> {
  const nights = Math.max(1, differenceInCalendarDays(params.vacancyEnd, params.vacancyStart));
  const c = client();
  if (c) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Write a short, warm Instagram/Facebook caption promoting a ${nights}-night vacancy at a holiday rental called "${params.propertyName}" in ${params.region}, encouraging a direct booking to skip platform fees. One emoji at most. Respond ONLY with JSON: {"caption": "...", "hashtags": ["#One", "#Two", "#Three", "#Four"]}.`,
          },
        ],
      });
      const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]) as { caption: string; hashtags: string[] };
        if (parsed.caption && Array.isArray(parsed.hashtags)) return parsed;
      }
    } catch {
      // fall through to mock
    }
  }

  return mockCampaignCopy(params, nights);
}

function mockCampaignCopy(
  params: { propertyId: string; propertyName: string; region: string; vacancyStart: Date },
  nights: number
): { caption: string; hashtags: string[] } {
  const slug = params.propertyName.replace(/[^a-zA-Z0-9]/g, "");
  const regionSlug = params.region.split(/[\s&/,]+/)[0];
  const r = seededRandom(params.propertyId + params.vacancyStart.toISOString());
  const openers = [
    `${nights} nights just opened up at ${params.propertyName} 🌊`,
    `A rare gap at ${params.propertyName} — ${nights} nights, up for grabs.`,
    `${params.propertyName} has ${nights} free nights this week.`,
  ];
  const opener = openers[Math.floor(r * openers.length)];
  return {
    caption: `${opener} Book direct and skip the platform fees — link in bio.`,
    hashtags: [`#${slug}`, `#${regionSlug}Escape`, "#WeekendGetaway", "#DirectBooking"],
  };
}

// ---------------------------------------------------------------------------
// Simulated results — filled in when a campaign is marked posted, so the
// Performance dashboard has numbers to aggregate without a live ad account.
// ---------------------------------------------------------------------------
export function simulateCampaignResults(
  seed: string,
  nights: number,
  platformCount: number
): { reach: number; clicks: number; bookingsAttributed: number; revenueAttributed: number } {
  const rReach = seededRandom(seed + ":reach");
  const rClicks = seededRandom(seed + ":clicks");
  const rBook = seededRandom(seed + ":book");
  const rRevenue = seededRandom(seed + ":revenue");

  const reach = Math.round((1100 + rReach * 2900) * (0.75 + nights * 0.08) * (0.7 + platformCount * 0.3));
  const clicks = Math.round(reach * (0.015 + rClicks * 0.03));
  const bookingsAttributed = rBook > 0.8 ? 2 : rBook > 0.45 ? 1 : 0;
  const revenueAttributed = bookingsAttributed * Math.round(260 + rRevenue * 480);

  return { reach, clicks, bookingsAttributed, revenueAttributed };
}
