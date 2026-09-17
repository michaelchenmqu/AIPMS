import { requireTenantScope } from "@/lib/tenant";
import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { formatDateTime } from "@/lib/format";
import { submitMaintenanceRequest } from "../actions";

const STATUS_TONE: Record<string, "success" | "info" | "neutral"> = {
  DONE: "success",
  IN_PROGRESS: "info",
  OPEN: "neutral",
};

export default async function TenantMaintenancePage() {
  const { lease } = await requireTenantScope();
  if (!lease) {
    return (
      <div>
        <PageHeader title="Maintenance" subtitle="No active lease on file" />
      </div>
    );
  }

  const requests = await prisma.workOrder.findMany({
    where: { leaseId: lease.id },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <PageHeader title="Maintenance" subtitle={lease.property.name} />

      <Card className="p-6 mb-6">
        <div className="text-sm font-semibold text-[var(--color-navy)] mb-1">Submit a request</div>
        <p className="text-xs text-[var(--color-muted)] mb-4">
          Tell us what&apos;s wrong — if it can&apos;t wait (no hot water, a leak, anything unsafe), flag it as urgent.
        </p>
        <form action={submitMaintenanceRequest} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">What&apos;s the issue?</label>
            <input name="title" required placeholder="e.g. Kitchen tap leaking" className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Details</label>
            <textarea
              name="description"
              required
              rows={3}
              placeholder="Where it is, when it started, anything else useful"
              className="w-full text-sm border border-[var(--color-sand-400)] rounded-lg px-3 py-2"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--color-text)]">
            <input type="checkbox" name="urgent" />
            This can&apos;t wait
          </label>
          <div>
            <button className="tap text-sm font-semibold bg-[var(--color-navy)] text-white rounded-lg px-4 py-2">
              Submit request
            </button>
          </div>
        </form>
      </Card>

      <div className="flex flex-col gap-3">
        {requests.map((r) => (
          <Card key={r.id} className="p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="text-sm font-semibold text-[var(--color-navy)]">{r.title}</div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {r.urgent && <Badge tone="error">Urgent</Badge>}
                <Badge tone={STATUS_TONE[r.status]}>{r.status.replace("_", " ")}</Badge>
              </div>
            </div>
            <p className="text-xs text-[var(--color-muted)] mt-2">{r.description}</p>
            <div className="text-[11px] text-[var(--color-muted-2)] mt-3">{formatDateTime(r.createdAt)}</div>
          </Card>
        ))}
        {requests.length === 0 && <div className="text-sm text-[var(--color-muted)] text-center py-10">No requests yet.</div>}
      </div>
    </div>
  );
}
