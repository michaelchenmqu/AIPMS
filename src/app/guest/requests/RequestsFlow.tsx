"use client";

import { useMemo, useState } from "react";
import { differenceInCalendarDays } from "date-fns";

type RequestKind = "extend" | "reduce" | "time" | "quantity" | "note";

type RequestTypeDef = {
  type: string;
  icon: string;
  label: string;
  blurb: string;
  kind: RequestKind;
};

const REQUEST_TYPES: RequestTypeDef[] = [
  { type: "EXTEND_STAY", icon: "🌙", label: "Extend your stay", blurb: "Add a night or two at the end.", kind: "extend" },
  { type: "REDUCE_STAY", icon: "🚪", label: "Leave a little early", blurb: "Check out earlier than planned.", kind: "reduce" },
  { type: "EARLY_CHECKIN", icon: "⏰", label: "Early check-in", blurb: "Arrive before the usual time.", kind: "time" },
  { type: "LATE_CHECKOUT", icon: "🕐", label: "Late check-out", blurb: "A little longer before you go.", kind: "time" },
  { type: "EXTRA_CLEANING", icon: "🧹", label: "Mid-stay clean", blurb: "A refresh clean partway through.", kind: "note" },
  { type: "EXTRA_BED", icon: "🛏️", label: "Extra bed or crib", blurb: "Extra sleeping setup for your group.", kind: "quantity" },
  { type: "AIRPORT_TRANSFER", icon: "🚗", label: "Airport transfer", blurb: "Help getting to or from the airport.", kind: "note" },
  { type: "SPECIAL_OCCASION", icon: "🎉", label: "Celebrating something?", blurb: "Birthday, anniversary — let us know.", kind: "note" },
  { type: "OTHER", icon: "💬", label: "Something else", blurb: "Anything else you need.", kind: "note" },
];

type GuestRequestRow = {
  id: string;
  type: string;
  requestedCheckOut: string | null;
  requestedTime: string | null;
  quantity: number | null;
  note: string | null;
  estimatedPrice: number | null;
  status: string;
  createdAt: string;
};

const STATUS_BADGE: Record<string, string> = {
  PENDING: "text-[var(--color-info)] bg-[color-mix(in_srgb,var(--color-info)_14%,white)]",
  APPROVED: "text-[var(--color-success)] bg-[var(--color-success-bg)]",
  DECLINED: "text-[var(--color-error)] bg-[var(--color-error-bg)]",
};

function formatMoney(amount: number): string {
  return amount.toLocaleString("en-AU", { style: "currency", currency: "AUD", maximumFractionDigits: 0 });
}

