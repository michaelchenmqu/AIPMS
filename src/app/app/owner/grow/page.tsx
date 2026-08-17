import { requireOwnerScope } from "@/lib/owner";
import DemoActionButton from "@/components/mobile/DemoActionButton";

const TOOLS = [
  {
    icon: "📈",
    title: "Dynamic pricing",
    desc: "Weekend rates 12% below market — +$40/night suggested for 3 dates.",
    msg: "Pricing recommendation opened — 3 dates flagged",
  },
  {
    icon: "🔗",
    title: "Direct booking",
    desc: "9 guests rebooked direct last quarter, saving $1,240 in OTA commission.",
    msg: "Direct-rebook offer sent to last Airbnb guest",
  },
  {
    icon: "✦",
    title: "Upsell manager",
    desc: "Early check-in taken 6 times this month at $35 — offer automatically.",
    msg: "Early check-in upsell enabled at booking confirmation",
  },
  {
    icon: "◈",
    title: "Channel health",
    desc: "Airbnb 96 · Booking.com 88 · Stayz 91 — Booking.com missing 4 photos.",
    msg: "Channel health report opened",
  },
];

export default async function OwnerAppGrowPage() {
  await requireOwnerScope();

  return (
    <div className="pb-6">
      <div className="px-5 pt-8 pb-1">
        <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">Grow your bookings</div>
      </div>
      <div className="px-5 pt-2.5 flex flex-col gap-2.5">
        {TOOLS.map((t) => (
          <DemoActionButton key={t.title} message={t.msg} className="text-left bg-white rounded-2xl p-3.5 block w-full">
            <div className="text-base mb-1">{t.icon}</div>
            <div className="text-[13px] font-bold text-[var(--color-navy)]">{t.title}</div>
            <div className="text-[11.5px] text-[var(--color-muted)] mt-0.5 leading-relaxed">{t.desc}</div>
          </DemoActionButton>
        ))}
      </div>
    </div>
  );
}
