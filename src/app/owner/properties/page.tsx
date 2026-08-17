import Link from "next/link";
import { requireOwnerScope } from "@/lib/owner";
import { PageHeader, Card, Badge } from "@/components/ui";

export default async function OwnerPropertiesPage() {
  const { owner } = await requireOwnerScope();

  return (
    <div>
      <PageHeader title="Properties" subtitle="Listing & photos — synced to Airbnb, Booking.com, Stayz" />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {owner.properties.map((p) => (
          <Link key={p.id} href={`/owner/properties/${p.id}`}>
            <Card hover className="overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element -- local SVG placeholder illustration */}
              <img src={p.heroImage} alt={p.name} className="w-full h-32 object-cover" />
              <div className="p-4">
                <div className="flex items-center justify-between">
                  <div className="font-[family-name:var(--font-serif)] font-bold text-[var(--color-navy)]">{p.name}</div>
                  <Badge tone="success">{((p.airbnbScore + p.bookingScore + p.stayzScore) / 3 / 20).toFixed(1)}★</Badge>
                </div>
                <div className="text-xs text-[var(--color-muted)] mt-1">{p.address}</div>
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}
