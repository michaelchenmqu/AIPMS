import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDate } from "@/lib/format";

export default async function OwnersPage() {
  const owners = await prisma.owner.findMany({
    include: { properties: true, ledger: { orderBy: { date: "desc" }, take: 1 } },
    orderBy: { name: "asc" },
  });

  return (
    <div>
      <PageHeader title="Owners" subtitle="Owner accounts, payout status, and their portal view" />

      <Card className="p-0 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--color-muted-2)] bg-[var(--color-sand-100)]">
              <th className="px-5 py-3 font-semibold">Owner</th>
              <th className="px-5 py-3 font-semibold">Region</th>
              <th className="px-5 py-3 font-semibold">Properties</th>
              <th className="px-5 py-3 font-semibold">Last ledger activity</th>
              <th className="px-5 py-3 font-semibold" />
            </tr>
          </thead>
          <tbody>
            {owners.map((o) => (
              <tr key={o.id} className="border-t border-[var(--color-sand-200)]">
                <td className="px-5 py-3">
                  <div className="font-medium text-[var(--color-navy)]">{o.name}</div>
                  <div className="text-xs text-[var(--color-muted)]">{o.email}</div>
                </td>
                <td className="px-5 py-3 text-[var(--color-muted)]">{o.region}</td>
                <td className="px-5 py-3">{o.properties.length}</td>
                <td className="px-5 py-3">
                  {o.ledger[0] ? (
                    <span>
                      <Badge tone={o.ledger[0].amount >= 0 ? "success" : "neutral"}>
                        {o.ledger[0].type.replace("_", " ")}
                      </Badge>{" "}
                      <span className="text-xs text-[var(--color-muted)]">{formatDate(o.ledger[0].date)}</span>
                    </span>
                  ) : (
                    <span className="text-xs text-[var(--color-muted)]">—</span>
                  )}
                </td>
                <td className="px-5 py-3 text-right">
                  <Link href={`/portal/owners/${o.id}`} className="text-[var(--color-teal-dark)] font-semibold hover:underline">
                    View portal →
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  );
}
