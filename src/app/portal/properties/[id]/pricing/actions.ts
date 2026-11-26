"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

/** Turns Smart Promotion on/off and saves the hand-editable rule fields.
 *  Creates the PricingRule row on first save — every property starts with
 *  none, so basePrice alone applies until a staff member sets this up. */
export async function savePricingRule(propertyId: string, formData: FormData) {
  await requireRole("STAFF");

  const enabled = formData.get("enabled") === "on";
  const weekendMultiplier = Number(formData.get("weekendMultiplier") ?? 1);
  const minPriceRaw = String(formData.get("minPrice") ?? "").trim();
  const longStayNights = Math.max(0, Math.round(Number(formData.get("longStayNights") ?? 0)));
  const longStayDiscountPercent = Math.max(0, Number(formData.get("longStayDiscountPercent") ?? 0));

  await prisma.pricingRule.upsert({
    where: { propertyId },
    update: {
      enabled,
      weekendMultiplier,
      minPrice: minPriceRaw ? Number(minPriceRaw) : null,
      longStayNights,
      longStayDiscountPercent,
      aiRationale: null, // hand-edited — the last AI rationale no longer describes the live rule
    },
    create: {
      propertyId,
      enabled,
      weekendMultiplier,
      minPrice: minPriceRaw ? Number(minPriceRaw) : null,
      longStayNights,
      longStayDiscountPercent,
    },
  });

  revalidatePath(`/portal/properties/${propertyId}/pricing`);
}

export async function addPricingSeason(propertyId: string, formData: FormData) {
  await requireRole("STAFF");

  const rule = await prisma.pricingRule.upsert({
    where: { propertyId },
    update: {},
    create: { propertyId },
  });

  const label = String(formData.get("label") ?? "").trim() || "Season";
  const startMonth = Math.min(12, Math.max(1, Math.round(Number(formData.get("startMonth") ?? 1))));
  const startDay = Math.min(31, Math.max(1, Math.round(Number(formData.get("startDay") ?? 1))));
  const endMonth = Math.min(12, Math.max(1, Math.round(Number(formData.get("endMonth") ?? 1))));
  const endDay = Math.min(31, Math.max(1, Math.round(Number(formData.get("endDay") ?? 1))));
  const multiplier = Number(formData.get("multiplier") ?? 1);

  await prisma.pricingSeason.create({
    data: { pricingRuleId: rule.id, label, startMonth, startDay, endMonth, endDay, multiplier },
  });

  revalidatePath(`/portal/properties/${propertyId}/pricing`);
}

export async function removePricingSeason(propertyId: string, seasonId: string) {
  await requireRole("STAFF");
  await prisma.pricingSeason.delete({ where: { id: seasonId } });
  revalidatePath(`/portal/properties/${propertyId}/pricing`);
}

/** Applies the AI-drafted suggestion shown on the page (its values travel
 *  as hidden fields — nothing is persisted until this is clicked) and turns
 *  Smart Promotion on with them. Replaces any existing season bands rather
 *  than merging, since the suggestion is a complete proposed rule set. */
export async function applyPricingSuggestion(propertyId: string, formData: FormData) {
  await requireRole("STAFF");

  const weekendMultiplier = Number(formData.get("weekendMultiplier") ?? 1);
  const longStayNights = Math.max(0, Math.round(Number(formData.get("longStayNights") ?? 0)));
  const longStayDiscountPercent = Math.max(0, Number(formData.get("longStayDiscountPercent") ?? 0));
  const rationale = String(formData.get("rationale") ?? "");
  const seasons = JSON.parse(String(formData.get("seasons") ?? "[]")) as {
    label: string;
    startMonth: number;
    startDay: number;
    endMonth: number;
    endDay: number;
    multiplier: number;
  }[];

  const rule = await prisma.pricingRule.upsert({
    where: { propertyId },
    update: { enabled: true, weekendMultiplier, longStayNights, longStayDiscountPercent, aiRationale: rationale },
    create: { propertyId, enabled: true, weekendMultiplier, longStayNights, longStayDiscountPercent, aiRationale: rationale },
  });

  await prisma.pricingSeason.deleteMany({ where: { pricingRuleId: rule.id } });
  if (seasons.length) {
    await prisma.pricingSeason.createMany({
      data: seasons.map((s) => ({ ...s, pricingRuleId: rule.id })),
    });
  }

  revalidatePath(`/portal/properties/${propertyId}/pricing`);
  redirect(`/portal/properties/${propertyId}/pricing`);
}
