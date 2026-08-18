import Link from "next/link";
import { notFound } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { draftCampaignCopy } from "@/lib/marketing";
import { PageHeader, EmptyState } from "@/components/ui";
import { formatDate } from "@/lib/format";
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

  const property = await prisma.property.findUnique({ where: { id: propertyId } });
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

  return (
    <div>
      <Link href="/portal/calendar" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← Calendar
      </Link>
      <PageHeader
        title="New campaign"
        subtitle={`${property.name} · ${nights} vacant night${nights === 1 ? "" : "s"} · ${formatDate(vacancyStart)} – ${formatDate(vacancyEnd)}`}
      />
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
