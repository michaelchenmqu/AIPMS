// AI provider abstraction.
//
// Every call here is real Anthropic API code, gated behind ANTHROPIC_API_KEY.
// Without a key (the out-of-the-box demo state) each function falls back to
// a deterministic, seeded mock so the product story — AI clean-check,
// AI inbox triage, AI trainer chat — still demos end-to-end without a key.
// Swap in a key and nothing else needs to change.

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-sonnet-5";

function client() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;
  return new Anthropic({ apiKey });
}

// Small deterministic PRNG so mock results are stable per job/room instead
// of re-rolling on every render.
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

function extractJson<T>(text: string, fallback: T): T {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return fallback;
  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// AI clean-check — compares a captured "after" photo against the property's
// reference photo for a room and returns a match confidence + soft-flag note.
// Soft-flag only: it never blocks job completion, it queues the room for the
// Q&A / audits supervisor review.
// ---------------------------------------------------------------------------
export async function cleanCheckRoom(params: {
  jobId: string;
  room: string;
  referencePhotoUrl?: string | null;
  afterPhotoDataUrl?: string | null;
}): Promise<{ matchPercent: number; flagged: boolean; note: string }> {
  const c = client();
  if (c && params.afterPhotoDataUrl?.startsWith("data:image")) {
    try {
      const [, mediaType, base64] =
        params.afterPhotoDataUrl.match(/^data:(image\/\w+);base64,(.+)$/) ?? [];
      const content: Anthropic.MessageParam["content"] = [
        {
          type: "text",
          text: `You are the AI clean-check for a holiday-letting housekeeping platform. Compare the captured "after clean" photo of the ${params.room.replace(
            "_",
            " "
          )} against the property's expected portfolio look. Respond ONLY with JSON: {"matchPercent": number 0-100, "note": "one short sentence"}.`,
        },
      ];
      if (base64) {
        content.push({
          type: "image",
          source: { type: "base64", media_type: (mediaType as never) ?? "image/jpeg", data: base64 },
        });
      }
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 200,
        messages: [{ role: "user", content }],
      });
      const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const parsed = extractJson(text, { matchPercent: 90, note: "Looks consistent with portfolio photos." });
      const matchPercent = Math.max(0, Math.min(100, Math.round(parsed.matchPercent)));
      return { matchPercent, flagged: matchPercent < 85, note: parsed.note };
    } catch {
      // fall through to mock on any API error
    }
  }

  const r = seededRandom(`${params.jobId}:${params.room}`);
  const matchPercent = Math.round(80 + r * 19); // 80-99
  const flagged = matchPercent < 85;
  const notes: Record<string, string> = {
    LIVING_ROOM: flagged
      ? "Cushions arranged differently than reference — otherwise clean."
      : "Matches reference layout closely.",
    BEDROOM: flagged ? "Bedspread pattern orientation differs from reference." : "Bed made to spec, matches reference.",
    KITCHEN: flagged ? "Bench overhead light left off in photo — verify visually." : "Surfaces clear and matching reference.",
    BATHROOM: flagged ? "Towel fold style differs from reference set." : "Towels and amenities match reference.",
  };
  return { matchPercent, flagged, note: notes[params.room] ?? "Reviewed against reference photo." };
}

// ---------------------------------------------------------------------------
// AI inbox classification — guest/owner/channel messages -> kind + confidence
// + suggested actions, feeding the unified inbox and work-order pipeline.
// ---------------------------------------------------------------------------
export type InboxAiResult = {
  kind: "BOOKING" | "MAINTENANCE" | "GENERAL" | "COMPLAINT";
  confidence: number;
  primaryAction: string;
  secondaryAction: string;
};

