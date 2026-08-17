import Link from "next/link";
import clsx from "clsx";
import { requireOwnerScope } from "@/lib/owner";
import { generateListingSuggestions } from "@/lib/ai";
import DemoActionButton from "@/components/mobile/DemoActionButton";

export default async function OwnerAppPropertiesPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { owner } = await requireOwnerScope();
  const { p } = await searchParams;
  const property = owner.properties.find((x) => x.id === p) ?? owner.properties[0];
  if (!property) return <div className="p-5 text-sm text-[var(--color-muted)]">No properties yet.</div>;

  const suggestions = await generateListingSuggestions({
    propertyId: property.id,
    name: property.name,
    basePrice: property.basePrice,
    airbnbScore: property.airbnbScore,
    bookingScore: property.bookingScore,
    stayzScore: property.stayzScore,
  });

  const images: string[] = JSON.parse(property.images || "[]");
  const gallery = images.length ? images : ["/images/room-living.svg", "/images/room-bedroom.svg"];

  return (
    <div className="pb-6">
      {owner.properties.length > 1 && (
        <div className="flex gap-1.5 px-5 pt-4 overflow-x-auto">
          {owner.properties.map((prop) => (
            <Link
              key={prop.id}
              href={`/app/owner/properties?p=${prop.id}`}
              className={clsx(
                "shrink-0 text-xs font-semibold px-3 py-1.5 rounded-full",
                prop.id === property.id ? "bg-[var(--color-navy)] text-white" : "bg-white text-[var(--color-muted)]"
              )}
            >
              {prop.name}
            </Link>
          ))}
        </div>
      )}

      <div className="px-5 pt-4 pb-1">
        <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">{property.name}</div>
        <div className="text-xs text-[var(--color-muted-2)] mt-0.5">Listing &amp; photos · synced to Airbnb, Booking.com, Stayz</div>
      </div>

      <div className="px-5 pt-2.5">
        <div className="grid grid-cols-3 gap-1.5">
          {gallery.slice(0, 2).map((src, i) => (
            // eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration
            <img key={i} src={src} alt="" className="w-full h-16 object-cover rounded-lg" />
          ))}
          <DemoActionButton
            message="Photo upload opened"
            className="w-full h-16 rounded-lg border-[1.5px] border-dashed border-[var(--color-sand-400)] flex items-center justify-center text-lg text-[var(--color-muted-2)]"
          >
            +
          </DemoActionButton>
        </div>

        <div className="bg-white rounded-2xl p-3.5 mt-3.5">
          <div className="text-[12.5px] font-bold text-[var(--color-navy)] mb-2.5">✦ AI suggestions</div>
          <div className="flex flex-col gap-2">
            {suggestions.map((s, i) => (
              <div key={i} className="text-[11.5px] text-[#3a4b56] leading-relaxed">
                • {s}
              </div>
            ))}
          </div>
          <DemoActionButton
            message="Suggestions applied to listing draft"
            className="w-full h-[38px] mt-3 bg-[var(--color-teal)] text-[var(--color-navy)] rounded-[10px] text-xs font-bold flex items-center justify-center"
          >
            Apply to listing draft
          </DemoActionButton>
        </div>
      </div>
    </div>
  );
}
