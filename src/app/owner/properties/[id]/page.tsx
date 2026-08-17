import { notFound } from "next/navigation";
import Link from "next/link";
import { requireOwnerScope } from "@/lib/owner";
import { generateListingSuggestions } from "@/lib/ai";
import { PageHeader, Card } from "@/components/ui";

export default async function OwnerPropertyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { owner } = await requireOwnerScope();
  const property = owner.properties.find((p) => p.id === id);
  if (!property) notFound();

  const suggestions = await generateListingSuggestions({
    propertyId: property.id,
    name: property.name,
    basePrice: property.basePrice,
    airbnbScore: property.airbnbScore,
    bookingScore: property.bookingScore,
    stayzScore: property.stayzScore,
  });

  const images: string[] = JSON.parse(property.images || "[]");
  const gallery = images.length
    ? images
    : ["/images/room-living.svg", "/images/room-bedroom.svg", "/images/room-kitchen.svg", "/images/room-bathroom.svg"];

  return (
    <div>
      <Link href="/owner/properties" className="text-xs text-[var(--color-muted)] hover:text-[var(--color-navy)]">
        ← Properties
      </Link>
      <PageHeader title={property.name} subtitle="Listing & photos · synced to Airbnb, Booking.com, Stayz" />

      <div className="grid grid-cols-3 gap-2 mb-6">
        {gallery.map((src, i) => (
          // eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration
          <img key={i} src={src} alt="" className="w-full h-32 object-cover rounded-lg" />
        ))}
        <div className="w-full h-32 rounded-lg border-2 border-dashed border-[var(--color-sand-400)] flex items-center justify-center text-2xl text-[var(--color-muted-2)]">
          +
        </div>
      </div>

      <Card className="p-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-3">✦ AI suggestions</div>
        <div className="flex flex-col gap-2.5">
          {suggestions.map((s, i) => (
            <div key={i} className="text-sm text-[var(--color-text)] leading-relaxed">
              • {s}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
