"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { simulateCampaignResults } from "@/lib/marketing";

export async function createCampaign(formData: FormData) {
  await requireRole("STAFF");

  const propertyId = String(formData.get("propertyId"));
  const vacancyStart = new Date(String(formData.get("vacancyStart")));
  const vacancyEnd = new Date(String(formData.get("vacancyEnd")));
  const caption = String(formData.get("caption") ?? "").trim();
  const hashtags = String(formData.get("hashtags") ?? "")
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);
  const platforms = formData.getAll("platforms").map(String);
  const scheduleMode = String(formData.get("scheduleMode") ?? "now");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");

  if (!caption || platforms.length === 0) {
    throw new Error("A caption and at least one platform are required.");
  }

  const nights = Math.max(1, differenceInCalendarDays(vacancyEnd, vacancyStart));
  const postNow = scheduleMode === "now";
  const scheduledAt = postNow ? new Date() : scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();

  const campaign = await prisma.campaign.create({
    data: {
      propertyId,
      vacancyStart,
      vacancyEnd,
      caption,
      hashtags: JSON.stringify(hashtags),
      platforms: JSON.stringify(platforms),
      status: postNow ? "POSTED" : "SCHEDULED",
      scheduledAt,
      postedAt: postNow ? new Date() : null,
      ...(postNow ? simulateCampaignResults(propertyId + vacancyStart.toISOString(), nights, platforms.length) : {}),
    },
  });

  revalidatePath("/portal/calendar");
  revalidatePath("/portal/marketing/queue");
  revalidatePath("/portal/marketing/performance");
  redirect(`/portal/marketing/queue?created=${campaign.id}`);
}

export async function markCampaignPosted(id: string) {
  await requireRole("STAFF");
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id } });
  const nights = Math.max(1, differenceInCalendarDays(campaign.vacancyEnd, campaign.vacancyStart));
  const platformCount = (JSON.parse(campaign.platforms) as string[]).length;
  const results = simulateCampaignResults(campaign.id, nights, platformCount);

  await prisma.campaign.update({
    where: { id },
    data: { status: "POSTED", postedAt: new Date(), ...results },
  });
  revalidatePath("/portal/marketing/queue");
  revalidatePath("/portal/marketing/performance");
}

export async function approveCampaign(id: string) {
  await requireRole("STAFF");
  await prisma.campaign.update({
    where: { id },
    data: { status: "SCHEDULED", scheduledAt: new Date(), reviewNote: null },
  });
  revalidatePath("/portal/marketing/queue");
}
