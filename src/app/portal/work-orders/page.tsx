import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { setWorkOrderStatus } from "./actions";
import type { WorkOrderStatus } from "@prisma/client";

const COLUMNS: { key: WorkOrderStatus; label: string; next?: WorkOrderStatus }[] = [
  { key: "OPEN", label: "Open", next: "IN_PROGRESS" },
  { key: "IN_PROGRESS", label: "In progress", next: "DONE" },
  { key: "DONE", label: "Done" },
];

const PRIORITY_TONE: Record<string, "error" | "warning" | "neutral"> = {
  HIGH: "error",
  MEDIUM: "warning",
  LOW: "neutral",
};

export default async function WorkOrdersPage() {
  const orders = await prisma.workOrder.findMany({
    include: { property: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Work orders" subtitle="Maintenance tickets synced from AI-classified inbox items and job flags" />

      <div className="grid md:grid-cols-3 gap-5">
        {COLUMNS.map((col) => {
          const items = orders.filter((o) => o.status === col.key);
          return (
            <div key={col.key}>
              <div className="text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-2)] mb-3">
                {col.label} · {items.length}
              </div>
              <div className="flex flex-col gap-3">
                {items.map((o) => (
                  <Card key={o.id} className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-sm font-semibold text-[var(--color-navy)]">{o.title}</div>
                      <Badge tone={PRIORITY_TONE[o.priority]}>{o.priority}</Badge>
                    </div>
                    <div className="text-xs text-[var(--color-muted)] mt-1">{o.property.name}</div>
                    <p className="text-xs text-[var(--color-muted)] mt-2 line-clamp-3">{o.description}</p>
                    <div className="flex items-center justify-between mt-3">
                      <span className="text-[11px] text-[var(--color-muted-2)]">{timeAgo(o.createdAt)}</span>
                      {col.next && (
                        <form action={setWorkOrderStatus.bind(null, o.id, col.next)}>
                          <button className="tap text-xs font-semibold text-[var(--color-teal-dark)]">
                            Move to {col.next === "IN_PROGRESS" ? "in progress" : "done"} →
                          </button>
                        </form>
                      )}
                    </div>
                  </Card>
                ))}
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
