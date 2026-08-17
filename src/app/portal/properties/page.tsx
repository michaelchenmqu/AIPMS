import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatMoney } from "@/lib/format";

export default async function PropertiesPage() {
  const properties = await prisma.property.findMany({
    include: { owner: true, reservations: true },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Property performance" subtitle="Revenue, occupancy, and rating drill-down per property" />

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties.map((p) => {
          const revenue = p.reservations.reduce((s, r) => s + r.totalAmount, 0);
          const rating = ((p.airbnbScore + p.bookingScore + p.stayzScore) / 3 / 20).toFixed(1);
          return (
            <Link key={p.id} href={`/portal/properties/${p.id}`}>
              <Card hover className="p-5">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="font-[family-name:var(--font-serif)] text-base font-bold text-[var(--color-navy)]">
                      {p.name}
                    </div>
                    <div className="text-xs text-[var(--color-muted)] mt-0.5">{p.address}</div>
                  </div>
                  <Badge tone="success">{rating}★</Badge>
                </div>
                <div className="flex items-center justify-between mt-4 pt-4 border-t border-[var(--color-sand-200)]">
                  <div>
                    <div className="text-[10px] uppercase text-[var(--color-muted-2)] font-semibold">Revenue</div>
                    <div className="text-sm font-mono font-semibold text-[var(--color-navy)]">{formatMoney(revenue)}</div>
                  </div>
                  <div>
                    <div className="text-[10px] uppercase text-[var(--color-muted-2)] font-semibold">Owner</div>
                    <div className="text-sm text-[var(--color-navy)]">{p.owner.name}</div>
                  </div>
                </div>
              </Card>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
