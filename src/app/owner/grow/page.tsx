import { requireOwnerScope } from "@/lib/owner";
import { PageHeader, Card } from "@/components/ui";

const TOOLS = [
  {
    icon: "📈",
    title: "Dynamic pricing",
    desc: "Weekend rates trending below market — a few dates flagged for a rate bump based on comparable listings nearby.",
  },
  {
    icon: "🔗",
    title: "Direct booking",
    desc: "Guests who've stayed before get a direct-rebook offer, saving the OTA commission on repeat stays.",
  },
  {
    icon: "✦",
    title: "Upsell manager",
    desc: "Early check-in and other add-ons are offered automatically at booking confirmation when demand allows.",
  },
  {
    icon: "◈",
    title: "Channel health",
    desc: "Airbnb, Booking.com, and Stayz listing scores at a glance — flags missing photos or stale descriptions.",
  },
];

export default async function OwnerGrowPage() {
  await requireOwnerScope();

  return (
    <div>
      <PageHeader title="Grow your bookings" subtitle="AI tools that work in the background across your portfolio" />
      <div className="grid md:grid-cols-2 gap-4">
        {TOOLS.map((t) => (
          <Card key={t.title} className="p-5">
            <div className="text-xl mb-2">{t.icon}</div>
            <div className="text-sm font-semibold text-[var(--color-navy)]">{t.title}</div>
            <p className="text-sm text-[var(--color-muted)] mt-1.5 leading-relaxed">{t.desc}</p>
          </Card>
        ))}
      </div>
    </div>
  );
}
