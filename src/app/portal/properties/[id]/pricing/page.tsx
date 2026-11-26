import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge, Button } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { computeNightlyRate, isWeekendNight, suggestPricingRules } from "@/lib/pricing";
import { savePricingRule, addPricingSeason, removePricingSeason, applyPricingSuggestion } from "./actions";

const MONTH_LABEL = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const PREVIEW_NIGHTS = 21;

export default async function PricingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ suggest?: string }>;
}) {
  const { id } = await params;
  const { suggest } = await searchParams;

  const property = await prisma.property.findUnique({
    where: { id },
    include: {
      pricingRule: { include: { seasons: { orderBy: { startMonth: "asc" } } } },
      reservations: { where: { status: "CHECKED_OUT" }, orderBy: { checkIn: "desc" } },
    },
  });
  if (!property || property.lettingMode !== "SHORT_TERM") notFound();

  const rule = property.pricingRule ?? {
    id: "",
    propertyId: property.id,
    enabled: false,
    weekendMultiplier: 1,
    minPrice: null,
    longStayNights: 0,
    longStayDiscountPercent: 0,
    aiRationale: null,
    updatedAt: property.createdAt,
  };
  const seasons = property.pricingRule?.seasons ?? [];

  const preview = Array.from({ length: PREVIEW_NIGHTS }, (_, i) => {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCDate(date.getUTCDate() + i);
    return { date, rate: computeNightlyRate(property.basePrice, date, rule, seasons) };
  });

  const suggestion = suggest === "1" ? await suggestPricingRules({ propertyName: property.name, basePrice: property.basePrice, history: property.reservations }) : null;

  return (
    <div>
      <Link href={`/portal/properties/${property.id}`} className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← {property.name}
      </Link>
      <PageHeader
        title="Smart Promotion — Dynamic pricing"
        subtitle={`${property.name} · base rate ${formatMoney(property.basePrice)}/night`}
        actions={<Badge tone={rule.enabled ? "success" : "neutral"}>{rule.enabled ? "On" : "Off"}</Badge>}
      />

      {!suggestion && (
        <Card className="p-5 mb-6 flex items-center justify-between flex-wrap gap-3">
          <div>
            <div className="text-sm font-semibold text-[var(--color-navy)]">Not sure where to start?</div>
            <div className="text-xs text-[var(--color-muted)] mt-0.5">
              AI reads this property&apos;s own {property.reservations.length} past stay{property.reservations.length === 1 ? "" : "s"} and drafts a
              starting rule set — no external market data, no other system required.
            </div>
          </div>
          <Link href={`/portal/properties/${property.id}/pricing?suggest=1`}>
            <Button variant="accent">Suggest with AI</Button>
          </Link>
        </Card>
      )}

      {suggestion && (
        <Card className="p-5 mb-6 border-2 border-[var(--color-teal)]">
          <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">AI-drafted suggestion</div>
          <p className="text-sm text-[var(--color-muted)] leading-relaxed">{suggestion.rationale}</p>
          <div className="flex flex-wrap gap-4 mt-4 text-sm">
            <div>
              <span className="text-[var(--color-muted-2)]">Weekend</span>{" "}
              <span className="font-semibold text-[var(--color-navy)]">{suggestion.weekendMultiplier}×</span>
            </div>
            <div>
              <span className="text-[var(--color-muted-2)]">Long-stay discount</span>{" "}
              <span className="font-semibold text-[var(--color-navy)]">
                {suggestion.longStayDiscountPercent > 0 ? `${suggestion.longStayDiscountPercent}% at ${suggestion.longStayNights}+ nights` : "none"}
              </span>
            </div>
            {suggestion.seasons.map((s) => (
              <div key={s.label}>
                <span className="text-[var(--color-muted-2)]">{s.label}</span>{" "}
                <span className="font-semibold text-[var(--color-navy)]">{s.multiplier}×</span>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3 mt-4">
            <form action={applyPricingSuggestion.bind(null, property.id)}>
              <input type="hidden" name="weekendMultiplier" value={suggestion.weekendMultiplier} />
              <input type="hidden" name="longStayNights" value={suggestion.longStayNights} />
              <input type="hidden" name="longStayDiscountPercent" value={suggestion.longStayDiscountPercent} />
              <input type="hidden" name="rationale" value={suggestion.rationale} />
              <input type="hidden" name="seasons" value={JSON.stringify(suggestion.seasons)} />
              <Button variant="primary" type="submit">
                Apply &amp; turn on
              </Button>
            </form>
            <Link href={`/portal/properties/${property.id}/pricing`} className="text-xs font-semibold text-[var(--color-muted)] hover:text-[var(--color-navy)]">
              Dismiss
            </Link>
          </div>
        </Card>
      )}

      {rule.aiRationale && (
        <Card className="p-4 mb-6 bg-[var(--color-sand-100)]">
          <div className="text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-2)] mb-1">Why these rules (AI, last applied)</div>
          <p className="text-xs text-[var(--color-muted)] leading-relaxed">{rule.aiRationale}</p>
        </Card>
      )}

      <Card className="p-6 mb-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Rules</div>
        <form action={savePricingRule.bind(null, property.id)} className="flex flex-col gap-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="enabled" defaultChecked={rule.enabled} className="w-4 h-4" />
            <span className="font-semibold text-[var(--color-navy)]">Enable Smart Promotion pricing for this property</span>
          </label>
          <div className="grid sm:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Weekend multiplier</label>
              <input
                type="number"
                step="0.01"
                min="1"
                name="weekendMultiplier"
                defaultValue={rule.weekendMultiplier}
                className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Price floor ($, optional)</label>
              <input
                type="number"
                step="1"
                name="minPrice"
                defaultValue={rule.minPrice ?? ""}
                className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Long-stay from (nights)</label>
              <input
                type="number"
                step="1"
                min="0"
                name="longStayNights"
                defaultValue={rule.longStayNights}
                className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Long-stay discount (%)</label>
              <input
                type="number"
                step="1"
                min="0"
                name="longStayDiscountPercent"
                defaultValue={rule.longStayDiscountPercent}
                className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm"
              />
            </div>
          </div>
          <div>
            <Button variant="primary" type="submit" className="w-fit">
              Save rules
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6 mb-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-4">Season bands</div>
        {seasons.length === 0 && <div className="text-xs text-[var(--color-muted)] mb-4">No season bands yet — the base rate (× weekend multiplier) applies year-round.</div>}
        {seasons.length > 0 && (
          <div className="flex flex-col gap-2 mb-5">
            {seasons.map((s) => (
              <div key={s.id} className="flex items-center justify-between text-sm border-b border-[var(--color-sand-200)] pb-2">
                <div>
                  <span className="font-medium text-[var(--color-navy)]">{s.label}</span>{" "}
                  <span className="text-[var(--color-muted)]">
                    · {MONTH_LABEL[s.startMonth - 1]} {s.startDay} – {MONTH_LABEL[s.endMonth - 1]} {s.endDay} · {s.multiplier}×
                  </span>
                </div>
                <form action={removePricingSeason.bind(null, property.id, s.id)}>
                  <button className="tap text-xs font-semibold text-[var(--color-error)]">Remove</button>
                </form>
              </div>
            ))}
          </div>
        )}
        <form action={addPricingSeason.bind(null, property.id)} className="grid sm:grid-cols-6 gap-3 items-end">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Label</label>
            <input name="label" placeholder="Summer peak" className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Start month</label>
            <input type="number" min="1" max="12" name="startMonth" defaultValue={12} className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Start day</label>
            <input type="number" min="1" max="31" name="startDay" defaultValue={1} className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">End month</label>
            <input type="number" min="1" max="12" name="endMonth" defaultValue={1} className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">End day</label>
            <input type="number" min="1" max="31" name="endDay" defaultValue={31} className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm" />
          </div>
          <div className="sm:col-span-5">
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Multiplier</label>
            <input type="number" step="0.01" min="0.1" name="multiplier" defaultValue={1.3} className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2 text-sm" />
          </div>
          <div>
            <Button variant="outline" type="submit" className="w-full">
              Add
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Next {PREVIEW_NIGHTS} nights</div>
        <div className="text-xs text-[var(--color-muted)] mb-4">
          {rule.enabled ? "What a guest would be quoted tonight, per the rules above." : "Rules are off — every night is the flat base rate until Smart Promotion is enabled."}
        </div>
        <div className="grid sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {preview.map((p) => (
            <div
              key={p.date.toISOString()}
              className={`rounded-lg px-3 py-2 text-xs flex items-center justify-between ${
                isWeekendNight(p.date) ? "bg-[var(--color-sand-100)]" : "bg-white border border-[var(--color-sand-200)]"
              }`}
            >
              <span className="text-[var(--color-muted)]">{formatDate(p.date)}</span>
              <span className="font-semibold text-[var(--color-navy)]">{formatMoney(p.rate)}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