export async function classifyInboxMessage(params: {
  subject: string;
  body: string;
}): Promise<InboxAiResult> {
  const c = client();
  if (c) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Classify this property-management inbox message. Respond ONLY with JSON: {"kind": "BOOKING"|"MAINTENANCE"|"GENERAL"|"COMPLAINT", "confidence": 0-100, "primaryAction": "short suggested action", "secondaryAction": "short secondary action"}.\n\nSubject: ${params.subject}\nBody: ${params.body}`,
          },
        ],
      });
      const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const fallback: InboxAiResult = {
        kind: "GENERAL",
        confidence: 70,
        primaryAction: "Review manually",
        secondaryAction: "Reply to guest",
      };
      const parsed = extractJson<InboxAiResult>(text, fallback);
      return parsed;
    } catch {
      // fall through to mock
    }
  }

  const text = `${params.subject} ${params.body}`.toLowerCase();
  const r = seededRandom(params.subject + params.body);
  if (/leak|broken|repair|fix|not working|maintenance|ac |air ?con|fault/.test(text)) {
    return {
      kind: "MAINTENANCE",
      confidence: Math.round(82 + r * 15),
      primaryAction: "Create work order",
      secondaryAction: "Notify contractor",
    };
  }
  if (/refund|disappoint|dirty|unacceptable|complain|awful|terrible/.test(text)) {
    return {
      kind: "COMPLAINT",
      confidence: Math.round(78 + r * 18),
      primaryAction: "Escalate to supervisor",
      secondaryAction: "Draft apology reply",
    };
  }
  if (/book|reservation|availability|dates|check-?in|check-?out|price|quote/.test(text)) {
    return {
      kind: "BOOKING",
      confidence: Math.round(80 + r * 18),
      primaryAction: "Send availability & quote",
      secondaryAction: "Forward to owner",
    };
  }
  return {
    kind: "GENERAL",
    confidence: Math.round(60 + r * 20),
    primaryAction: "Reply to guest",
    secondaryAction: "Mark resolved",
  };
}

// ---------------------------------------------------------------------------
// AI Trainer — chat assistant for onboarding a property, drafting pricing,
// and answering ops questions from the back-office.
// ---------------------------------------------------------------------------
const TRAINER_SYSTEM_PROMPT = `You are the AI Trainer inside AIPMS, a holiday-letting property management platform. You help operations staff onboard new properties, draft dynamic pricing recommendations, and answer questions about running the platform (usage-based housekeeping billing, linen tracking, AI clean-check, trust accounting). Be concise, concrete, and practical — a couple of short paragraphs or a short list at most.`;

export async function trainerChat(
  messages: { role: "user" | "assistant"; content: string }[]
): Promise<string> {
  const c = client();
  if (c) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 600,
        system: TRAINER_SYSTEM_PROMPT,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    } catch {
      // fall through to mock
    }
  }

  if (messages.length === 0) return "";
  const last = messages[messages.length - 1]?.content.toLowerCase() ?? "";
  if (/pric/.test(last)) {
    return "Based on comparable listings in the area, weekend rates are trending 10-15% under market for similar 3BR homes. I'd suggest raising Friday/Saturday nights by $30-40 for the next 8 weeks and watching the booking pace — you can always roll it back from Property performance if conversion drops.";
  }
  if (/onboard|new propert|add propert/.test(last)) {
    return "To onboard a new property: add its address, bedroom/bathroom count, and a base nightly rate, then upload portfolio reference photos per room — those become the baseline the AI clean-check compares against after every turnover. I'll draft a starter listing description and suggested weekday/weekend pricing once photos are in.";
  }
  if (/linen|laundry/.test(last)) {
    return "Linen is billed per-clean from what a housekeeper actually logs in the app (queen/single/bath counts), not a flat per-stay allowance. Set a par level per property under its listing so the system can flag when usage trends above par — that's usually a sign of larger group sizes than the listing states.";
  }
  return "I can help with onboarding a new property, drafting a pricing recommendation, or answering questions about how usage-based billing, AI clean-check, or trust accounting work in AIPMS. What would you like to do?";
}

// ---------------------------------------------------------------------------
// Guest concierge — in-app chat assistant for the Guest App, helping a
// guest locate things and answer practical questions during their stay
// without needing to call the property manager.
// ---------------------------------------------------------------------------
export async function guestConciergeChat(
  messages: { role: "user" | "assistant"; content: string }[],
  property: {
    name: string;
    address: string;
    wifiNetwork: string | null;
    wifiPassword: string | null;
    checkoutTime: string;
    houseManual: string | null;
  }
): Promise<string> {
  const systemPrompt = `You are the friendly in-house concierge assistant for "${property.name}" (${property.address}), a holiday rental. Help the guest currently staying there with practical questions — checkout time, wifi, parking, appliances, where things are, nearby food and attractions. Checkout is at ${property.checkoutTime}.${
    property.wifiNetwork ? ` Wifi network: "${property.wifiNetwork}", password: "${property.wifiPassword}".` : ""
  }${property.houseManual ? ` House notes: ${property.houseManual}` : ""} Be warm, concise, and concrete — a couple of short sentences, not an essay. If asked something you can't know (e.g. real-time weather), say so briefly and suggest a sensible alternative.`;

  const c = client();
  if (c) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 400,
        system: systemPrompt,
        messages: messages.map((m) => ({ role: m.role, content: m.content })),
      });
      return msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
    } catch {
      // fall through to mock
    }
  }

  if (messages.length === 0) return "";
  const last = messages[messages.length - 1]?.content.toLowerCase() ?? "";
  if (/wifi|wi-fi|internet|password/.test(last)) {
    return property.wifiNetwork
      ? `You're all set — connect to "${property.wifiNetwork}" and the password is "${property.wifiPassword}". Let me know if it's not showing up!`
      : `The wifi details should be on a card near the router — if you can't find it, message the host and they'll send it straight over.`;
  }
  if (/checkout|check out|check-out/.test(last)) {
    return `Checkout is at ${property.checkoutTime}. Just pop the key back where you found it and pull the door shut behind you — no need to strip the beds.`;
  }
  if (/park|car/.test(last)) {
    return `There's parking right at the property — pull in and you're set. Street parking nearby is fine too if the driveway's full.`;
  }
  if (/bin|rubbish|trash|garbage/.test(last)) {
    return `Bins are usually tucked by the side of the house — general waste and recycling are both there, no need to take them anywhere.`;
  }
  if (/food|eat|restaurant|coffee|cafe/.test(last)) {
    return `There are a few good spots an easy walk or short drive away — ask me for directions to something specific and I'll point you the right way once you're set up, or check the welcome folder for the host's local picks.`;
  }
  return `Happy to help! I can point you to wifi details, checkout info, parking, bins, or nearby food — what do you need?`;
}

