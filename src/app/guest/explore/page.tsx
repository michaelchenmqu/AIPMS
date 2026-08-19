import { requireGuestScope } from "@/lib/guest";
import GuestShell from "@/components/guest/GuestShell";
import { getWeatherForecast } from "@/lib/weather";
import { guestRecommendations } from "@/lib/ai";
import { format, parseISO } from "date-fns";

const CATEGORY_LABELS: { key: keyof Awaited<ReturnType<typeof guestRecommendations>>; label: string; icon: string }[] = [
  { key: "restaurants", label: "Restaurants", icon: "🍽️" },
  { key: "activities", label: "Scenic spots & activities", icon: "🌊" },
  { key: "supermarkets", label: "Supermarkets", icon: "🛒" },
  { key: "petrolStations", label: "Petrol stations", icon: "⛽" },
];

export default async function GuestExplorePage() {
  const { property } = await requireGuestScope();

  const [forecast, recs] = await Promise.all([
    property.latitude != null && property.longitude != null
      ? getWeatherForecast(property.latitude, property.longitude)
      : Promise.resolve(null),
    guestRecommendations(property),
  ]);

  return (
    <GuestShell title={property.name} activeHref="/guest/explore">
      <div className="px-5 pt-5 pb-6">
        <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">Explore</div>
        <div className="text-xs text-[var(--color-muted)] mt-1 mb-4">Weather for your stay, and a few local picks.</div>

        {forecast && forecast.length > 0 && (
          <div className="bg-white rounded-2xl p-3.5 mb-4">
            <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2.5">Forecast</div>
            <div className="flex justify-between gap-1">
              {forecast.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                  <div className="text-[10px] text-[var(--color-muted)]">{format(parseISO(d.date), "EEE")}</div>
                  <div className="text-lg">{d.icon}</div>
                  <div className="text-xs font-semibold text-[var(--color-navy)]">{d.highC}°</div>
                  <div className="text-[10px] text-[var(--color-muted)]">{d.lowC}°</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {CATEGORY_LABELS.map(({ key, label, icon }) => {
          const items = recs[key];
          if (!items?.length) return null;
          return (
            <div key={key} className="mb-4">
              <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2 flex items-center gap-1.5">
                <span>{icon}</span> {label}
              </div>
              <div className="flex flex-col gap-2">
                {items.map((item, i) => (
                  <div key={i} className="bg-white rounded-2xl p-3.5">
                    <div className="text-sm font-bold text-[var(--color-navy)]">{item.name}</div>
                    <div className="text-xs text-[var(--color-muted)] mt-0.5">{item.blurb}</div>
                  </div>
                ))}
              </div>
            </div>
          );
        })}

        <div className="text-[10.5px] text-[var(--color-muted-2)] text-center pt-1">
          Ask your host to confirm current hours before heading out.
        </div>
      </div>
    </GuestShell>
  );
}