export default function RequestsFlow({
  checkInISO,
  checkOutISO,
  basePrice,
  initialRequests,
}: {
  checkInISO: string;
  checkOutISO: string;
  basePrice: number;
  initialRequests: GuestRequestRow[];
}) {
  const [requests, setRequests] = useState(initialRequests);
  const [activeType, setActiveType] = useState<string | null>(null);
  const [dateValue, setDateValue] = useState("");
  const [timeValue, setTimeValue] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const activeDef = REQUEST_TYPES.find((t) => t.type === activeType) ?? null;

  const estimate = useMemo(() => {
    if (activeDef?.kind !== "extend" || !dateValue) return null;
    const nights = differenceInCalendarDays(new Date(dateValue), new Date(checkOutISO));
    if (nights <= 0) return null;
    return { nights, total: nights * basePrice };
  }, [activeDef, dateValue, checkOutISO, basePrice]);

  function selectType(type: string) {
    if (activeType === type) {
      setActiveType(null);
      return;
    }
    setActiveType(type);
    setDateValue("");
    setTimeValue("");
    setQuantity(1);
    setNote("");
    setError(null);
  }

  async function submit() {
    if (!activeDef) return;
    setError(null);

    const body: Record<string, unknown> = { type: activeDef.type, note: note.trim() || null };
    if (activeDef.kind === "extend" || activeDef.kind === "reduce") {
      if (!dateValue) {
        setError("Pick a date first.");
        return;
      }
      body.requestedCheckOut = new Date(dateValue).toISOString();
    }
    if (activeDef.kind === "time") {
      if (!timeValue) {
        setError("Pick a time first.");
        return;
      }
      body.requestedTime = timeValue;
    }
    if (activeDef.kind === "quantity") {
      body.quantity = quantity;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/guest/requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Something went wrong — try again.");
        return;
      }
      setRequests((prev) => [
        {
          id: data.request.id,
          type: data.request.type,
          requestedCheckOut: data.request.requestedCheckOut,
          requestedTime: data.request.requestedTime,
          quantity: data.request.quantity,
          note: data.request.note,
          estimatedPrice: data.request.estimatedPrice,
          status: data.request.status,
          createdAt: data.request.createdAt,
        },
        ...prev,
      ]);
      setActiveType(null);
    } catch {
      setError("Something went wrong — try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="px-5 pt-5 pb-6">
      <div className="font-[family-name:var(--font-serif)] text-xl font-bold text-[var(--color-navy)]">
        Need something?
      </div>
      <div className="text-xs text-[var(--color-muted)] mt-1 mb-4">
        Pick what you need — we&apos;ll confirm as soon as we can.
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {REQUEST_TYPES.map((t) => (
          <button
            key={t.type}
            type="button"
            onClick={() => selectType(t.type)}
            className={`tap text-left bg-white rounded-2xl p-3.5 ${
              activeType === t.type ? "ring-2 ring-[var(--color-teal)]" : ""
            }`}
          >
            <div className="text-lg">{t.icon}</div>
            <div className="text-sm font-bold text-[var(--color-navy)] mt-1">{t.label}</div>
            <div className="text-[10.5px] text-[var(--color-muted)] mt-0.5">{t.blurb}</div>
          </button>
        ))}
      </div>

      {activeDef && (
        <div className="bg-white rounded-2xl p-4 mt-3">
          <div className="text-sm font-bold text-[var(--color-navy)] mb-3">{activeDef.label}</div>

          {(activeDef.kind === "extend" || activeDef.kind === "reduce") && (
            <div className="mb-3">
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
                {activeDef.kind === "extend" ? "New checkout date" : "New (earlier) checkout date"}
              </label>
              <input
                type="date"
                value={dateValue}
                min={activeDef.kind === "extend" ? checkOutISO : checkInISO}
                max={activeDef.kind === "reduce" ? checkOutISO : undefined}
                onChange={(e) => setDateValue(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
              />
              {activeDef.kind === "extend" && (
                <div className="text-xs text-[var(--color-muted)] mt-2">
                  {estimate
                    ? `+${estimate.nights} night${estimate.nights === 1 ? "" : "s"} · ${formatMoney(estimate.total)} at ${formatMoney(basePrice)}/night — confirmed by our team.`
                    : `From ${formatMoney(basePrice)}/night.`}
                </div>
              )}
              {activeDef.kind === "reduce" && (
                <div className="text-xs text-[var(--color-muted)] mt-2">
                  Our team will confirm any change to your total.
                </div>
              )}
            </div>
          )}

          {activeDef.kind === "time" && (
            <div className="mb-3">
              <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">Preferred time</label>
              <input
                type="time"
                value={timeValue}
                onChange={(e) => setTimeValue(e.target.value)}
                className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)]"
              />
              <div className="text-xs text-[var(--color-muted)] mt-2">Subject to availability — we&apos;ll confirm closer to the day.</div>
            </div>
          )}

          {activeDef.kind === "quantity" && (
            <div className="mb-3 flex items-center justify-between">
              <label className="text-xs font-semibold text-[var(--color-muted)]">How many?</label>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                  className="tap w-7 h-7 rounded-full bg-[var(--color-sand-200)] text-[var(--color-navy)] font-bold"
                >
                  −
                </button>
                <span className="font-mono text-sm font-semibold text-[var(--color-navy)] w-4 text-center">{quantity}</span>
                <button
                  type="button"
                  onClick={() => setQuantity((q) => Math.min(10, q + 1))}
                  className="tap w-7 h-7 rounded-full bg-[var(--color-sand-200)] text-[var(--color-navy)] font-bold"
                >
                  +
                </button>
              </div>
            </div>
          )}

          <label className="block text-xs font-semibold text-[var(--color-muted)] mb-1">
            {activeDef.kind === "note" ? "Tell us more" : "Anything else? (optional)"}
          </label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full rounded-lg border border-[var(--color-sand-400)] px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--color-teal)] resize-none"
          />

          {error && <div className="text-xs text-[var(--color-error)] bg-[var(--color-error-bg)] rounded-lg px-3 py-2.5 mt-3">{error}</div>}

          <button
            type="button"
            onClick={submit}
            disabled={submitting}
            className="tap w-full mt-3 rounded-[10px] bg-[var(--color-teal)] text-[var(--color-navy)] px-5 py-3 text-sm font-semibold disabled:opacity-50"
          >
            {submitting ? "Sending…" : "Send request"}
          </button>
        </div>
      )}

      {requests.length > 0 && (
        <div className="mt-6">
          <div className="text-[11px] font-bold text-[var(--color-muted-2)] uppercase tracking-wide mb-2">
            Your requests
          </div>
          <div className="flex flex-col gap-2">
            {requests.map((r) => {
              const def = REQUEST_TYPES.find((t) => t.type === r.type);
              const detail =
                r.requestedCheckOut != null
                  ? `New checkout: ${r.requestedCheckOut}`
                  : r.requestedTime
                  ? `Time: ${r.requestedTime}`
                  : r.quantity
                  ? `Qty: ${r.quantity}`
                  : r.note ?? "";
              return (
                <div key={r.id} className="bg-white rounded-2xl p-3.5 flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-bold text-[var(--color-navy)]">{def?.label ?? r.type}</div>
                    {detail && <div className="text-[11px] text-[var(--color-muted)] mt-0.5 truncate">{detail}</div>}
                    {r.estimatedPrice != null && (
                      <div className="text-[11px] font-mono text-[var(--color-muted)] mt-0.5">{formatMoney(r.estimatedPrice)}</div>
                    )}
                  </div>
                  <span className={`shrink-0 text-[10px] font-bold px-2.5 py-1 rounded-full ${STATUS_BADGE[r.status] ?? ""}`}>
                    {r.status}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