// ---------------------------------------------------------------------------
// Listing suggestions — shown on the owner's property/portfolio screen.
// ---------------------------------------------------------------------------
export async function generateListingSuggestions(params: {
  propertyId: string;
  name: string;
  basePrice: number;
  airbnbScore: number;
  bookingScore: number;
  stayzScore: number;
}): Promise<string[]> {
  const c = client();
  if (c) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 300,
        messages: [
          {
            role: "user",
            content: `Give 3 short, concrete listing-improvement suggestions (photos, pricing, description) for a holiday rental named "${params.name}" with base nightly rate $${params.basePrice} and channel scores Airbnb ${params.airbnbScore}, Booking.com ${params.bookingScore}, Stayz ${params.stayzScore}. Respond ONLY with a JSON array of 3 short strings.`,
          },
        ],
      });
      const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const match = text.match(/\[[\s\S]*\]/);
      if (match) {
        const arr = JSON.parse(match[0]);
        if (Array.isArray(arr) && arr.length) return arr.slice(0, 3);
      }
    } catch {
      // fall through to mock
    }
  }

  const r = seededRandom(params.propertyId);
  const priceBump = Math.round((10 + r * 10) * 10) / 10;
  const lowestScore = Math.min(params.airbnbScore, params.bookingScore, params.stayzScore);
  const lowestChannel =
    lowestScore === params.bookingScore ? "Booking.com" : lowestScore === params.stayzScore ? "Stayz" : "Airbnb";
  return [
    `Add 2-3 twilight/exterior photos — dusk hero shots book ${Math.round(10 + r * 8)}% more often for similar listings.`,
    `Weekend rate is trending below comparable homes — consider +$${priceBump}/night for peak dates.`,
    `${lowestChannel} listing is your weakest channel score (${lowestScore}) — check for missing photos or an outdated description there.`,
  ];
}

// ---------------------------------------------------------------------------
// Guest "Explore" recommendations — short, low-pressure local tips shown
// alongside the weather forecast in the Guest App. Grounded in the
// property's own address/region/house manual, same context the concierge
// chat draws on. Even in AI mode this can invent specific business
// details, so the UI pairs it with a "confirm with your host" caption.
// ---------------------------------------------------------------------------
export type GuestRecommendations = {
  restaurants: { name: string; blurb: string }[];
  activities: { name: string; blurb: string }[];
  supermarkets: { name: string; blurb: string }[];
  petrolStations: { name: string; blurb: string }[];
};

const EMPTY_RECOMMENDATIONS: GuestRecommendations = {
  restaurants: [],
  activities: [],
  supermarkets: [],
  petrolStations: [],
};

export async function guestRecommendations(property: {
  id: string;
  name: string;
  address: string;
  region: string;
  houseManual: string | null;
}): Promise<GuestRecommendations> {
  const c = client();
  if (c) {
    try {
      const msg = await c.messages.create({
        model: MODEL,
        max_tokens: 700,
        messages: [
          {
            role: "user",
            content: `You're writing short, low-key local tips for guests staying at "${property.name}" (${property.address}, ${property.region}).${
              property.houseManual ? ` The host's own notes: ${property.houseManual}` : ""
            } For each of these 4 categories, give 2-3 real, plausible nearby options with a one-sentence blurb each, in a warm, editorial tone — not a sales pitch: restaurants, activities (scenic spots/things to do), supermarkets, petrolStations. Respond ONLY with JSON: {"restaurants": [{"name": string, "blurb": string}], "activities": [...], "supermarkets": [...], "petrolStations": [...]}.`,
          },
        ],
      });
      const text = msg.content.map((b) => (b.type === "text" ? b.text : "")).join("");
      const parsed = extractJson<GuestRecommendations>(text, EMPTY_RECOMMENDATIONS);
      if (parsed.restaurants?.length || parsed.activities?.length) return parsed;
    } catch {
      // fall through to mock
    }
  }

  const r = seededRandom(property.id);
  const areaWord = property.region.split(/[&,]/)[0].trim() || "the area";
  return {
    restaurants: [
      { name: "The local favourite", blurb: `A short drive from ${property.name} — ask your host for their current top pick in ${areaWord}.` },
      { name: "Quick bite option", blurb: "Good for a casual takeaway on the way back from the beach or trails." },
    ],
    activities: [
      { name: "Nearby lookout or beach", blurb: `Worth the trip if you're around ${areaWord} — check tide/weather before heading out.` },
      { name: "Local market or walk", blurb: `Runs most weekends, ${Math.round(15 + r * 10)} minutes away.` },
    ],
    supermarkets: [{ name: "Nearest supermarket", blurb: "A few minutes' drive — your host's welcome notes usually have the closest one." }],
    petrolStations: [{ name: "Nearest petrol station", blurb: "Worth fuelling up before longer day trips out of town." }],
  };
}
