"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { differenceInCalendarDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";
import { simulateCampaignResults } from "@/lib/marketing";
import { isMetaConfigured, postToFacebookPage, postToInstagram } from "@/lib/meta";
import { isEmailConfigured, sendEmail } from "@/lib/email";
import type { Property } from "@prisma/client";

/** Publishes a campaign to whichever real integrations are configured and
 *  selected, alongside the existing simulated engagement numbers (real
 *  platforms don't hand us reach/click data back synchronously, so the
 *  simulation still drives the Performance dashboard). Never throws —
 *  a failed post leaves the campaign NEEDS_REVIEW with the error as the
 *  review note instead of losing the campaign. */
async function publishCampaign(params: {
  property: Property;
  caption: string;
  hashtags: string[];
  platforms: string[];
  emailRecipient: string | null;
}): Promise<{ facebookPostId: string | null; instagramPostId: string | null; reviewNote: string | null }> {
  const fullCaption = `${params.caption} ${params.hashtags.join(" ")}`.trim();
  const siteUrl = process.env.SITE_URL;
  const imageUrl = siteUrl ? `${siteUrl}${params.property.heroImage}` : null;

  let facebookPostId: string | null = null;
  let instagramPostId: string | null = null;
  const errors: string[] = [];

  if (params.platforms.includes("FACEBOOK") && isMetaConfigured()) {
    if (!imageUrl) {
      errors.push("Facebook: SITE_URL isn't set, so the property photo has no public URL to post.");
    } else {
      try {
        facebookPostId = await postToFacebookPage({ caption: fullCaption, imageUrl });
      } catch (err) {
        errors.push(`Facebook: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (params.platforms.includes("INSTAGRAM") && isMetaConfigured()) {
    if (!imageUrl) {
      errors.push("Instagram: SITE_URL isn't set, so the property photo has no public URL to post.");
    } else {
      try {
        instagramPostId = await postToInstagram({ caption: fullCaption, imageUrl });
      } catch (err) {
        errors.push(`Instagram: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  if (params.platforms.includes("EMAIL") && isEmailConfigured()) {
    if (!params.emailRecipient) {
      errors.push("Email: no recipient address was given.");
    } else {
      try {
        await sendEmail({
          to: params.emailRecipient,
          subject: `${params.property.name} — new availability`,
          html: `<p>${fullCaption.replace(/\n/g, "<br />")}</p>`,
        });
      } catch (err) {
        errors.push(`Email: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
  }

  return { facebookPostId, instagramPostId, reviewNote: errors.length ? errors.join(" ") : null };
}

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
  const emailRecipient = String(formData.get("emailRecipient") ?? "").trim() || null;
  const scheduleMode = String(formData.get("scheduleMode") ?? "now");
  const scheduledAtRaw = String(formData.get("scheduledAt") ?? "");

  if (!caption || platforms.length === 0) {
    throw new Error("A caption and at least one platform are required.");
  }

  const nights = Math.max(1, differenceInCalendarDays(vacancyEnd, vacancyStart));
  const postNow = scheduleMode === "now";
  const scheduledAt = postNow ? new Date() : scheduledAtRaw ? new Date(scheduledAtRaw) : new Date();

  let published: { facebookPostId: string | null; instagramPostId: string | null; reviewNote: string | null } | null = null;
  if (postNow) {
    const property = await prisma.property.findUniqueOrThrow({ where: { id: propertyId } });
    published = await publishCampaign({ property, caption, hashtags, platforms, emailRecipient });
  }

  const campaign = await prisma.campaign.create({
    data: {
      propertyId,
      vacancyStart,
      vacancyEnd,
      caption,
      hashtags: JSON.stringify(hashtags),
      platforms: JSON.stringify(platforms),
      emailRecipient,
      status: postNow ? (published?.reviewNote ? "NEEDS_REVIEW" : "POSTED") : "SCHEDULED",
      scheduledAt,
      postedAt: postNow ? new Date() : null,
      facebookPostId: published?.facebookPostId ?? null,
      instagramPostId: published?.instagramPostId ?? null,
      reviewNote: published?.reviewNote ?? null,
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
  const campaign = await prisma.campaign.findUniqueOrThrow({ where: { id }, include: { property: true } });
  const nights = Math.max(1, differenceInCalendarDays(campaign.vacancyEnd, campaign.vacancyStart));
  const platforms = JSON.parse(campaign.platforms) as string[];
  const results = simulateCampaignResults(campaign.id, nights, platforms.length);

  const published = await publishCampaign({
    property: campaign.property,
    caption: campaign.caption,
    hashtags: JSON.parse(campaign.hashtags) as string[],
    platforms,
    emailRecipient: campaign.emailRecipient,
  });

  await prisma.campaign.update({
    where: { id },
    data: {
      status: published.reviewNote ? "NEEDS_REVIEW" : "POSTED",
      postedAt: new Date(),
      facebookPostId: published.facebookPostId,
      instagramPostId: published.instagramPostId,
      reviewNote: published.reviewNote,
      ...results,
    },
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
