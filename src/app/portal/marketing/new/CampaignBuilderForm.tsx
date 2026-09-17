"use client";

import { useState } from "react";
import type { Property } from "@prisma/client";
import { Button } from "@/components/ui";
import { formatDate } from "@/lib/format";

const PLATFORMS: { key: string; label: string; short: string; bg: string }[] = [
  { key: "INSTAGRAM", label: "Instagram", short: "IG", bg: "#c8395a" },
  { key: "FACEBOOK", label: "Facebook", short: "FB", bg: "#3d7ee8" },
  { key: "X", label: "X", short: "X", bg: "#14232e" },
  { key: "EMAIL", label: "Email", short: "@", bg: "#128577" },
];

export default function CampaignBuilderForm({
  property,
  vacancyStart,
  vacancyEnd,
  draft,
  createCampaign,
}: {
  property: Property;
  vacancyStart: string;
  vacancyEnd: string;
  draft: { caption: string; hashtags: string[] };
  createCampaign: (formData: FormData) => void;
}) {
  const [caption, setCaption] = useState(draft.caption);
  const [hashtags, setHashtags] = useState(draft.hashtags.join(", "));
  const [platforms, setPlatforms] = useState<string[]>(["INSTAGRAM", "FACEBOOK"]);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [scheduleMode, setScheduleMode] = useState<"now" | "schedule">("schedule");
  const [scheduledAt, setScheduledAt] = useState(() => {
    const d = new Date(Date.now() + 24 * 60 * 60 * 1000);
    d.setMinutes(0, 0, 0);
    return d.toISOString().slice(0, 16);
  });

  const hashtagChips = hashtags
    .split(",")
    .map((h) => h.trim())
    .filter(Boolean);

  function togglePlatform(key: string) {
    setPlatforms((prev) => (prev.includes(key) ? prev.filter((p) => p !== key) : [...prev, key]));
  }

  return (
    <div className="grid lg:grid-cols-[1fr_400px] gap-6 items-start">
      <form action={createCampaign} className="bg-white rounded-2xl shadow-[var(--shadow-card)] p-6">
        <input type="hidden" name="propertyId" value={property.id} />
        <input type="hidden" name="vacancyStart" value={vacancyStart} />
        <input type="hidden" name="vacancyEnd" value={vacancyEnd} />
        <input type="hidden" name="hashtags" value={hashtagChips.join(",")} />

        <span className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-[var(--color-teal-dark)] mb-5" style={{ background: "color-mix(in srgb, var(--color-teal) 14%, white)" }}>
          ✦ AI drafted this from the property&apos;s listing details
        </span>

        <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mb-2">
          Caption
        </label>
        <textarea
          name="caption"
          value={caption}
          onChange={(e) => setCaption(e.target.value)}
          rows={4}
          className="w-full border border-[var(--color-sand-400)] rounded-[10px] p-3 text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
        />
        <input
          value={hashtags}
          onChange={(e) => setHashtags(e.target.value)}
          placeholder="#Hashtags, comma separated"
          className="w-full border border-[var(--color-sand-400)] rounded-[10px] p-2.5 text-xs mt-2 focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
        />

        <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mt-6 mb-2">
          Post to
        </label>
        <div className="flex gap-2.5 flex-wrap">
          {PLATFORMS.map((p) => {
            const selected = platforms.includes(p.key);
            return (
              <button
                type="button"
                key={p.key}
                onClick={() => togglePlatform(p.key)}
                className={`tap flex items-center gap-2 px-3.5 py-2 rounded-[10px] text-sm font-semibold border-[1.5px] ${
                  selected ? "bg-[var(--color-navy)] text-white border-[var(--color-navy)]" : "bg-white text-[var(--color-navy)] border-[var(--color-sand-400)]"
                }`}
              >
                <span className="w-[22px] h-[22px] rounded-md flex items-center justify-center text-[10px] font-bold text-white" style={{ background: p.bg }}>
                  {p.short}
                </span>
                {p.label}
              </button>
            );
          })}
        </div>
        {platforms.map((p) => (
          <input key={p} type="hidden" name="platforms" value={p} />
        ))}
        {platforms.includes("EMAIL") && (
          <input
            type="email"
            name="emailRecipient"
            value={emailRecipient}
            onChange={(e) => setEmailRecipient(e.target.value)}
            placeholder="owner or guest-list email address"
            className="w-full border border-[var(--color-sand-400)] rounded-[10px] p-2.5 text-xs mt-2.5 focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
          />
        )}

        <label className="block text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mt-6 mb-2">
          When
        </label>
        <input type="hidden" name="scheduleMode" value={scheduleMode} />
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setScheduleMode("now")}
            className={`flex-1 text-left border-[1.5px] rounded-xl px-4 py-3.5 ${
              scheduleMode === "now" ? "border-[var(--color-teal)] bg-[color-mix(in_srgb,var(--color-teal)_6%,white)]" : "border-[var(--color-sand-400)]"
            }`}
          >
            <span className="text-sm font-semibold text-[var(--color-navy)]">Post now</span>
          </button>
          <button
            type="button"
            onClick={() => setScheduleMode("schedule")}
            className={`flex-1 text-left border-[1.5px] rounded-xl px-4 py-3.5 ${
              scheduleMode === "schedule" ? "border-[var(--color-teal)] bg-[color-mix(in_srgb,var(--color-teal)_6%,white)]" : "border-[var(--color-sand-400)]"
            }`}
          >
            <span className="text-sm font-semibold text-[var(--color-navy)]">Schedule</span>
            {scheduleMode === "schedule" && (
              <input
                type="datetime-local"
                name="scheduledAt"
                value={scheduledAt}
                onChange={(e) => setScheduledAt(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                className="block mt-2 border border-[var(--color-sand-400)] rounded-lg px-2.5 py-1.5 text-xs"
              />
            )}
          </button>
        </div>

        <div className="flex justify-end gap-2.5 mt-7">
          <Button type="submit" variant="accent">
            {scheduleMode === "now" ? "Post now" : "Schedule campaign"} →
          </Button>
        </div>
      </form>

      <div>
        <div className="text-[11px] font-bold uppercase tracking-wide text-[var(--color-muted-2)] mb-2.5">Preview</div>
        <div className="bg-white rounded-2xl shadow-[var(--shadow-lift)] overflow-hidden">
          <div className="flex items-center gap-2.5 px-3.5 py-3">
            <span className="w-8 h-8 rounded-full bg-[var(--color-navy)] text-white text-[11px] font-bold flex items-center justify-center flex-none">
              AI
            </span>
            <span className="text-[13px] font-bold text-[var(--color-navy)]">
              {property.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.stays
            </span>
          </div>
          <div className="relative">
            {/* eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration */}
            <img src={property.heroImage} alt="" className="w-full h-auto block" />
            <span className="absolute top-3 left-3 text-[11px] font-bold px-2.5 py-1 rounded-full bg-[var(--color-warning-bg)] text-[var(--color-warning)]">
              {formatDate(new Date(vacancyStart))} – {formatDate(new Date(vacancyEnd))}
            </span>
          </div>
          <div className="px-3.5 py-4 text-[13px] leading-relaxed text-[var(--color-text)]">
            <b className="text-[var(--color-navy)]">{property.name.toLowerCase().replace(/[^a-z0-9]/g, "")}.stays</b>{" "}
            {caption}{" "}
            <span className="text-[var(--color-teal-dark)]">{hashtagChips.join(" ")}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
