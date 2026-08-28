import { prisma } from "@/lib/prisma";
import { PageHeader, Card, Badge } from "@/components/ui";
import { timeAgo } from "@/lib/format";
import { resolveMessage, createWorkOrderFromMessage, replyToWhatsApp } from "./actions";

const KIND_TONE: Record<string, "info" | "error" | "warning" | "neutral"> = {
  BOOKING: "info",
  MAINTENANCE: "warning",
  COMPLAINT: "error",
  GENERAL: "neutral",
};

const CHANNEL_LABEL: Record<string, string> = {
  AIRBNB: "Airbnb",
  BOOKING_COM: "Booking.com",
  STAYZ: "Stayz",
  DIRECT: "Direct",
  WHATSAPP: "WhatsApp",
};

export default async function InboxPage() {
  const messages = await prisma.inboxMessage.findMany({
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { property: true },
  });

  return (
    <div>
      <PageHeader
        title="Inbox & enquiries"
        subtitle="Guest, owner, and channel messages — AI-classified with a suggested action"
      />

      <div className="flex flex-col gap-3">
        {messages.map((m) => (
          <Card key={m.id} className={`p-5 ${m.status === "RESOLVED" ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-semibold text-[var(--color-navy)]">{m.fromName}</span>
                  <span className="text-xs text-[var(--color-muted)]">{m.fromEmail ?? m.fromPhone}</span>
                  <Badge tone="neutral">{CHANNEL_LABEL[m.channel]}</Badge>
                  {m.property && <Badge tone="teal">{m.property.name}</Badge>}
                  {m.status === "RESOLVED" && <Badge tone="success">Resolved</Badge>}
                </div>
                <div className="text-sm font-semibold text-[var(--color-text)] mt-1.5">{m.subject}</div>
                <p className="text-sm text-[var(--color-muted)] mt-1 line-clamp-2">{m.body}</p>
                <div className="text-[11px] text-[var(--color-muted-2)] mt-2">{timeAgo(m.createdAt)}</div>

                {m.channel === "WHATSAPP" && m.fromPhone && m.status !== "RESOLVED" && (
                  <form action={replyToWhatsApp.bind(null, m.id)} className="flex gap-2 mt-3">
                    <input
                      name="body"
                      required
                      placeholder="Reply via WhatsApp…"
                      className="flex-1 min-w-0 border border-[var(--color-sand-400)] rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
                    />
                    <button className="tap shrink-0 text-xs font-semibold text-white rounded-lg px-3 py-1.5" style={{ background: "#25D366" }}>
                      Send
                    </button>
                  </form>
                )}
              </div>

              <div className="shrink-0 text-right w-56">
                {m.aiKind && (
                  <div className="flex items-center justify-end gap-2 mb-2">
                    <Badge tone={KIND_TONE[m.aiKind]}>{m.aiKind}</Badge>
                    <span className="text-xs text-[var(--color-muted)]">{m.aiConfidence}% confident</span>
                  </div>
                )}
                {m.status !== "RESOLVED" && (
                  <div className="flex flex-col gap-1.5 items-end">
                    {m.aiKind === "MAINTENANCE" && m.propertyId ? (
                      <form action={createWorkOrderFromMessage.bind(null, m.id)}>
                        <button className="tap text-xs font-semibold bg-[var(--color-navy)] text-white rounded-lg px-3 py-1.5">
                          {m.aiPrimaryAction ?? "Create work order"}
                        </button>
                      </form>
                    ) : (
                      <form action={resolveMessage.bind(null, m.id)}>
                        <button className="tap text-xs font-semibold bg-[var(--color-navy)] text-white rounded-lg px-3 py-1.5">
                          {m.aiPrimaryAction ?? "Mark resolved"}
                        </button>
                      </form>
                    )}
                    {m.aiSecondaryAction && (
                      <span className="text-xs text-[var(--color-muted)]">or {m.aiSecondaryAction.toLowerCase()}</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </Card>
        ))}
        {messages.length === 0 && <div className="text-center py-16 text-[var(--color-muted)]">Inbox is empty.</div>}
      </div>
    </div>
  );
}
