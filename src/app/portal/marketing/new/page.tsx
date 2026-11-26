import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { draftCampaignCopy } from "@/lib/marketing";
import { computeStayQuote } from "@/lib/pricing";
import { PageHeader, EmptyState, Card } from "@/components/ui";
import { formatDate, formatMoney } from "@/lib/format";
import { createCampaign } from "../actions";
import CampaignBuilderForm from "./CampaignBuilderForm";

export default async function NewCampaignPage({
  searchParams,
}: {
  searchParams: Promise<{ propertyId?: string; start?: string; end?: string }>;
}) {
  const { propertyId, start, end } = await searchParams;

  if (!propertyId || !start || !end) {
    return (
      <div>
        <Link href="/portal/calendar" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
          ← Calendar
        </Link>
        <PageHeader title="New campaign" />
        <EmptyState>Pick a vacancy from the Calendar to start a campaign.</EmptyState>
      </div>
    );
  }

  const property = await prisma.property.findUnique({
    where: { id: propertyId },
    include: { pricingRule: { include: { seasons: true } } },
  });
  if (!property) notFound();

  const vacancyStart = new Date(start);
  const vacancyEnd = new Date(end);
  const nights = Math.max(1, differenceInCalendarDays(vacancyEnd, vacancyStart));

  const draft = await draftCampaignCopy({
    propertyId: property.id,
    propertyName: property.name,
    region: property.region,
    vacancyStart,
    vacancyEnd,
  });

  const rule = property.pricingRule;
  const quote = rule ? computeStayQuote(property.basePrice, vacancyStart, vacancyEnd, rule, rule.seasons) : null;
  const daysOut = Math.round((vacancyStart.getTime() - new Date().getTime()) / 86_400_000);
  const shortNotice = daysOut >= 0 && daysOut <= 7;

  return (
    <div>
      <Link href="/portal/calendar" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← Calendar
      </Link>
      <PageHeader
        title="New campaign"
        subtitle={`${property.name} · ${nights} vacant night${nights === 1 ? "" : "s"} · ${formatDate(vacancyStart)} – ${formatDate(vacancyEnd)}`}
      />

      <Card className="p-5 mb-6">
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mb-2">Smart Promotion — pricing idea</div>
        {rule?.enabled && quote ? (
          <>
            <p className="text-sm text-[var(--color-navy)]">
              At today&apos;s rules: <span className="font-semibold">{formatMoney(quote.total)}</span> for these {quote.nights} night
              {quote.nights === 1 ? "" : "s"} ({formatMoney(quote.total / quote.nights)}/night avg).
            </p>
            {shortNotice && (
              <p className="text-xs text-[var(--color-warning)] mt-2">
                This gap starts in {Math.max(daysOut, 0)} day{daysOut === 1 ? "" : "s"} — pairing the campaign with a short one-off discount
                (e.g. 10–15% for this gap only) often fills a near-dated vacancy faster than the campaign alone.
              </p>
            )}
            <p className="text-[11px] text-[var(--color-muted)] mt-2">
              Informational for now — <Link href={`/portal/properties/${property.id}/pricing`} className="underline">adjust the rules</Link> and
              update the listing price on each channel by hand until the automatic rate push ships.
            </p>
          </>
        ) : (
          <p className="text-xs text-[var(--color-muted)]">
            Dynamic pricing isn&apos;t set up for {property.name} yet —{" "}
            <Link href={`/portal/properties/${property.id}/pricing`} className="underline font-semibold">
              set it up
            </Link>{" "}
            to see a rate suggestion for gaps like this one.
          </p>
        )}
      </Card>

      <CampaignBuilderForm
        property={property}
        vacancyStart={vacancyStart.toISOString()}
        vacancyEnd={vacancyEnd.toISOString()}
        draft={draft}
        createCampaign={createCampaign}
      />
    </div>
  );
}
