import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDate, formatDateTime, timeAgo } from "@/lib/format";
import { MarketingTabs } from "../MarketingTabs";
import { markCampaignPosted, approveCampaign } from "../actions";
import type { CampaignStatus } from "@prisma/client";

const PLATFORM_META: Record<string, { label: string; bg: string }> = {
  INSTAGRAM: { label: "IG", bg: "#c8395a" },
  FACEBOOK: { label: "FB", bg: "#3d7ee8" },
  X: { label: "X", bg: "#14232e" },
};

const COLUMNS: { key: CampaignStatus; label: string; dot: string }[] = [
  { key: "SCHEDULED", label: "Scheduled", dot: "var(--color-info-2)" },
  { key: "POSTED", label: "Posted", dot: "var(--color-success)" },
  { key: "NEEDS_REVIEW", label: "Needs review", dot: "var(--color-warning)" },
];

export default async function MarketingQueuePage() {
  const campaigns = await prisma.campaign.findMany({
    include: { property: true },
    orderBy: [{ createdAt: "desc" }],
  });

  return (
    <div>
      <PageHeader title="Campaigns" subtitle="Scheduled and published promotions across your portfolio" />
      <MarketingTabs active="queue" />

      <div className="grid md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const items = campaigns.filter((c) => c.status === col.key);
          return (
            <div key={col.key}>
              <div className="flex items-center gap-2 mb-3">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: col.dot }} />
                <span className="text-xs font-bold text-[var(--color-navy)]">{col.label}</span>
                <span className="text-xs text-[var(--color-muted-2)] bg-[var(--color-sand-100)] px-2 rounded-full">
                  {items.length}
                </span>
              </div>
              <div className="flex flex-col gap-3.5">
                {items.map((c) => {
                  const platforms = JSON.parse(c.platforms) as string[];
                  return (
                    <Card key={c.id} className="overflow-hidden">
                      {/* eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration */}
                      <img src={c.property.heroImage} alt="" className="w-full h-24 object-cover" />
                      <div className="p-3.5">
                        <div className="text-[13.5px] font-bold text-[var(--color-navy)]">{c.property.name}</div>
                        <div className="text-[11.5px] text-[var(--color-muted)] mt-0.5">
                          {formatDate(c.vacancyStart)} – {formatDate(c.vacancyEnd)}
                        </div>
                        <div className="flex gap-1.5 mt-2.5">
                          {platforms.map((p) => (
                            <span
                              key={p}
                              className="w-5 h-5 rounded-md flex items-center justify-center text-[9px] font-bold text-white"
                              style={{ background: PLATFORM_META[p]?.bg ?? "#9aa6ac" }}
                            >
                              {PLATFORM_META[p]?.label ?? p[0]}
                            </span>
                          ))}
                        </div>

                        {col.key === "SCHEDULED" && (
                          <div className="flex items-center justify-between mt-3">
                            <span className="text-[11px] text-[var(--color-muted-2)]">
                              {c.scheduledAt ? formatDateTime(c.scheduledAt) : "—"}
                            </span>
                            <form action={markCampaignPosted.bind(null, c.id)}>
                              <button className="tap text-xs font-semibold text-[var(--color-teal-dark)]">Mark posted →</button>
                            </form>
                          </div>
                        )}
                        {col.key === "POSTED" && (
                          <div className="mt-3">
                            <Badge tone="success">{c.postedAt ? timeAgo(c.postedAt) : "Posted"}</Badge>
                          </div>
                        )}
                        {col.key === "NEEDS_REVIEW" && (
                          <div className="mt-3">
                            {c.reviewNote && <p className="text-xs text-[var(--color-warning)] mb-2">{c.reviewNote}</p>}
                            <form action={approveCampaign.bind(null, c.id)}>
                              <button className="tap text-xs font-semibold text-[var(--color-teal-dark)]">Approve &amp; schedule →</button>
                            </form>
                          </div>
                        )}
                      </div>
                    </Card>
                  );
                })}
                {items.length === 0 && (
                  <div className="text-xs text-[var(--color-muted)] border border-dashed border-[var(--color-sand-400)] rounded-xl py-6 text-center">
                    Nothing here
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
